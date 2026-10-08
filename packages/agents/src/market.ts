export type Candle = { time: number; close: number };

const PRODUCTS: Record<string, string> = {
  "ETH-USD": "ETH-USD",
  "BTC-USD": "BTC-USD",
};

/** Coinbase Exchange public candles. Binance is blocked from some hosts. Settlement still uses Pyth. */
export async function loadCandles(symbol: string, limit = 30): Promise<Candle[]> {
  const product = PRODUCTS[symbol];
  if (!product) throw new Error(`No candle product for ${symbol}.`);
  const url = `https://api.exchange.coinbase.com/products/${product}/candles?granularity=60`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Coinbase candles failed: HTTP ${response.status}.`);
  const rows = (await response.json()) as number[][];
  if (!Array.isArray(rows) || rows.length < 12) throw new Error("Coinbase returned too few candles.");
  const candles = rows
    .map((row) => ({ time: row[0], close: row[4] }))
    .filter((row) => Number.isFinite(row.time) && Number.isFinite(row.close))
    .sort((a, b) => a.time - b.time);
  return candles.slice(-limit);
}

export function price1e8FromClose(close: number): bigint {
  if (!(close > 0)) throw new Error("Close must be positive.");
  return BigInt(Math.round(close * 1e8));
}
