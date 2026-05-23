import Anthropic from '@anthropic-ai/sdk';
import type { MacroData, NewsHeadline, ScenarioResponse, TickerDetails } from './types';

const client = new Anthropic();

// ── System prompt (static — cached after first call) ─────────────────────────
// Includes the full JSON schema so Claude has a precise target for all 4
// scenarios and the newsImpacts array. Kept here so the cache_control block
// covers the entire static portion of the request.

const SYSTEM_PROMPT = `You are a professional equity research analyst and scenario planning expert at a top hedge fund.

Your job: given current market data, recent news, and macroeconomic conditions, generate exactly 4 forward-looking price scenarios for a stock over the next 30 days.

Rules:
- Be precise and data-driven. Reference specific price levels, named catalysts, and real current events from the data provided.
- Never write generic market commentary. Every sentence must be specific to this ticker and the data given.
- Be contrarian where the data supports it.
- Probabilities for all 4 scenarios must sum to exactly 100.
- Discard any news headlines that are clearly unrelated to the ticker before analysis.
- Respond with ONLY a valid JSON object — no preamble, no markdown fences, no explanation.

JSON schema you must return (all fields required for every scenario):

{
  "ticker": "string",
  "currentPrice": number,
  "generatedAt": "ISO 8601 timestamp",
  "scenarios": [
    {
      "id": "bull",
      "name": "5-word-max descriptive label",
      "probability": number,
      "priceLow": number,
      "priceHigh": number,
      "priceTarget": number,
      "timeframe": "30 days",
      "description": "2-3 sentences, analyst quality, specific to current events",
      "drivers": ["driver 1", "driver 2", "driver 3"],
      "keyRisk": "The single thing most likely to invalidate this scenario",
      "triggerEvents": ["specific event 1", "specific event 2"]
    },
    {
      "id": "base",
      "name": "5-word-max descriptive label",
      "probability": number,
      "priceLow": number,
      "priceHigh": number,
      "priceTarget": number,
      "timeframe": "30 days",
      "description": "2-3 sentences, analyst quality, specific to current events",
      "drivers": ["driver 1", "driver 2", "driver 3"],
      "keyRisk": "The single thing most likely to invalidate this scenario",
      "triggerEvents": ["specific event 1", "specific event 2"]
    },
    {
      "id": "bear",
      "name": "5-word-max descriptive label",
      "probability": number,
      "priceLow": number,
      "priceHigh": number,
      "priceTarget": number,
      "timeframe": "30 days",
      "description": "2-3 sentences, analyst quality, specific to current events",
      "drivers": ["driver 1", "driver 2", "driver 3"],
      "keyRisk": "The single thing most likely to invalidate this scenario",
      "triggerEvents": ["specific event 1", "specific event 2"]
    },
    {
      "id": "blackswan",
      "name": "5-word-max descriptive label",
      "probability": number,
      "priceLow": number,
      "priceHigh": number,
      "priceTarget": number,
      "timeframe": "30 days",
      "description": "2-3 sentences, analyst quality, specific to current events",
      "drivers": ["driver 1", "driver 2", "driver 3"],
      "keyRisk": "The single thing most likely to invalidate this scenario",
      "triggerEvents": ["specific event 1", "specific event 2"]
    }
  ],
  "signalSummary": {
    "bullishSignals": ["signal 1", "signal 2"],
    "bearishSignals": ["signal 1", "signal 2"],
    "neutralSignals": ["signal 1"],
    "overallSentiment": "bullish | neutral | bearish",
    "confidenceScore": number
  },
  "newsImpacts": [
    {
      "headline": "exact headline string as provided",
      "impact": "bullish | bearish | neutral",
      "reason": "one sentence explaining relevance to this ticker"
    }
  ]
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function validate(data: ScenarioResponse): void {
  if (!Array.isArray(data.scenarios) || data.scenarios.length !== 4) {
    throw new Error('Expected exactly 4 scenarios');
  }
  const sum = data.scenarios.reduce((s, sc) => s + sc.probability, 0);
  if (Math.abs(sum - 100) > 1) {
    throw new Error(`Probabilities sum to ${sum}, expected 100`);
  }
  // Normalize confidenceScore to 0–100 if model returned 0–1
  const cs = data.signalSummary.confidenceScore;
  if (cs > 0 && cs <= 1) {
    data.signalSummary.confidenceScore = Math.round(cs * 100);
  }
}

function buildUserPrompt(
  details: TickerDetails,
  news: NewsHeadline[],
  macro: MacroData,
  competitorNotes: string,
  sectorPerf: number,
): string {
  const avgVolFormatted = details.avgVolume >= 1e6
    ? `${(details.avgVolume / 1e6).toFixed(1)}M`
    : details.avgVolume.toLocaleString();

  return `Analyze ${details.ticker} (${details.name}) and generate the 4 scenarios.

CURRENT STOCK DATA:
- Ticker: ${details.ticker}
- Company: ${details.name}
- Current price: $${details.currentPrice}
- 30-day price change: ${details.priceChange30d}%
- 52-week range: $${details.low52w} – $${details.high52w}
- Average daily volume: ${avgVolFormatted}
- P/E ratio: ${details.peRatio ?? 'N/A'}
- Market cap: ${formatMarketCap(details.marketCap)}
- Sector: ${details.sector}

RECENT NEWS HEADLINES (last 72 hours — discard unrelated ones):
${news.map((h, i) => `${i + 1}. [${h.source}] ${h.headline}`).join('\n')}

MACRO CONDITIONS:
- Fed funds rate: ${macro.fedRate}%
- CPI YoY: ${macro.cpi}% (${macro.cpiMoM >= 0 ? 'rising' : 'falling'} MoM)
- 10Y treasury: ${macro.treasury10y}%
- VIX: ${macro.vix}
- USD index: ${macro.usdTrend} (${macro.usdIndex})

SECTOR CONDITIONS:
- Sector 30d performance: ${sectorPerf}%
- Key competitor moves: ${competitorNotes}

Return the JSON object now.`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateScenarios(
  details: TickerDetails,
  news: NewsHeadline[],
  macro: MacroData,
  competitorNotes = 'No notable competitor moves in the last 72 hours.',
  sectorPerf = 0,
): Promise<ScenarioResponse> {
  const userPrompt = buildUserPrompt(details, news, macro, competitorNotes, sectorPerf);

  async function attempt(): Promise<ScenarioResponse> {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 3000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Cache the static system prompt + schema — saves ~800 tokens per call
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const data = JSON.parse(stripFences(text)) as ScenarioResponse;
    validate(data);
    return data;
  }

  try {
    return await attempt();
  } catch (err) {
    // Only retry on JSON parse / validation failures, not API errors
    if (err instanceof SyntaxError || (err instanceof Error && err.message.startsWith('Expected'))) {
      return await attempt();
    }
    throw err;
  }
}
