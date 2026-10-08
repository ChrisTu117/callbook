import type { Candle } from "./market.ts";

export type Side = 1 | -1;

export type Decision = {
  direction: Side;
  confidenceBps: number;
  note: string;
  source: "momentum" | "fade" | "mock" | "llm";
};

function average(values: number[]): number {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

export function momentumDecision(candles: Candle[]): Decision {
  if (candles.length < 12) throw new Error("Momentum needs 12 closes.");
  const window = candles.slice(-12).map((candle) => candle.close);
  const last = window[window.length - 1];
  const sma = average(window);
  const direction: Side = last >= sma ? 1 : -1;
  const gap = Math.abs(last - sma) / sma;
  const confidenceBps = Math.max(5000, Math.min(9000, Math.round(5000 + gap * 100_000)));
  return {
    direction,
    confidenceBps,
    source: "momentum",
    note: `Momentum. Last ${last.toFixed(2)} versus SMA12 ${sma.toFixed(2)}.`,
  };
}

export function fadeDecision(candles: Candle[]): Decision {
  if (candles.length < 6) throw new Error("Fade needs 6 closes.");
  const last = candles[candles.length - 1].close;
  const then = candles[candles.length - 6].close;
  const ret = (last - then) / then;
  const direction: Side = ret >= 0 ? -1 : 1;
  const confidenceBps = Math.max(5000, Math.min(8500, Math.round(5200 + Math.abs(ret) * 80_000)));
  return {
    direction,
    confidenceBps,
    source: "fade",
    note: `Fade. Five-minute return is ${(ret * 100).toFixed(2)}%.`,
  };
}

/** Deterministic stand-in used when no LLM key is configured. */
export function mockClerkDecision(candles: Candle[]): Decision {
  if (candles.length < 6) throw new Error("Clerk needs 6 closes.");
  const last = candles[candles.length - 1].close;
  const then = candles[candles.length - 6].close;
  const ret = (last - then) / then;
  const direction: Side = ret >= 0 ? 1 : -1;
  return {
    direction,
    confidenceBps: 5500,
    source: "mock",
    note: `Mock clerk. Six-minute return is ${(ret * 100).toFixed(2)}%. No LLM key is set.`,
  };
}

export function parseClerkJson(text: string, candles: Candle[]): Decision {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return mockClerkDecision(candles);
  try {
    const parsed = JSON.parse(match[0]) as { direction?: string; confidence?: number; note?: string };
    const direction: Side | null = parsed.direction === "long" ? 1 : parsed.direction === "short" ? -1 : null;
    if (!direction) return mockClerkDecision(candles);
    const confidence = Number(parsed.confidence);
    const confidenceBps = Number.isFinite(confidence) ? Math.max(1, Math.min(100, Math.round(confidence))) * 100 : 5500;
    const note = (parsed.note ?? "Clerk.").replace(/\s+/g, " ").slice(0, 180);
    return { direction, confidenceBps, note, source: "llm" };
  } catch {
    return mockClerkDecision(candles);
  }
}
