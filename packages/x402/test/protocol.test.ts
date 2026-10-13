import test from "node:test";
import assert from "node:assert/strict";
import { encodeAbiParameters, encodeEventTopics, type Address, type Hex } from "viem";
import { decodePaymentHeader, encodePaymentHeader, erc20Abi, makeChallenge, verifyTransfer, type Order } from "../src/protocol.ts";

const token = "0x1111111111111111111111111111111111111111" as Address;
const payTo = "0x2222222222222222222222222222222222222222" as Address;
const payer = "0x3333333333333333333333333333333333333333" as Address;
const tx = ("0x" + "ab".repeat(32)) as Hex;

function order(extra: Partial<Order> = {}): Order {
  return {
    orderId: "o1",
    resource: "/inspect/67",
    option: { scheme: "ERC20_DIRECT", network: "eip155:48816", chainId: 48816, tokenSymbol: "tUSD", tokenContract: token, tokenDecimals: 6, amountWei: "10000", payTo, expiresAt: 2000 },
    createdAt: 1000,
    ...extra,
  };
}
function transferLog(from: Address, to: Address, value: bigint, address = token) {
  const topics = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from, to } }) as Hex[];
  return { address, topics, data: encodeAbiParameters([{ type: "uint256" }], [value]) };
}
const ok = (logs: ReturnType<typeof transferLog>[]) => ({ status: "success" as const, logs });

test("challenge has GOAT Flow DIRECT shape", () => {
  const c = makeChallenge(order(), "d");
  assert.equal(c.flow, "ERC20_DIRECT");
  assert.equal(c.accepts[0].payTo, payTo);
  assert.equal(c.accepts[0].network, "eip155:48816");
});

test("payment header round trip and rejection", () => {
  assert.deepEqual(decodePaymentHeader(encodePaymentHeader({ orderId: "o1", txHash: tx })), { orderId: "o1", txHash: tx });
  assert.equal(decodePaymentHeader("junk"), null);
  assert.equal(decodePaymentHeader(undefined), null);
});

test("accepts an exact transfer to payTo", () => {
  const r = verifyTransfer({ order: order(), receipt: ok([transferLog(payer, payTo, 10000n)]), txHash: tx, usedTx: new Set(), now: 1500 });
  assert.equal(r.ok, true);
});

test("rejects underpayment, wrong recipient, wrong token, revert", () => {
  const base = { order: order(), txHash: tx, usedTx: new Set<string>(), now: 1500 };
  assert.equal(verifyTransfer({ ...base, receipt: ok([transferLog(payer, payTo, 9999n)]) }).ok, false);
  assert.equal(verifyTransfer({ ...base, receipt: ok([transferLog(payer, payer, 10000n)]) }).ok, false);
  assert.equal(verifyTransfer({ ...base, receipt: ok([transferLog(payer, payTo, 10000n, payer)]) }).ok, false);
  assert.equal(verifyTransfer({ ...base, receipt: { status: "reverted", logs: [transferLog(payer, payTo, 10000n)] } }).ok, false);
});

test("rejects expired order and replayed tx; enforces payer when set", () => {
  const rec = ok([transferLog(payer, payTo, 10000n)]);
  assert.equal(verifyTransfer({ order: order(), receipt: rec, txHash: tx, usedTx: new Set(), now: 2001 }).ok, false);
  assert.equal(verifyTransfer({ order: order(), receipt: rec, txHash: tx, usedTx: new Set([tx.toLowerCase()]), now: 1500 }).ok, false);
  assert.equal(verifyTransfer({ order: order({ payer: payTo }), receipt: rec, txHash: tx, usedTx: new Set(), now: 1500 }).ok, false);
});

test("a paid order can be re-fetched with its own tx after expiry", () => {
  const r = verifyTransfer({ order: order({ paidTx: tx }), receipt: ok([transferLog(payer, payTo, 10000n)]), txHash: tx, usedTx: new Set([tx.toLowerCase()]), now: 9999 });
  assert.equal(r.ok, true);
});
