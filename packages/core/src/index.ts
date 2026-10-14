import { encodeAbiParameters, keccak256, pad, stringToHex, type Abi, type Address, type Hex } from "viem";
import attestedAbi from "./AttestedPrice.json" with { type: "json" };
import copyDeskAbiJson from "./CopyDesk.json" with { type: "json" };
import identityAbiJson from "./Identity.json" with { type: "json" };
import mockPriceAbiJson from "./MockPrice.json" with { type: "json" };
import reputationAbiJson from "./Reputation.json" with { type: "json" };
import scoreAnchorAbiJson from "./ScoreAnchor.json" with { type: "json" };
import signalBookAbiJson from "./SignalBook.json" with { type: "json" };
import validationAbiJson from "./Validation.json" with { type: "json" };

export const signalBookAbi = signalBookAbiJson as Abi;
export const scoreAnchorAbi = scoreAnchorAbiJson as Abi;
export const copyDeskAbi = copyDeskAbiJson as Abi;
export const identityAbi = identityAbiJson as Abi;
export const reputationAbi = reputationAbiJson as Abi;
export const validationAbi = validationAbiJson as Abi;
export const attestedPriceAbi = attestedAbi as Abi;
export const mockPriceAbi = mockPriceAbiJson as Abi;

export const ASSETS = ["ETH-USD", "BTC-USD", "MON-USD"] as const;
export type AssetSymbol = (typeof ASSETS)[number];

export type ChainInfo = {
  chainId: number;
  name: string;
  rpc: string;
  explorer: string;
  nativeSymbol: string;
  nativeDecimals: number;
};

export const CHAINS: Record<number, ChainInfo> = {
  10143: {
    chainId: 10143,
    name: "Monad testnet",
    rpc: "https://testnet-rpc.monad.xyz",
    explorer: "https://testnet.monadscan.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
  },
  143: {
    chainId: 143,
    name: "Monad",
    rpc: "https://rpc.monad.xyz",
    explorer: "https://monadscan.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
  },
  5042: {
    chainId: 5042,
    name: "Arc",
    rpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
    nativeSymbol: "USDC",
    nativeDecimals: 18,
  },
  31337: {
    chainId: 31337,
    name: "Anvil",
    rpc: "http://127.0.0.1:8545",
    explorer: "",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
  },
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    rpc: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
  },
  421614: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpc: "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
  },
  11155111: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpc: "https://ethereum-sepolia-rpc.publicnode.com",
    explorer: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
  },
};

export type Deployment = {
  chainId: number;
  priceKind: "pyth" | "attested" | "mock";
  identity: Address;
  reputation: Address;
  validation: Address;
  priceSource: Address;
  signalBook: Address;
  scoreAnchor: Address;
  copyDesk: Address;
  revealWindow: number;
  pinWindow: number;
  maxStaleness: number;
  minSamples: number;
  minWinBps: number;
  /** First block worth scanning for book events. Optional. */
  startBlock?: number;
};

export type Gate = { minSamples: number; minWinBps: number };

export function chainInfo(chainId: number): ChainInfo {
  const known = CHAINS[chainId];
  if (known) return known;
  return {
    chainId,
    name: `Chain ${chainId}`,
    rpc: "",
    explorer: "",
    nativeSymbol: "ETH",
    nativeDecimals: 18,
  };
}

export function explorerTx(chainId: number, hash: string): string | null {
  const base = chainInfo(chainId).explorer;
  if (!base || !hash) return null;
  return `${base}/tx/${hash}`;
}

export function explorerAddress(chainId: number, address: string): string | null {
  const base = chainInfo(chainId).explorer;
  if (!base || !address) return null;
  return `${base}/address/${address}`;
}

/** Right-padded UTF-8, matching Solidity `bytes32("ETH-USD")`. */
export function assetId(symbol: string): Hex {
  return pad(stringToHex(symbol), { size: 32, dir: "right" });
}

export function assetLabel(id: Hex): string {
  const hex = id.slice(2);
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    if (byte === 0) break;
    out += String.fromCharCode(byte);
  }
  return out || id;
}

export function signalHash(args: {
  agentId: bigint;
  asset: Hex;
  direction: 1 | -1;
  confidenceBps: number;
  salt: Hex;
  chainId: bigint;
  book: Address;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "bytes32" },
        { type: "int8" },
        { type: "uint16" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "address" },
      ],
      [args.agentId, args.asset, args.direction, args.confidenceBps, args.salt, args.chainId, args.book],
    ),
  );
}

/** Matches AttestedPriceSource.digest. The signer then personal_sign's this digest. */
export function priceDigest(args: {
  chainId: bigint;
  source: Address;
  asset: Hex;
  price1e8: bigint;
  publishedAt: bigint;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "string" },
        { type: "uint256" },
        { type: "address" },
        { type: "bytes32" },
        { type: "int256" },
        { type: "uint64" },
      ],
      ["CALLBOOK_PRICE", args.chainId, args.source, args.asset, args.price1e8, args.publishedAt],
    ),
  );
}

export function winRateBps(samples: number, wins: number): number {
  if (samples <= 0) return 0;
  return Math.floor((wins * 10_000) / samples);
}

export function gateAllows(samples: number, wins: number, gate: Gate): boolean {
  if (samples < gate.minSamples) return false;
  if (samples === 0) return true;
  return winRateBps(samples, wins) >= gate.minWinBps;
}

export function gateReason(samples: number, wins: number, gate: Gate): string | null {
  if (gateAllows(samples, wins, gate)) return null;
  if (samples < gate.minSamples) {
    return `Agent has ${samples} scored calls. The gate requires ${gate.minSamples}.`;
  }
  return `Win rate is ${(winRateBps(samples, wins) / 100).toFixed(2)}%. The gate requires ${(gate.minWinBps / 100).toFixed(2)}%.`;
}

export type RankRow = {
  agentId: bigint;
  samples: number;
  wins: number;
  cumulativePnlBps: bigint;
};

export function rankAgents<T extends RankRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rate = winRateBps(b.samples, b.wins) - winRateBps(a.samples, a.wins);
    if (rate !== 0) return rate;
    if (a.samples !== b.samples) return b.samples - a.samples;
    if (a.cumulativePnlBps === b.cumulativePnlBps) return a.agentId < b.agentId ? -1 : 1;
    return a.cumulativePnlBps > b.cumulativePnlBps ? -1 : 1;
  });
}

export function checkCopy(input: { escrow: bigint; perTradeCap: bigint; notional: bigint }): { ok: true } | { ok: false; reason: string } {
  if (input.notional <= 0n) return { ok: false, reason: "Notional must be greater than zero." };
  if (input.notional > input.escrow) return { ok: false, reason: "Notional is above the remaining spend cap." };
  if (input.perTradeCap > 0n && input.notional > input.perTradeCap) {
    return { ok: false, reason: "Notional is above the per-trade cap." };
  }
  return { ok: true };
}

export function format1e8(price: bigint): string {
  const neg = price < 0n;
  const v = neg ? -price : price;
  const whole = v / 100_000_000n;
  const frac = (v % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole.toString()}${frac ? `.${frac}` : ""}`;
}

export function formatBps(bps: bigint): string {
  const neg = bps < 0n;
  const v = neg ? -bps : bps;
  const whole = v / 100n;
  const frac = (v % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}${whole.toString()}.${frac}%`;
}

export function formatWinRate(samples: number, wins: number): string {
  if (samples === 0) return "—";
  return `${(winRateBps(samples, wins) / 100).toFixed(2)}%`;
}

export function registrationJson(args: {
  name: string;
  description: string;
  agentId: bigint;
  chainId: number;
  identity: Address;
}): string {
  return JSON.stringify({
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: args.name,
    description: args.description,
    image: "",
    services: [{ name: "web", endpoint: `callbook://agent/${args.agentId.toString()}` }],
    x402Support: false,
    active: true,
    registrations: [
      {
        agentId: Number(args.agentId),
        agentRegistry: `eip155:${args.chainId}:${args.identity}`,
      },
    ],
    supportedTrust: ["reputation"],
  });
}

export function registrationUri(args: {
  name: string;
  description: string;
  agentId: bigint;
  chainId: number;
  identity: Address;
}): string {
  const json = registrationJson(args);
  return `data:application/json;base64,${Buffer.from(json, "utf8").toString("base64")}`;
}

export function parseRegistration(uri: string): { name?: string; description?: string } | null {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) return null;
  try {
    const json = Buffer.from(uri.slice(prefix.length), "base64").toString("utf8");
    const parsed = JSON.parse(json) as { name?: string; description?: string };
    return parsed;
  } catch {
    return null;
  }
}
export * from "./txindex.js";
