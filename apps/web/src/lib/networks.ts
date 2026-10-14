import config from "../../../../networks.json";
import { fallback, http, isAddress, type Address, type Transport } from "viem";

export type PublicNetwork = {
  chainId: number;
  name: string;
  rpc: string;
  /** Extra RPCs tried in order when `rpc` errors or times out. */
  rpcFallbacks?: string[];
  explorer: string;
  nativeSymbol: string;
  nativeDecimals: number;
  startBlock: number;
  priceKind: string;
  minSamples: number;
  minWinBps: number;
  identity: string;
  reputation: string;
  validation: string;
  priceSource: string;
  signalBook: string;
  scoreAnchor: string;
  copyDesk: string;
  /** "colosseum" chains stay out of the menu unless the page asks for that track. */
  track?: string;
  logChunk?: number;
};

export const networks = config.networks as PublicNetwork[];
export const defaultChainId = config.defaultChainId;

export function networkById(chainId: number): PublicNetwork | undefined {
  return networks.find((network) => network.chainId === chainId);
}

/** The Monad menu. Colosseum Sepolia chains appear only when `showColosseum` is true. */
export function networksForMenu(showColosseum: boolean): PublicNetwork[] {
  if (showColosseum) return networks;
  return networks.filter((network) => network.track !== "colosseum");
}

export function isReady(network: PublicNetwork): boolean {
  return [network.signalBook, network.scoreAnchor, network.copyDesk, network.identity, network.reputation].every(
    (value) => isAddress(value),
  );
}

export function asAddress(value: string): Address {
  if (!isAddress(value)) throw new Error("Address is empty.");
  return value;
}

/** Per-request timeout so a hanging RPC fails over quickly. */
const RPC_TIMEOUT_MS = 8_000;

/**
 * Primary `rpc` first (it must serve history for getLogs), then `rpcFallbacks` in order.
 * A single RPC still gets the short timeout and a retry.
 */
export function transportFor(network: Pick<PublicNetwork, "rpc" | "rpcFallbacks">): Transport {
  const urls = [network.rpc, ...(network.rpcFallbacks ?? [])].filter((url, i, all) => url && all.indexOf(url) === i);
  const transports = urls.map((url) => http(url, { timeout: RPC_TIMEOUT_MS, retryCount: 1 }));
  return transports.length === 1 ? transports[0] : fallback(transports, { rank: false, retryCount: 1 });
}
