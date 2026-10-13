// A buyer agent that pays for a Callbook record over x402.
// Usage: X402_BUYER_KEY=0x.. tsx packages/x402/src/buyer.ts http://127.0.0.1:43128/inspect/67 [maxUnits]
import { createPublicClient, createWalletClient, defineChain, formatUnits, hashMessage, http, recoverAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { encodePaymentHeader, erc20Abi, receiptMessage, type Challenge } from "./protocol.ts";

const target = process.argv[2];
const maxWei = BigInt(process.argv[3] ?? "100000");
const rpc = process.env.CALLBOOK_RPC_URL ?? "https://rpc.testnet3.goat.network";
const account = privateKeyToAccount(process.env.X402_BUYER_KEY as Hex);

const first = await fetch(`${target}?payer=${account.address}`);
if (first.status !== 402) throw new Error(`expected 402, got ${first.status}`);
const ch = (await first.json()) as Challenge;
const opt = ch.accepts.find((a) => a.scheme === "ERC20_DIRECT");
if (!opt) throw new Error("no ERC20_DIRECT option");
console.log(`402 Payment Required: ${formatUnits(BigInt(opt.amountWei), opt.tokenDecimals)} ${opt.tokenSymbol} to ${opt.payTo} on ${opt.network} (order ${ch.orderId})`);
if (BigInt(opt.amountWei) > maxWei) throw new Error("price above buyer cap");
if (Date.now() / 1000 >= opt.expiresAt) throw new Error("challenge expired");

const chain = defineChain({ id: opt.chainId, name: `chain ${opt.chainId}`, nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 }, rpcUrls: { default: { http: [rpc] } } });
const pub = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ chain, account, transport: http(rpc) });
const fee = { maxPriorityFeePerGas: 130000n, maxFeePerGas: 140000n };

const bal = (await pub.readContract({ address: opt.tokenContract, abi: erc20Abi, functionName: "balanceOf", args: [account.address] })) as bigint;
if (bal < BigInt(opt.amountWei) && opt.tokenSymbol === "tUSD") {
  const h = await wallet.writeContract({ address: opt.tokenContract, abi: erc20Abi, functionName: "mint", args: [account.address, 1_000_000n], ...fee });
  await pub.waitForTransactionReceipt({ hash: h });
  console.log(`minted 1 test tUSD (no value): ${h}`);
}
const txHash = await wallet.writeContract({ address: opt.tokenContract, abi: erc20Abi, functionName: "transfer", args: [opt.payTo, BigInt(opt.amountWei)], ...fee });
await pub.waitForTransactionReceipt({ hash: txHash });
console.log(`paid: ${txHash}`);

const second = await fetch(target, { headers: { "x-payment": encodePaymentHeader({ orderId: ch.orderId, txHash }) } });
const body = await second.json();
if (second.status !== 200) throw new Error(`payment rejected: ${JSON.stringify(body)}`);
const rec = JSON.parse(Buffer.from(second.headers.get("payment-receipt")!, "base64").toString());
const signer = await recoverAddress({ hash: hashMessage(receiptMessage(rec)), signature: rec.signature });
if (signer.toLowerCase() !== opt.payTo.toLowerCase()) throw new Error("receipt not signed by payTo");
const r = body.record;
console.log(`200 OK. Receipt signed by ${signer}.`);
console.log(`Agent #${r.agentId}: ${r.samples} scored calls, ${r.wins} wins (${r.winRateBps / 100}%), cumulative ${r.cumulativePnlBps} bps.`);
console.log(JSON.stringify({ orderId: ch.orderId, paymentTx: txHash, explorer: body.paid.explorer, agentId: r.agentId, samples: r.samples, wins: r.wins, cumulativePnlBps: r.cumulativePnlBps, firstCall: r.calls[0] }));
