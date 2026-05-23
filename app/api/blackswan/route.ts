import Anthropic from '@anthropic-ai/sdk';
import { getOHLC, getTickerDetails } from '@/lib/polygon';
import type { BlackSwanResponse } from '@/lib/types';
import type { NextRequest } from 'next/server';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a tail-risk analyst at a macro hedge fund. Your specialty is finding the non-consensus threats that consensus ignores entirely — the events that are physically and politically plausible but that no analyst on Wall Street is writing about.

Generate 7 black swan scenarios for a stock. For each, write a full analyst brief — not a bullet point, a genuine piece of research that someone could act on.

RANKING CRITERIA: Order by (outOfBoxScore × probability). Keep only scenarios that are BOTH genuinely non-obvious (score 70+) AND plausible (not science fiction). Cut anything that analysts are already writing about.

For each scenario, produce a COMPLETE brief:
- title: One punchy specific line. Named actors, named locations, named mechanisms. NOT "supply chain disruption" — "Shin-Etsu Naoetsu plant fire eliminates 40% of global wafer substrate supply"
- category: geopolitical | climate | regulatory | contagion | supply-chain | currency | technology | health
- probability: 1–12%. All 7 must sum to ≤ 50%
- priceTarget + dropPct: Reflect genuine panic, not a dip. Typically -20% to -45%
- description: 2-3 sentences on the event itself and WHY this company specifically is exposed
- chainOfCausation: "Event X → triggers Y → which forces Z → stock drops because W" — ONE sentence, complete causal chain
- triggerSignals: 3 specific, observable early-warning indicators to watch (not vague — name the data sources, news wires, satellite trackers, government filings)
- outOfBoxScore: 0–100 (80+ means essentially nobody is writing about this)
- whyNowRisk: 2-3 sentences on what current geopolitical, economic, or market conditions make this SPECIFICALLY more likely RIGHT NOW than 12 months ago
- affectedRevenue: 2-3 sentences on which revenue segments, customer verticals, or cost structures take the direct hit — use specific numbers where possible (e.g., "40% of revenue from China data center customers")
- pricePathology: How does the selloff unfold? Overnight gap-down on news? Slow multi-week bleed as guidance gets cut? Flash crash on algorithm-triggered selling? Where does it likely find a floor and why?
- historicalPrecedent: The closest historical analog for this type of event and what it did to this stock or a comparable company. Specific date, specific drop, specific recovery timeline.
- contagionTo: 3-5 other tickers or sectors that get caught in the blast radius and why — show cross-asset contagion chains
- recoveryOutlook: What does the stock do in the 60-90 days after the event? What would need to be true for a V-shaped recovery vs. a prolonged re-rating lower?
- riskReducers: 3 specific developments that would meaningfully lower this probability if they emerged in the news

Respond ONLY with a valid JSON object:
{
  "ticker": "string",
  "currentPrice": number,
  "events": [ ... all 7 events with ALL fields above ... ]
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

    const userPrompt = `Write the full tail-risk analyst brief for ${details.ticker} (${details.name}).

Current price: $${details.currentPrice}
52-week range: $${details.low52w} – $${details.high52w}
Sector: ${details.sector}
Market cap: $${(details.marketCap / 1e9).toFixed(1)}B

Before writing, think through these dimensions to find non-obvious angles:
SUPPLY CHAIN: What single factories, ports, or shipping lanes does this company depend on? Where are its contract manufacturers? What raw materials have single-country sourcing?
GEOGRAPHY: Where does revenue actually come from? Which countries? What are the diplomatic fault lines?
REGULATION: What non-US jurisdictions could impose surprise rules? What antitrust cases are pending globally? What data sovereignty laws could bite?
ADJACENT INDUSTRIES: If industry X collapsed, who gets forced to sell this stock? What credit facilities depend on related collateral?
PHYSICAL INFRASTRUCTURE: What buildings, cables, satellites, power grids, or water supplies are critical to this company's operations?
PEOPLE: Is there a key-person risk? A founder, regulator relationship, or technical lead whose departure would be catastrophic?
TECHNOLOGY: What technology breakthrough by a competitor or adjacent industry would make the core product less valuable?
CLIMATE/PHYSICAL: Are key facilities in flood zones, earthquake zones, wildfire corridors, or hurricane paths?

Generate the 7 most plausible-yet-overlooked events. Every field must be complete and specific.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const data = JSON.parse(cleaned) as BlackSwanResponse;

    data.events.sort((a, b) => (b.outOfBoxScore * b.probability) - (a.outOfBoxScore * a.probability));

    return Response.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
