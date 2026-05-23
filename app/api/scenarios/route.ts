import { getNewsHeadlines } from '@/lib/news';
import { getOHLC, getTickerDetails } from '@/lib/polygon';
import { getMacroData } from '@/lib/fred';
import { generateScenarios } from '@/lib/scenarios';
import type { NewsHeadline } from '@/lib/types';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticker = searchParams.get('ticker')?.toUpperCase();

  if (!ticker) {
    return Response.json({ error: 'ticker is required' }, { status: 400 });
  }
  if (!/^[A-Z.]{1,10}$/.test(ticker)) {
    return Response.json({ error: 'invalid ticker' }, { status: 400 });
  }

  try {
    // OHLC + macro in parallel; details need OHLC first
    const [ohlcFull, macro] = await Promise.all([
      getOHLC(ticker, 365),
      getMacroData(),
    ]);

    const details = await getTickerDetails(ticker, ohlcFull);

    // News with company name for a tighter query
    const rawHeadlines = await getNewsHeadlines(ticker, details.name);

    // Generate scenarios + AI news labels in one Claude call
    const scenarioData = await generateScenarios(details, rawHeadlines, macro);

    // Merge Claude's impact labels back into the headline objects.
    // Use startsWith match because Claude sometimes truncates long headlines.
    const enrichedHeadlines: NewsHeadline[] = rawHeadlines.map((h) => {
      const aiLabel = scenarioData.newsImpacts?.find(
        (n) =>
          h.headline === n.headline ||
          h.headline.startsWith(n.headline.slice(0, 60)) ||
          n.headline.startsWith(h.headline.slice(0, 60)),
      );
      return aiLabel ? { ...h, impact: aiLabel.impact } : h;
    });

    return Response.json({ ...scenarioData, enrichedHeadlines });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
