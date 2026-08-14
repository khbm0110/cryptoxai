/**
 * Public market data only — no API key needed, safe to call from the server
 * for display purposes (e.g. unrealized PnL on the supervisor dashboard).
 * This is NOT used anywhere in the execution path; the worker always prices
 * trades with the subscriber's own authenticated Binance client.
 */
export async function fetchLivePrices(symbols: string[]): Promise<Record<string, number>> {
  const uniqueOriginal = Array.from(new Set(symbols));
  const toBinance = new Map(uniqueOriginal.map((s) => [s.replace('/', ''), s]));
  const stripped = Array.from(toBinance.keys());
  if (stripped.length === 0) return {};

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(stripped))}`,
      { next: { revalidate: 5 } } // cache for 5s — this page doesn't need tick-by-tick freshness
    );
    if (!res.ok) return {};

    const data: { symbol: string; price: string }[] = await res.json();
    const prices: Record<string, number> = {};
    for (const row of data) {
      const original = toBinance.get(row.symbol);
      if (original) prices[original] = parseFloat(row.price);
    }
    return prices;
  } catch {
    return {}; // network hiccup — callers must handle missing prices gracefully
  }
}
