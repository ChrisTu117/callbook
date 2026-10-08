import assert from "node:assert/strict";
import test from "node:test";
import type { Deployment } from "@callbook/core";
import { checkCopy } from "@callbook/core";
import { followCall, mirrorCall } from "../src/lib/book.ts";

const deployment = {
  chainId: 143,
  priceKind: "pyth",
  identity: "0x0000000000000000000000000000000000000001",
  reputation: "0x0000000000000000000000000000000000000002",
  validation: "0x0000000000000000000000000000000000000003",
  priceSource: "0x0000000000000000000000000000000000000004",
  signalBook: "0x0000000000000000000000000000000000000005",
  scoreAnchor: "0x0000000000000000000000000000000000000006",
  copyDesk: "0x0000000000000000000000000000000000000007",
  revealWindow: 120,
  pinWindow: 3600,
  maxStaleness: 3600,
  minSamples: 1,
  minWinBps: 5000,
} satisfies Deployment;

test("follow and mirror selectors match the contract", () => {
  const follow = followCall(deployment, 1n, 10n, 100n);
  assert.equal(follow.data.slice(0, 10), "0x821defc2");
  const mirror = mirrorCall(deployment, 4n, 10n, 100n, 40n);
  assert.equal(mirror.ok, true);
  assert.equal(mirror.data.slice(0, 10), "0x072a657e");
  const blocked = mirrorCall(deployment, 4n, 50n, 100n, 40n);
  assert.equal(blocked.ok, false);
  assert.equal(checkCopy({ escrow: 0n, perTradeCap: 0n, notional: 1n }).ok, false);
});
