import { mockClerkDecision, parseClerkJson, type Decision } from "./decide.ts";
import type { Candle } from "./market.ts";

export async function clerkDecision(candles: Candle[]): Promise<Decision> {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  if (!base || !key) return mockClerkDecision(candles);

  const tape = candles
    .slice(-20)
    .map((candle) => candle.close.toFixed(2))
    .join(", ");
  const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are Clerk, a trading-signal agent. Reply with JSON only: {\"direction\":\"long\"|\"short\",\"confidence\":1-100,\"note\":\"max 180 chars\"}. You must pick a side.",
        },
        {
          role: "user",
          content: `ETH-USD 1-minute closes, oldest first: ${tape}`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const fallback = mockClerkDecision(candles);
    fallback.note = `Mock clerk. LLM HTTP ${response.status}. ${fallback.note}`;
    return fallback;
  }
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content ?? "";
  return parseClerkJson(text, candles);
}
