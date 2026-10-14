import config from "../../../../networks.json";
import { isAddress, type Address } from "viem";

export type PublicNetwork = {
  chainId: number;
  name: string;
  rpc: string;
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
