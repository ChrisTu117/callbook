/**
 * Rebuilds the static SignalBook / ScoreAnchor event index that the dashboard and the plugin ship.
 *
 *   npm run events            # default chain from networks.json, incremental
 *   npm run events -- 10143 --full
 *
 * Writes packages/core/src/events-<chain>.json (bundled into @callbook/core and the plugin)
 * and apps/web/public/events-<chain>.json (served next to the dashboard).
 * The scan uses the per-chain window in logChunkFor (100 on Monad testnet, 200 on Base Sepolia).
 * Requests stay at 10 per second, under the Monad RPC's 15 req/s limit.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, http, type Address } from "viem";
import { chunkRange, decodeBookLog, LOG_REQUESTS_PER_SECOND, logChunkFor, throttle, type BookEvent, type EventSnapshot } from "../packages/core/src/txindex.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const networks = JSON.parse(readFileSync(path.join(root, "networks.json"), "utf8")) as {
  defaultChainId: number;
  networks: { chainId: number; rpc: string; startBlock: number; signalBook: string; scoreAnchor: string }[];
};
const argv = process.argv.slice(2);
const chainId = Number(argv.find((a) => /^\d+$/.test(a)) ?? networks.defaultChainId);
const full = argv.includes("--full");
const network = networks.networks.find((n) => n.chainId === chainId);
if (!network || !network.signalBook || !network.scoreAnchor) throw new Error(`Chain ${chainId} has no book in networks.json.`);

const corePath = path.join(root, "packages/core/src", `events-${chainId}.json`);
const webPath = path.join(root, "apps/web/public", `events-${chainId}.json`);
let previous: EventSnapshot | null = null;
if (!full && existsSync(corePath)) {
  const parsed = JSON.parse(readFileSync(corePath, "utf8")) as EventSnapshot;
  const same =
    parsed.signalBook.toLowerCase() === network.signalBook.toLowerCase() &&
    parsed.scoreAnchor.toLowerCase() === network.scoreAnchor.toLowerCase();
  if (same) previous = parsed;
}

const client = createPublicClient({ transport: http(process.env.CALLBOOK_RPC_URL || network.rpc, { retryCount: 5, retryDelay: 400 }) });
const latest = await client.getBlockNumber();
const from = previous ? BigInt(previous.toBlock) + 1n : BigInt(network.startBlock);
const windows = chunkRange(from, latest, logChunkFor(chainId));
console.log(`chain ${chainId}: scanning ${from}..${latest} in ${windows.length} windows`);

const wait = throttle(LOG_REQUESTS_PER_SECOND);
const found: BookEvent[] = [];
let done = 0;
const inFlight = new Set<Promise<void>>();
for (const [a, b] of windows) {
  await wait();
  const job = (async () => {
    const logs = await client.getLogs({ address: [network.signalBook as Address, network.scoreAnchor as Address], fromBlock: a, toBlock: b });
    for (const log of logs) {
      const event = decodeBookLog(log);
      if (event) found.push(event);
    }
    done += 1;
    if (done % 50 === 0) console.log(`  ${done}/${windows.length}`);
  })();
  inFlight.add(job);
  job.finally(() => inFlight.delete(job));
  if (inFlight.size >= 8) await Promise.race(inFlight);
}
await Promise.all(inFlight);

const order: Record<string, number> = { commit: 0, reveal: 1, score: 2 };
const merged = new Map<string, BookEvent>();
for (const event of [...(previous?.events ?? []), ...found]) merged.set(`${event.kind}:${event.id}`, event);
const events = [...merged.values()].sort((x, y) => Number(x.id) - Number(y.id) || order[x.kind] - order[y.kind]);

const snapshot: EventSnapshot = {
  chainId,
  signalBook: network.signalBook,
  scoreAnchor: network.scoreAnchor,
  fromBlock: previous?.fromBlock ?? network.startBlock,
  toBlock: Number(latest),
  generatedAt: new Date().toISOString(),
  events,
};
const body = `${JSON.stringify(snapshot, null, 1)}\n`;
writeFileSync(corePath, body);
writeFileSync(webPath, body);
console.log(`wrote ${events.length} events (${found.length} new) through block ${latest}`);
console.log(`  ${path.relative(root, corePath)}\n  ${path.relative(root, webPath)}`);
