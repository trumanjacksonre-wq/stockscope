import type { OHLCBar, TickerDetails } from './types';

const BASE = 'https://api.polygon.io';

function polygonFetch(path: string, ttl = 300) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE}${path}${sep}apiKey=${process.env.POLYGON_API_KEY}`;
  return fetch(url, { next: { revalidate: ttl } });
}

function dateStr(offsetMs = 0): string {
  return new Date(Date.now() - offsetMs).toISOString().slice(0, 10);
}

export async function getOHLC(ticker: string, days = 365): Promise<OHLCBar[]> {
  const to = dateStr();
  const from = dateStr(days * 86_400_000);
  const res = await polygonFetch(
    `/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=500`,
  );
  if (!res.ok) throw new Error(`Polygon OHLC ${res.status}: ${ticker}`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (json.results ?? []).map((r: any): OHLCBar => ({
    time: Math.floor(r.t / 1000),
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v ?? 0,
  }));
}

export async function getTickerDetails(ticker: string, ohlcFull: OHLCBar[]): Promise<TickerDetails> {
  const [refRes, snapRes] = await Promise.all([
    polygonFetch(`/v3/reference/tickers/${ticker}`, 86_400),
    polygonFetch(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`, 60),
  ]);

  if (!refRes.ok) throw new Error(`Polygon reference ${refRes.status}: ${ticker}`);

  const ref = await refRes.json();
  const snap = snapRes.ok ? await snapRes.json() : null;

  const info = ref.results ?? {};
  const snapTicker = snap?.ticker ?? {};

  // Current price: prefer live day close → last trade → prev day close → latest OHLC bar
  const currentPrice: number =
    (snapTicker.day?.c > 0 ? snapTicker.day.c : null) ??
    snapTicker.lastTrade?.p ??
    snapTicker.prevDay?.c ??
    ohlcFull.at(-1)?.close ??
    0;

  // 30-day change: compare current to the close ~30 trading bars ago
  const bar30d = ohlcFull.length > 30 ? ohlcFull[ohlcFull.length - 31] : ohlcFull[0];
  const priceChange30d = bar30d && bar30d.close > 0
    ? ((currentPrice - bar30d.close) / bar30d.close) * 100
    : 0;

  // 52-week high/low across all bars in the full-year OHLC
  let high52w = 0;
  let low52w = Infinity;
  for (const b of ohlcFull) {
    if (b.high > high52w) high52w = b.high;
    if (b.low < low52w) low52w = b.low;
  }
  if (low52w === Infinity) low52w = 0;

  // Average daily volume over the last 20 trading days
  const recentBars = ohlcFull.slice(-20);
  const avgVolume = recentBars.length > 0
    ? Math.round(recentBars.reduce((s, b) => s + b.volume, 0) / recentBars.length)
    : 0;

  // P/E ratio — Polygon Stocks Advanced tier; silently null on free tier
  let peRatio: number | null = null;
  try {
    const finRes = await polygonFetch(
      `/vX/reference/financials?ticker=${ticker}&timeframe=annual&order=desc&limit=1`,
      86_400,
    );
    if (finRes.ok) {
      const fin = await finRes.json();
      const eps =
        fin.results?.[0]?.financials?.income_statement?.basic_earnings_per_share?.value;
      if (eps && eps > 0) peRatio = parseFloat((currentPrice / eps).toFixed(2));
    }
  } catch {
    // silently ignored — P/E requires paid Polygon tier
  }

  return {
    ticker: ticker.toUpperCase(),
    name: info.name ?? ticker,
    currentPrice,
    priceChange30d: parseFloat(priceChange30d.toFixed(2)),
    high52w: parseFloat(high52w.toFixed(2)),
    low52w: parseFloat(low52w.toFixed(2)),
    avgVolume,
    peRatio,
    marketCap: info.market_cap ?? 0,
    sector: info.sic_description ?? 'Unknown',
  };
}
