import type { NewsHeadline } from './types';

// ── Keyword-based impact heuristic ──────────────────────────────────────────
// The scenarios route (Step 5) can override these labels with Claude's analysis.

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
  'short', 'fraud', 'breach', 'hack', 'recall', 'delay', 'delays',
];

function classifyImpact(headline: string): NewsHeadline['impact'] {
  const lower = headline.toLowerCase();
  const bullScore = BULLISH_TERMS.filter((t) => lower.includes(t)).length;
  const bearScore = BEARISH_TERMS.filter((t) => lower.includes(t)).length;
  if (bullScore > bearScore) return 'bullish';
  if (bearScore > bullScore) return 'bearish';
  return 'neutral';
}

// ── NewsAPI fetcher ──────────────────────────────────────────────────────────

interface NewsAPIArticle {
  source: { name: string | null };
  title: string | null;
  publishedAt: string | null;
}

interface NewsAPIResponse {
  status: string;
  code?: string;
  message?: string;
  articles?: NewsAPIArticle[];
}

export async function getNewsHeadlines(
  ticker: string,
  companyName?: string,
): Promise<NewsHeadline[]> {
  const apiKey = process.env.NEWS_API_KEY;
  const from = new Date(Date.now() - 72 * 3_600_000).toISOString().slice(0, 19);

  // Build query: ticker always included; company name added if provided
  const q = companyName
    ? `"${ticker}" OR "${companyName}"`
    : ticker;

  const url =
    `https://newsapi.org/v2/everything` +
    `?q=${encodeURIComponent(q)}` +
    `&from=${from}` +
    `&sortBy=publishedAt` +
    `&pageSize=15` +
    `&language=en` +
    `&apiKey=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 900 } });

  // NewsAPI returns HTTP 200 even for errors — must check the body status
  const json: NewsAPIResponse = await res.json();
  if (json.status !== 'ok') {
    throw new Error(`NewsAPI error [${json.code ?? res.status}]: ${json.message ?? 'unknown'}`);
  }

  return (json.articles ?? [])
    .filter(
      (a) =>
        a.title &&
        a.title !== '[Removed]' &&
        !a.title.startsWith('[Removed]'),
    )
    .slice(0, 10)
    .map((a): NewsHeadline => ({
      source: a.source?.name ?? 'Unknown',
      headline: a.title!,
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      impact: classifyImpact(a.title!),
    }));
}
