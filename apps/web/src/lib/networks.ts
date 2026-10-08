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
};

export const networks = config.networks as PublicNetwork[];
export const defaultChainId = config.defaultChainId;

export function networkById(chainId: number): PublicNetwork | undefined {
  return networks.find((network) => network.chainId === chainId);
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
