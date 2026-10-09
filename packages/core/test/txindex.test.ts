import assert from "node:assert/strict";
import test from "node:test";
import config from "../../../networks.json" with { type: "json" };
import { chunkRange, emptyIndex, indexFromSnapshot, isLogRangeError, logChunkFor, mergeRanges, missingRanges, snapshotFor } from "../src/txindex.ts";

test("getLogs windows never exceed 100 blocks", () => {
  const chunks = chunkRange(1000n, 1250n);
  assert.deepEqual(chunks, [
    [1000n, 1099n],
    [1100n, 1199n],
    [1200n, 1250n],
  ]);
  assert.deepEqual(chunkRange(5n, 5n), [[5n, 5n]]);
  assert.deepEqual(chunkRange(6n, 5n), []);
});

test("each public RPC uses a getLogs window that RPC accepts", () => {
  assert.equal(logChunkFor(10143), 100n);
  assert.equal(logChunkFor(84532), 200n);
  assert.equal(logChunkFor(421614), 2000n);
  assert.equal(logChunkFor(11155111), 2000n);
  assert.equal(logChunkFor(999999), 100n);
  for (const network of config.networks) {
    if (network.logChunk === undefined) continue;
    assert.equal(logChunkFor(network.chainId), BigInt(network.logChunk));
    const chunks = chunkRange(1n, 1000n, logChunkFor(network.chainId));
    assert.ok(chunks.every(([from, to]) => to - from + 1n <= BigInt(network.logChunk)));
  }
  assert.equal(isLogRangeError(new Error("eth_getLogs is limited to a 200 range")), true);
  assert.equal(isLogRangeError(new Error("header not found")), false);
});

test("ranges merge when they touch", () => {
  assert.deepEqual(mergeRanges([[10n, 20n], [21n, 30n], [50n, 60n], [55n, 70n]]), [
    [10n, 30n],
    [50n, 70n],
  ]);
});

test("the testnet snapshot covers the posted book", () => {
  const snap = snapshotFor(10143, "0x5Fcbf755e090D662DF1E673656Be97B4dA193010", "0xc9c45a32b4fec8e0ad7c3864051409d8330a71dd");
  assert.ok(snap);
  const index = indexFromSnapshot(snap);
  assert.equal(index.commit.get("1"), "0xd7586502702f8e236424f6cd61bec3c2abbe04405ac8facec644003e270c3770");
  assert.equal(index.score.get("1"), "0xf615e2075903dfb1f5fc83c21eba919b6bb24e46d6f1c35f4c9a534ae83779f6");
  assert.equal(snapshotFor(10143, "0x0000000000000000000000000000000000000001", snap.scoreAnchor), null);
});

test("only blocks after the snapshot are scanned, and only where a link is missing", () => {
  const index = emptyIndex();
  index.commit.set("1", "0xaa");
  const latest = { number: 10_000n, timestamp: 4_000n };
  const pending = [
    // Fully covered by the index except the reveal, which sits before the snapshot end.
    { id: "1", commitBlock: 1_000n, commitTime: 400n, revealDeadline: 460n, horizonEnd: 520n, revealed: true, scored: false },
    // New after the snapshot: commit, reveal, and score windows.
    { id: "2", commitBlock: 9_000n, commitTime: 3_600n, revealDeadline: 3_660n, horizonEnd: 3_720n, revealed: true, scored: true },
  ];
  const ranges = missingRanges({ pending, index, afterBlock: 8_000n, latest, scoreSpan: 500n });
  assert.ok(ranges.every(([a]) => a >= 8_000n));
  assert.ok(ranges.some(([a, b]) => a <= 9_000n && b >= 9_000n));
  assert.ok(ranges.every(([, b]) => b <= latest.number));
});
