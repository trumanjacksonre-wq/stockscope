import Anthropic from '@anthropic-ai/sdk';
import { getOHLC, getTickerDetails } from '@/lib/polygon';
import type { BlackSwanResponse } from '@/lib/types';
import type { NextRequest } from 'next/server';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a tail-risk analyst at a macro hedge fund specializing in non-consensus threats the market systematically ignores.

Generate exactly 5 black swan scenarios. Order by (outOfBoxScore × probability) — most plausible-yet-overlooked first. Cut anything analysts are already writing about.

EVERY field is required. Be specific: named actors, locations, mechanisms. No vague categories.

Respond ONLY with this exact JSON (no markdown, no preamble):
{
  "ticker": "string",
  "currentPrice": number,
  "events": [
    {
      "id": "kebab-slug",
      "title": "One specific punchy line — named actors and mechanisms",
      "category": "geopolitical|climate|regulatory|contagion|supply-chain|currency|technology|health",
      "probability": number,
      "priceTarget": number,
      "dropPct": number,
      "outOfBoxScore": number,
      "description": "2-3 sentences: what happens and why THIS company is specifically exposed",
      "chainOfCausation": "Single sentence: Event X → triggers Y → forces Z → stock drops because W",
      "whyNowRisk": "2-3 sentences: what current conditions make this MORE likely now than 12 months ago",
      "affectedRevenue": "2-3 sentences: which revenue segments take the direct hit, with specific %s where possible",
      "pricePathology": "2-3 sentences: gap-down? slow bleed? flash crash? where does it find a floor and why?",
      "historicalPrecedent": "2-3 sentences: closest analog, specific date, actual drop %, recovery timeline",
      "contagionTo": ["ticker or sector + one-line reason", "ticker or sector + one-line reason", "ticker or sector + one-line reason"],
      "recoveryOutlook": "2-3 sentences: 60-90 day post-event scenario, V-recovery vs prolonged re-rating conditions",
      "triggerSignals": ["specific observable signal 1", "specific observable signal 2", "specific observable signal 3"],
      "riskReducers": ["specific development that lowers probability 1", "specific development 2", "specific development 3"]
    }
  ]
}

Constraints:
- All 5 probabilities must sum to ≤ 45%
- priceTarget must reflect genuine panic: -20% to -45% from current
- outOfBoxScore 70–100 (if analysts are writing about it, cut it)`;

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

Generate the 5 most plausible-yet-overlooked events. Every field must be complete and specific. Return only raw JSON — no markdown fences, no preamble, no trailing text.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
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
