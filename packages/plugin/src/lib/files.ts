import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chainInfo, type Deployment } from "@callbook/core";
import networks from "../../../../networks.json" with { type: "json" };
import testnet from "../../../../deployments/10143.json" with { type: "json" };

type NetworkEntry = (typeof networks.networks)[number];

/** Deployments compiled into the plugin, so it runs from any directory. */
const recorded: Record<number, Partial<Deployment>> = { 10143: testnet as Partial<Deployment> };

function fromNetwork(entry: NetworkEntry): Deployment | null {
  const extra = recorded[entry.chainId] ?? {};
  const timed = entry as NetworkEntry & { revealWindow?: number; pinWindow?: number; maxStaleness?: number };
  if (!entry.signalBook || !entry.scoreAnchor || !entry.copyDesk) return null;
  return {
    revealWindow: timed.revealWindow ?? 60,
    pinWindow: timed.pinWindow ?? 3600,
    maxStaleness: timed.maxStaleness ?? 3600,
    ...extra,
    chainId: entry.chainId,
    priceKind: entry.priceKind as Deployment["priceKind"],
    identity: entry.identity as Deployment["identity"],
    reputation: entry.reputation as Deployment["reputation"],
    validation: entry.validation as Deployment["validation"],
    priceSource: entry.priceSource as Deployment["priceSource"],
    signalBook: entry.signalBook as Deployment["signalBook"],
    scoreAnchor: entry.scoreAnchor as Deployment["scoreAnchor"],
    copyDesk: entry.copyDesk as Deployment["copyDesk"],
    minSamples: entry.minSamples,
    minWinBps: entry.minWinBps,
    startBlock: entry.startBlock,
  };
}

/** Chains the plugin knows about, with null where the book is not deployed yet (Monad mainnet, Arc). */
export const BUNDLED: Record<number, Deployment | null> = Object.fromEntries(
  networks.networks.map((entry) => [entry.chainId, fromNetwork(entry)]),
);

export function defaultChainId(): number {
  return Number(process.env.CALLBOOK_CHAIN_ID || networks.defaultChainId);
}

function fromCwd(chainId: number): Deployment | null {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, "deployments", `${chainId}.json`);
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, "utf8")) as Deployment;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * CALLBOOK_DEPLOYMENT (a JSON file) wins. Then the deployment bundled at build time.
 * Then deployments/<chain>.json in the working directory, for a local Anvil book.
 */
export function readDeployment(chainId: number): Deployment {
  const explicit = process.env.CALLBOOK_DEPLOYMENT;
  if (explicit) return JSON.parse(readFileSync(explicit, "utf8")) as Deployment;
  const bundled = BUNDLED[chainId];
  if (bundled) return bundled;
  const local = fromCwd(chainId);
  if (local) return local;
  const live = Object.values(BUNDLED)
    .filter((d): d is Deployment => d !== null)
    .map((d) => `${chainInfo(d.chainId).name} (${d.chainId})`)
    .join(", ");
  if (chainId in BUNDLED) {
    throw new Error(`Callbook is not deployed on ${chainInfo(chainId).name} (${chainId}) yet. Live book: ${live}. Or set CALLBOOK_DEPLOYMENT.`);
  }
  throw new Error(`No Callbook deployment for chain ${chainId}. Live book: ${live}. Or set CALLBOOK_DEPLOYMENT to a deployment JSON.`);
}
