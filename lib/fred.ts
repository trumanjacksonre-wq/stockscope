import type { MacroData } from './types';

const BASE = 'https://api.stlouisfed.org/fred/series/observations';

// Fetch recent observations newest-first, filter out missing "." values, return parsed numbers
async function observations(seriesId: string, limit: number, ttl = 3600): Promise<number[]> {
  const url =
    `${BASE}?series_id=${seriesId}` +
    `&api_key=${process.env.FRED_API_KEY}` +
    `&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: ttl } });
  if (!res.ok) throw new Error(`FRED ${seriesId} error: ${res.status}`);
  const json = await res.json();
  return (json.observations ?? [])
    .map((o: { value: string }) => o.value)
    .filter((v: string) => v !== '.')
    .map(parseFloat);
}

function first(obs: number[], fallback = 0): number {
  return obs[0] ?? fallback;
}

export async function getMacroData(): Promise<MacroData> {
  // Fetch in parallel. Daily series get extra observations to skip weekends/holidays.
  const [fedObs, cpiObs, treasuryObs, vixObs, usdObs] = await Promise.all([
    observations('FEDFUNDS', 3),      // monthly effective fed funds rate
    observations('CPIAUCSL', 14),     // monthly CPI index — need 13 to compute YoY
    observations('DGS10', 7),         // daily 10Y treasury; extra for weekends
    observations('VIXCLS', 7),        // daily CBOE VIX; extra for weekends
    observations('DTWEXBGS', 6),      // weekly broad USD index; 5 weeks for trend
  ]);

  const fedRate = parseFloat(first(fedObs).toFixed(2));

  // CPI YoY %: (latest - 12 months ago) / 12 months ago × 100
  // CPIAUCSL is monthly, so index 0 = latest, index 12 = one year ago
  const cpiLatest = first(cpiObs);
  const cpiYearAgo = cpiObs[12] ?? cpiObs[cpiObs.length - 1] ?? cpiLatest;
  const cpiYoY = cpiYearAgo > 0
    ? parseFloat(((cpiLatest - cpiYearAgo) / cpiYearAgo * 100).toFixed(2))
    : 0;
  // Month-over-month sign to show ↑/↓ arrow in the UI
  const cpiMoM = cpiObs.length > 1 ? cpiLatest - cpiObs[1] : 0;

  const treasury10y = parseFloat(first(treasuryObs).toFixed(2));
  const vix = parseFloat(first(vixObs).toFixed(1));

  // USD trend from broad trade-weighted index
  const usdLatest = first(usdObs);
  const usdPrev = usdObs[4] ?? usdObs[usdObs.length - 1] ?? usdLatest;
  const usdChangePct = usdPrev > 0 ? (usdLatest - usdPrev) / usdPrev * 100 : 0;
  let usdTrend: string;
  if (usdChangePct > 0.8)       usdTrend = 'Strengthening';
  else if (usdChangePct < -0.8) usdTrend = 'Weakening';
  else if (usdLatest > 108)     usdTrend = 'Strong';
  else if (usdLatest < 100)     usdTrend = 'Weak';
  else                           usdTrend = 'Neutral';

  return {
    fedRate,
    cpi: cpiYoY,
    cpiMoM,
    treasury10y,
    vix,
    usdTrend,
    usdIndex: parseFloat(usdLatest.toFixed(2)),
  };
}
