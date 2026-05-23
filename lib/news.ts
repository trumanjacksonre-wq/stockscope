import type { NewsHeadline } from './types';

const BULLISH_TERMS = [
  'beat', 'beats', 'surge', 'surges', 'rally', 'rallies', 'jump', 'jumps',
  'gain', 'gains', 'upgrade', 'upgraded', 'outperform', 'record high', 'record revenue',
  'breakthrough', 'partnership', 'acquisition', 'approved', 'approval', 'launch',
  'buyback', 'dividend', 'expansion', 'win', 'wins', 'deal', 'growth',
];

const BEARISH_TERMS = [
  'miss', 'misses', 'decline', 'declines', 'fall', 'falls', 'drop', 'drops',
  'downgrade', 'downgraded', 'underperform', 'layoff', 'layoffs', 'cut', 'cuts',
  'investigation', 'lawsuit', 'recall', 'tariff', 'ban', 'banned', 'probe',
  'warning', 'warn', 'concern', 'risk', 'loss', 'losses', 'fine', 'penalty',
  'short', 'fraud', 'breach', 'hack', 'delay', 'delays',
];

function classifyImpact(headline: string): NewsHeadline['impact'] {
  const lower = headline.toLowerCase();
  const bullScore = BULLISH_TERMS.filter((t) => lower.includes(t)).length;
  const bearScore = BEARISH_TERMS.filter((t) => lower.includes(t)).length;
  if (bullScore > bearScore) return 'bullish';
  if (bearScore > bullScore) return 'bearish';
  return 'neutral';
}

interface PolygonArticle {
  title: string;
  published_utc: string;
  publisher: { name: string };
}

interface PolygonNewsResponse {
  results?: PolygonArticle[];
  status: string;
}

export async function getNewsHeadlines(
  ticker: string,
): Promise<NewsHeadline[]> {
  const url =
    `https://api.polygon.io/v2/reference/news` +
    `?ticker=${encodeURIComponent(ticker)}` +
    `&order=desc` +
    `&limit=10` +
    `&sort=published_utc` +
    `&apiKey=${process.env.POLYGON_API_KEY}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Polygon news ${res.status}: ${ticker}`);

  const json: PolygonNewsResponse = await res.json();

  return (json.results ?? []).map((a): NewsHeadline => ({
    source: a.publisher?.name ?? 'Unknown',
    headline: a.title,
    publishedAt: a.published_utc,
    impact: classifyImpact(a.title),
  }));
}
