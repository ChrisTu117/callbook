import assert from "node:assert/strict";
import test from "node:test";
import { assetId, checkCopy, formatBps, gateAllows, priceDigest, rankAgents, signalHash, winRateBps } from "../src/index.ts";

test("asset id matches Solidity bytes32 right padding", () => {
  assert.equal(assetId("ETH-USD"), "0x4554482d55534400000000000000000000000000000000000000000000000000");
});

test("signal hash matches the Solidity vector", () => {
  const hash = signalHash({
    agentId: 1n,
    asset: assetId("ETH-USD"),
    direction: 1,
    confidenceBps: 7000,
    salt: `0x${"0".repeat(63)}5`,
    chainId: 31337n,
    book: "0x0000000000000000000000000000000000001234",
  });
  assert.equal(hash, "0x1a308c473fe1575cd57fc56f58ec14be7e686c367fb71a2b82e02c86e471e106");
});

test("price digest matches the Solidity vector", () => {
  const hash = priceDigest({
    chainId: 5042n,
    source: "0x0000000000000000000000000000000000001111",
    asset: assetId("ETH-USD"),
    price1e8: 250_000_000_000n,
    publishedAt: 1_700_000_000n,
  });
  assert.equal(hash, "0xd509abb108e783236d9364f1c05cc97c800d963d55bd5939e7d66a21363c57d3");
});

test("rank prefers win rate, then sample size", () => {
  const ranked = rankAgents([
    { agentId: 1n, samples: 2, wins: 2, cumulativePnlBps: 10n },
    { agentId: 2n, samples: 10, wins: 6, cumulativePnlBps: 500n },
    { agentId: 3n, samples: 4, wins: 4, cumulativePnlBps: 20n },
  ]);
  assert.deepEqual(
    ranked.map((row) => row.agentId),
    [3n, 1n, 2n],
  );
  assert.equal(winRateBps(2, 2), 10_000);
});

test("gate and spend cap", () => {
  assert.equal(gateAllows(0, 0, { minSamples: 1, minWinBps: 5000 }), false);
  assert.equal(gateAllows(1, 1, { minSamples: 1, minWinBps: 5000 }), true);
  assert.equal(gateAllows(2, 0, { minSamples: 1, minWinBps: 5000 }), false);
  assert.deepEqual(checkCopy({ escrow: 100n, perTradeCap: 40n, notional: 50n }), {
    ok: false,
    reason: "Notional is above the per-trade cap.",
  });
  assert.deepEqual(checkCopy({ escrow: 100n, perTradeCap: 40n, notional: 30n }), { ok: true });
  assert.equal(formatBps(100n), "1.00%");
  assert.equal(formatBps(-250n), "-2.50%");
});
