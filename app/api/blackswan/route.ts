import Anthropic from '@anthropic-ai/sdk';
import { getOHLC, getTickerDetails } from '@/lib/polygon';
import type { BlackSwanResponse } from '@/lib/types';
import type { NextRequest } from 'next/server';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a tail-risk analyst at a macro hedge fund specializing in identifying non-consensus threats that the market is systematically ignoring.

Your job: generate 7 highly specific black swan scenarios for a given stock. These are NOT the scenarios analysts are already talking about.

Ranking criteria — order events by: (plausibility × severity). Keep only the 7 that score highest on BOTH being genuinely non-obvious AND being physically/economically possible within 90 days.

For each event you MUST:
- Give it a SPECIFIC, NAMED title (not "geopolitical risk" — something like "PLA exercises blockade TSMC shipping lane, fab output drops 60%")
- Draw from the full universe of forgotten risks: physical infrastructure failures, climate events at key supplier locations, diplomatic ruptures nobody is tracking, regulatory ambushes from non-US jurisdictions, cross-sector contagion chains (how does a crisis in an unrelated industry create forced selling of this stock?), currency dislocations in supplier/customer countries, single-point-of-failure supply chain nodes (one factory, one port, one person), health events, underwater geopolitical flashpoints
- Connect the event DIRECTLY to this ticker's revenue, suppliers, customers, or balance sheet with specificity
- Set priceTarget to reflect genuine panic: typically 20–45% below current price
- outOfBoxScore: 0–100 measuring how non-consensus this is (80+ means almost nobody is talking about it)

Respond ONLY with a valid JSON object matching this exact schema:
{
  "ticker": "string",
  "currentPrice": number,
  "events": [
    {
      "id": "unique-kebab-string",
      "title": "Specific named event in one punchy line",
      "category": "geopolitical|climate|regulatory|contagion|supply-chain|currency|technology|health",
      "probability": number (1–12, must sum to ≤50 across all 7),
      "priceTarget": number,
      "dropPct": number (negative, e.g. -32),
      "description": "2-3 sentences explaining exactly how this event hits THIS stock's specific revenue streams and customer base",
      "chainOfCausation": "One sentence: Event X → causes Y → which forces Z → stock drops because W",
      "triggerSignals": ["observable signal 1 to watch", "observable signal 2 to watch"],
      "outOfBoxScore": number (0-100)
    }
  ]
}`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ticker = searchParams.get('ticker')?.toUpperCase();

  if (!ticker || !/^[A-Z.]{1,10}$/.test(ticker)) {
    return Response.json({ error: 'invalid ticker' }, { status: 400 });
  }

  try {
    const ohlc = await getOHLC(ticker, 365);
    const details = await getTickerDetails(ticker, ohlc);

    const userPrompt = `Generate 7 black swan tail-risk scenarios for ${details.ticker} (${details.name}).

Current price: $${details.currentPrice}
52-week range: $${details.low52w} – $${details.high52w}
Sector: ${details.sector}
Market cap: $${(details.marketCap / 1e9).toFixed(1)}B

Think about:
- Where does this company's supply chain have single points of failure?
- Which geographies are critical to its revenue or manufacturing?
- What regulatory bodies outside the US could blindside it?
- What adjacent industry collapse could trigger forced selling?
- What physical infrastructure does it depend on?
- What currency risks are embedded in its cost structure?
- What technology breakthrough could make its core product obsolete?

Return the 7 most plausible-yet-overlooked events. Make them specific and named.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const data = JSON.parse(cleaned) as BlackSwanResponse;

    // Sort by outOfBoxScore * probability (plausible × non-obvious)
    data.events.sort((a, b) => (b.outOfBoxScore * b.probability) - (a.outOfBoxScore * a.probability));

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
