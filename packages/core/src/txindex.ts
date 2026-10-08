import { decodeEventLog, type Abi, type Address, type PublicClient } from "viem";
import scoreAnchorAbiJson from "./ScoreAnchor.json" with { type: "json" };
import signalBookAbiJson from "./SignalBook.json" with { type: "json" };
import snapshot10143 from "./events-10143.json" with { type: "json" };

/** Most public RPCs (Monad testnet included) cap eth_getLogs at 100 blocks per call. */
export const LOG_CHUNK = 100n;
/** Monad testnet allows 15 requests per second. Stay well under it. */
export const LOG_REQUESTS_PER_SECOND = 10;

export type BookEventKind = "commit" | "reveal" | "score";

export type BookEvent = { id: string; kind: BookEventKind; tx: string; block: number };

/**
 * A static index of SignalBook / ScoreAnchor events. Regenerate with `npm run events`.
 * `toBlock` is the last block the snapshot scanned, not the last block with an event.
 */
export type EventSnapshot = {
  chainId: number;
  signalBook: string;
  scoreAnchor: string;
  fromBlock: number;
  toBlock: number;
  generatedAt: string;
  events: BookEvent[];
};

export const EVENT_SNAPSHOTS: Record<number, EventSnapshot> = {
  10143: snapshot10143 as EventSnapshot,
};

export type TxIndex = {
  commit: Map<string, string>;
  reveal: Map<string, string>;
  score: Map<string, string>;
};

/** What the scanner needs to know about a signal that the snapshot does not fully cover. */
export type PendingSignal = {
  id: string;
  commitBlock: bigint;
  commitTime: bigint;
  revealDeadline: bigint;
  horizonEnd: bigint;
  revealed: boolean;
  scored: boolean;
};

const bookAbi = [...(signalBookAbiJson as Abi), ...(scoreAnchorAbiJson as Abi)];

export function emptyIndex(): TxIndex {
  return { commit: new Map(), reveal: new Map(), score: new Map() };
}

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** The bundled snapshot for this book, or null when the addresses do not match. */
export function snapshotFor(chainId: number, signalBook: string, scoreAnchor: string): EventSnapshot | null {
  const snap = EVENT_SNAPSHOTS[chainId];
  if (!snap) return null;
  if (!sameAddress(snap.signalBook, signalBook) || !sameAddress(snap.scoreAnchor, scoreAnchor)) return null;
  return snap;
}

export function indexFromSnapshot(snap: EventSnapshot | null): TxIndex {
  const index = emptyIndex();
  if (!snap) return index;
  for (const event of snap.events) index[event.kind].set(event.id, event.tx);
  return index;
}

/** Spaces calls so a burst never exceeds `perSecond`. */
export function throttle(perSecond = LOG_REQUESTS_PER_SECOND) {
  const gap = Math.ceil(1000 / perSecond);
  let next = 0;
  return async () => {
    const now = Date.now();
    const at = Math.max(now, next);
    next = at + gap;
    if (at > now) await new Promise((resolve) => setTimeout(resolve, at - now));
  };
}

export function decodeBookLog(log: { data: `0x${string}`; topics: readonly `0x${string}`[]; transactionHash: string | null; blockNumber: bigint | null }): BookEvent | null {
  try {
    const decoded = decodeEventLog({ abi: bookAbi, data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
    const args = decoded.args as { id?: bigint; signalId?: bigint };
    const id = (args.id ?? args.signalId)?.toString();
    if (!id || !log.transactionHash) return null;
    const kind: BookEventKind | null =
      decoded.eventName === "Committed" ? "commit" : decoded.eventName === "Revealed" ? "reveal" : decoded.eventName === "Scored" ? "score" : null;
    if (!kind) return null;
    return { id, kind, tx: log.transactionHash, block: Number(log.blockNumber ?? 0n) };
  } catch {
    return null;
  }
}

/** Splits [from, to] into getLogs-sized windows. */
export function chunkRange(from: bigint, to: bigint, size = LOG_CHUNK): [bigint, bigint][] {
  const out: [bigint, bigint][] = [];
  for (let start = from; start <= to; start += size) {
    const end = start + size - 1n < to ? start + size - 1n : to;
    out.push([start, end]);
  }
  return out;
}

/** Merges overlapping or touching ranges. */
export function mergeRanges(ranges: [bigint, bigint][]): [bigint, bigint][] {
  const sorted = [...ranges].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out: [bigint, bigint][] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1n) {
      if (b > last[1]) last[1] = b;
    } else out.push([a, b]);
  }
  return out;
}

/**
 * Block windows to scan for the events the snapshot is missing. Only blocks after the snapshot are scanned.
 * Commit and reveal sit within the reveal window after `commitBlock`. The score sits after the horizon;
 * its block is estimated from the chain's average block time and scanned forward for `scoreSpan` blocks.
 */
export function missingRanges(args: {
  pending: PendingSignal[];
  index: TxIndex;
  afterBlock: bigint;
  latest: { number: bigint; timestamp: bigint };
  scoreSpan?: bigint;
}): [bigint, bigint][] {
  const { pending, index, afterBlock, latest } = args;
  const scoreSpan = args.scoreSpan ?? 3000n;
  const ranges: [bigint, bigint][] = [];
  const clamp = (a: bigint, b: bigint) => {
    const from = a > afterBlock ? a : afterBlock;
    const to = b < latest.number ? b : latest.number;
    if (from <= to) ranges.push([from, to]);
  };
  for (const signal of pending) {
    if (signal.commitBlock === 0n) continue;
    const elapsedBlocks = latest.number > signal.commitBlock ? latest.number - signal.commitBlock : 1n;
    const elapsedSecs = latest.timestamp > signal.commitTime ? latest.timestamp - signal.commitTime : 1n;
    // Blocks per second, scaled by 1000 to stay in integers.
    const rate = (elapsedBlocks * 1000n) / (elapsedSecs === 0n ? 1n : elapsedSecs);
    const blocksFor = (secs: bigint) => (secs * rate) / 1000n + 1n;
    if (!index.commit.has(signal.id)) clamp(signal.commitBlock, signal.commitBlock);
    if (signal.revealed && !index.reveal.has(signal.id)) {
      const window = signal.revealDeadline > signal.commitTime ? signal.revealDeadline - signal.commitTime : 0n;
      clamp(signal.commitBlock + 1n, signal.commitBlock + blocksFor(window) + 20n);
    }
    if (signal.scored && !index.score.has(signal.id)) {
      const toHorizon = signal.horizonEnd > signal.commitTime ? signal.horizonEnd - signal.commitTime : 0n;
      const start = signal.commitBlock + blocksFor(toHorizon);
      clamp(start, start + scoreSpan);
    }
  }
  return mergeRanges(ranges);
}

/**
 * Commit / reveal / score transaction hashes for a book. Starts from the bundled snapshot,
 * then fills gaps with throttled 100-block getLogs over blocks after the snapshot only.
 */
export async function bookTxIndex(args: {
  client: PublicClient;
  chainId: number;
  signalBook: Address;
  scoreAnchor: Address;
  startBlock?: bigint;
  pending: PendingSignal[];
  perSecond?: number;
  maxRequests?: number;
}): Promise<TxIndex & { scanned: number; snapshotTo: number | null }> {
  const snap = snapshotFor(args.chainId, args.signalBook, args.scoreAnchor);
  const index = indexFromSnapshot(snap);
  const afterBlock = snap ? BigInt(snap.toBlock) + 1n : args.startBlock ?? 0n;
  const missing = args.pending.filter(
    (s) => !index.commit.has(s.id) || (s.revealed && !index.reveal.has(s.id)) || (s.scored && !index.score.has(s.id)),
  );
  let scanned = 0;
  if (missing.length === 0) return { ...index, scanned, snapshotTo: snap?.toBlock ?? null };
  try {
    const block = await args.client.getBlock();
    const ranges = missingRanges({
      pending: missing,
      index,
      afterBlock,
      latest: { number: block.number ?? 0n, timestamp: block.timestamp },
    });
    const wait = throttle(args.perSecond ?? LOG_REQUESTS_PER_SECOND);
    const budget = args.maxRequests ?? 400;
    for (const [from, to] of ranges.flatMap(([a, b]) => chunkRange(a, b))) {
      if (scanned >= budget) break;
      await wait();
      scanned += 1;
      const logs = await args.client.getLogs({ address: [args.signalBook, args.scoreAnchor], fromBlock: from, toBlock: to });
      for (const log of logs) {
        const event = decodeBookLog(log);
        if (event) index[event.kind].set(event.id, event.tx);
      }
    }
  } catch {
    // Links after the snapshot stay empty if the RPC refuses. The book itself still renders.
  }
  return { ...index, scanned, snapshotTo: snap?.toBlock ?? null };
}
