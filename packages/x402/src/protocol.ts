// x402 pay-per-inspect for Callbook, following the GOAT Flow ERC20_DIRECT pattern:
// the server answers HTTP 402 with accepts[] (network, token, amount, payTo), the buyer sends a
// plain ERC-20 transfer to payTo, and the server checks that transfer on-chain before serving data.
// Until a GOAT Flow merchant account is approved, the server verifies the receipt itself
// instead of calling goatflow-sdk-server.
import { decodeEventLog, parseAbi, type Address, type Hex } from "viem";

export const erc20Abi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export type PaymentOption = {
  scheme: "ERC20_DIRECT";
  network: string; // CAIP-2, e.g. eip155:48816
  chainId: number;
  tokenSymbol: string;
  tokenContract: Address;
  tokenDecimals: number;
  amountWei: string;
  payTo: Address;
  expiresAt: number;
};

export type Order = {
  orderId: string;
  resource: string;
  payer?: Address;
  option: PaymentOption;
  createdAt: number;
  paidTx?: Hex;
};

export type Challenge = {
  x402Version: 1;
  error: "payment_required";
  flow: "ERC20_DIRECT";
  orderId: string;
  resource: string;
  description: string;
  accepts: PaymentOption[];
};

export function makeChallenge(order: Order, description: string): Challenge {
  return {
    x402Version: 1,
    error: "payment_required",
    flow: "ERC20_DIRECT",
    orderId: order.orderId,
    resource: order.resource,
    description,
    accepts: [order.option],
  };
}

export type PaymentHeader = { orderId: string; txHash: Hex };

export function encodePaymentHeader(p: PaymentHeader): string {
  return Buffer.from(JSON.stringify(p)).toString("base64");
}

export function decodePaymentHeader(v: string | undefined): PaymentHeader | null {
  if (!v) return null;
  try {
    const p = JSON.parse(Buffer.from(v, "base64").toString("utf8"));
    if (typeof p.orderId !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(p.txHash)) return null;
    return { orderId: p.orderId, txHash: p.txHash as Hex };
  } catch {
    return null;
  }
}

export type ReceiptLike = {
  status: "success" | "reverted";
  logs: { address: Address; topics: Hex[]; data: Hex }[];
};

export type VerifyResult = { ok: true; from: Address; value: bigint } | { ok: false; reason: string };

/** Check that the receipt carries a successful ERC-20 transfer that pays this order. */
export function verifyTransfer(args: {
  order: Order;
  receipt: ReceiptLike;
  txHash: Hex;
  usedTx: Set<string>;
  now: number;
}): VerifyResult {
  const { order, receipt, txHash, usedTx, now } = args;
  const o = order.option;
  if (order.paidTx && order.paidTx.toLowerCase() !== txHash.toLowerCase()) return { ok: false, reason: "order already paid by another tx" };
  if (!order.paidTx && usedTx.has(txHash.toLowerCase())) return { ok: false, reason: "tx already used for another order" };
  if (!order.paidTx && now > o.expiresAt) return { ok: false, reason: "order expired" };
  if (receipt.status !== "success") return { ok: false, reason: "tx reverted" };
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== o.tokenContract.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics as [Hex, ...Hex[]] });
      if (ev.eventName !== "Transfer") continue;
      const { from, to, value } = ev.args as { from: Address; to: Address; value: bigint };
      if (to.toLowerCase() !== o.payTo.toLowerCase()) continue;
      if (value < BigInt(o.amountWei)) continue;
      if (order.payer && from.toLowerCase() !== order.payer.toLowerCase()) continue;
      return { ok: true, from, value };
    } catch {
      continue;
    }
  }
  return { ok: false, reason: "no matching transfer to payTo for the required amount" };
}

export function receiptMessage(r: { orderId: string; txHash: Hex; resource: string; payer: Address }): string {
  return `callbook-x402-receipt\norder:${r.orderId}\ntx:${r.txHash}\nresource:${r.resource}\npayer:${r.payer}`;
}
