// Callbook x402 pay-per-inspect server (GOAT Testnet3).
//   GET /.well-known/x402        free: routes, price, token, payTo
//   GET /inspect/:agentId         paid: verified scored record of one agent
// No X-Payment header -> HTTP 402 with a GOAT Flow ERC20_DIRECT challenge.
// X-Payment: base64({orderId, txHash}) -> on-chain check -> 200 + record + signed Payment-Receipt.
// Env: X402_MERCHANT_KEY (payTo and receipt signer), X402_TOKEN, X402_PRICE (token units, default 0.01),
//      CALLBOOK_RPC_URL, CALLBOOK_CHAIN_ID (48816), X402_PORT (43128), X402_STATE (orders json file).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http, parseAbi, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { explorerTx } from "@callbook/core";
import { decodePaymentHeader, erc20Abi, makeChallenge, receiptMessage, verifyTransfer, type Order } from "./protocol.ts";

const chainId = Number(process.env.CALLBOOK_CHAIN_ID ?? 48816);
const rpc = process.env.CALLBOOK_RPC_URL ?? "https://rpc.testnet3.goat.network";
const dep = JSON.parse(readFileSync(new URL(`../../../deployments/${chainId}.json`, import.meta.url), "utf8"));
const merchant = privateKeyToAccount(process.env.X402_MERCHANT_KEY as Hex);
const token = process.env.X402_TOKEN as Address;
const port = Number(process.env.X402_PORT ?? 43128);
const statePath = process.env.X402_STATE ?? "/tmp/callbook-x402-orders.json";
const ttl = Number(process.env.X402_TTL ?? 600);
const pub = createPublicClient({ transport: http(rpc) });

const anchorAbi = parseAbi([
  "function stats(uint256 agentId) view returns (uint32 samples, uint32 wins, int256 cumulativePnlBps)",
  "event Scored(uint256 indexed signalId, uint256 indexed agentId, int256 pnlBps, bool hit, string tag2)",
]);

type State = { orders: Record<string, Order>; used: string[] };
const state: State = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { orders: {}, used: [] };
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 1));

const decimals = Number(await pub.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }));
const symbol = String(await pub.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }));
const amountWei = parseUnits(process.env.X402_PRICE ?? "0.01", decimals).toString();

async function record(agentId: bigint) {
  const [samples, wins, pnl] = (await pub.readContract({ address: dep.scoreAnchor, abi: anchorAbi, functionName: "stats", args: [agentId] })) as [number, number, bigint];
  const head = await pub.getBlockNumber();
  const calls: unknown[] = [];
  const chunk = 2000n;
  for (let from = BigInt(dep.startBlock); from <= head; from += chunk) {
    const to = from + chunk - 1n > head ? head : from + chunk - 1n;
    const logs = await pub.getLogs({ address: dep.scoreAnchor, event: anchorAbi[1], args: { agentId }, fromBlock: from, toBlock: to });
    for (const l of logs) calls.push({ signalId: Number(l.args.signalId), pnlBps: Number(l.args.pnlBps), hit: l.args.hit, scoreTx: explorerTx(chainId, l.transactionHash!) });
  }
  return {
    chainId, agentId: Number(agentId), scoreAnchor: dep.scoreAnchor, identity: dep.identity, reputation: dep.reputation,
    samples: Number(samples), wins: Number(wins), winRateBps: samples ? Math.round((Number(wins) * 10000) / Number(samples)) : 0,
    cumulativePnlBps: Number(pnl), gate: { minSamples: dep.minSamples, minWinBps: dep.minWinBps }, calls,
  };
}

function send(res: ServerResponse, code: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(code, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/.well-known/x402") {
    return send(res, 200, { name: "Callbook pay-per-inspect", chainId, network: `eip155:${chainId}`, flow: "ERC20_DIRECT",
      routes: [{ method: "GET", path: "/inspect/:agentId", price: amountWei, tokenSymbol: symbol, tokenContract: token, tokenDecimals: decimals }], payTo: merchant.address });
  }
  const m = url.pathname.match(/^\/inspect\/(\d+)$/);
  if (!m) return send(res, 404, { error: "not_found" });
  const resource = url.pathname;
  const pay = decodePaymentHeader(req.headers["x-payment"] as string | undefined);
  if (!pay) {
    const now = Math.floor(Date.now() / 1000);
    const payer = (url.searchParams.get("payer") ?? undefined) as Address | undefined;
    const order: Order = { orderId: randomUUID(), resource, payer, createdAt: now,
      option: { scheme: "ERC20_DIRECT", network: `eip155:${chainId}`, chainId, tokenSymbol: symbol, tokenContract: token, tokenDecimals: decimals, amountWei, payTo: merchant.address, expiresAt: now + ttl } };
    state.orders[order.orderId] = order; save();
    return send(res, 402, makeChallenge(order, `Verified Callbook record for agent #${m[1]} on chain ${chainId}`));
  }
  const order = state.orders[pay.orderId];
  if (!order || order.resource !== resource) return send(res, 402, { error: "unknown_order" });
  const receipt = await pub.getTransactionReceipt({ hash: pay.txHash }).catch(() => null);
  if (!receipt) return send(res, 402, { error: "tx_not_found" });
  const v = verifyTransfer({ order, receipt: receipt as never, txHash: pay.txHash, usedTx: new Set(state.used), now: Math.floor(Date.now() / 1000) });
  if (!v.ok) return send(res, 402, { error: "payment_invalid", reason: v.reason });
  if (!order.paidTx) { order.paidTx = pay.txHash; state.used.push(pay.txHash.toLowerCase()); save(); }
  const msg = receiptMessage({ orderId: order.orderId, txHash: pay.txHash, resource, payer: v.from });
  const sig = await merchant.signMessage({ message: msg });
  const rec = { orderId: order.orderId, txHash: pay.txHash, resource, payer: v.from, signer: merchant.address, signature: sig };
  return send(res, 200, { paid: { ...rec, explorer: explorerTx(chainId, pay.txHash) }, record: await record(BigInt(m[1])) },
    { "payment-receipt": Buffer.from(JSON.stringify(rec)).toString("base64") });
}

createServer((req, res) => handle(req, res).catch((e) => send(res, 500, { error: String(e?.message ?? e) }))).listen(port, () =>
  console.log(`Callbook x402 on :${port}. payTo ${merchant.address}, price ${amountWei} ${symbol} units, token ${token}`));
