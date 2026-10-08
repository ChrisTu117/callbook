import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import test from "node:test";
import { BUNDLED, defaultChainId, readDeployment } from "../src/lib/files.ts";

test("the testnet book is bundled and readable from any directory", () => {
  const cwd = process.cwd();
  process.chdir(tmpdir());
  try {
    const d = readDeployment(10143);
    assert.equal(d.signalBook, "0x5Fcbf755e090D662DF1E673656Be97B4dA193010");
    assert.equal(d.scoreAnchor, "0xC9C45a32B4FEC8E0Ad7c3864051409D8330a71dd");
    assert.equal(d.copyDesk, "0xBAAFB4710f8B47Cf831FCdC1dF2b3135C9aCbA2e");
    assert.equal(d.minWinBps, 5000);
    assert.equal(d.revealWindow, 60);
    assert.throws(() => readDeployment(143), /not deployed on Monad/);
    assert.equal(BUNDLED[5042], null);
  } finally {
    process.chdir(cwd);
  }
});

test("the default chain is the live testnet book", () => {
  const saved = process.env.CALLBOOK_CHAIN_ID;
  delete process.env.CALLBOOK_CHAIN_ID;
  assert.equal(defaultChainId(), 10143);
  if (saved !== undefined) process.env.CALLBOOK_CHAIN_ID = saved;
});
