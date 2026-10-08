import assert from "node:assert/strict";
import test from "node:test";
import { fadeDecision, mockClerkDecision, momentumDecision, parseClerkJson } from "../src/decide.ts";
import type { Candle } from "../src/market.ts";

function tape(closes: number[]): Candle[] {
  return closes.map((close, index) => ({ time: 1_700_000_000 + index * 60, close }));
}

test("momentum follows the average", () => {
  const up = momentumDecision(tape([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12]));
  assert.equal(up.direction, 1);
  const down = momentumDecision(tape([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 8]));
  assert.equal(down.direction, -1);
});

test("fade takes the other side of a rise", () => {
  const decision = fadeDecision(tape([10, 10, 10, 10, 10, 11]));
  assert.equal(decision.direction, -1);
  assert.match(decision.note, /Fade/);
});

test("clerk parser accepts model JSON and rejects junk", () => {
  const candles = tape([10, 10, 10, 10, 10, 11]);
  const parsed = parseClerkJson('```json\n{"direction":"short","confidence":70,"note":"stretched"}\n```', candles);
  assert.equal(parsed.source, "llm");
  assert.equal(parsed.direction, -1);
  assert.equal(parsed.confidenceBps, 7000);
  const fallback = parseClerkJson("no json here", candles);
  assert.equal(fallback.source, "mock");
  assert.equal(mockClerkDecision(candles).direction, 1);
});
