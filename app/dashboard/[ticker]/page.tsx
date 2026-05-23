import ScenarioCard from '@/components/ScenarioCard';
import MacroPanel from '@/components/MacroPanel';
import SignalPanel from '@/components/SignalPanel';
import NewsPanel from '@/components/NewsPanel';
import StockChart from '@/components/StockChart';
import SearchBar from '@/components/SearchBar';
import { getBaseUrl } from '@/lib/base-url';
import type { MacroData, NewsHeadline, OHLCBar, ScenarioResponse, TickerDetails } from '@/lib/types';

interface Props {
  params: Promise<{ ticker: string }>;
}

async function fetchStock(ticker: string): Promise<{ ohlc: OHLCBar[]; details: TickerDetails }> {
  const res = await fetch(`${getBaseUrl()}/api/stock?ticker=${ticker}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error('Failed to fetch stock data');
  return res.json();
}

async function fetchScenarios(ticker: string): Promise<ScenarioResponse> {
  const res = await fetch(`${getBaseUrl()}/api/scenarios?ticker=${ticker}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

async function fetchMacro(): Promise<{ macro: MacroData }> {
  const res = await fetch(`${getBaseUrl()}/api/macro`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error('Failed to fetch macro data');
  return res.json();
}

async function fetchNews(ticker: string, companyName?: string): Promise<{ headlines: NewsHeadline[] }> {
  const base = getBaseUrl();
  const params = new URLSearchParams({ ticker });
  if (companyName) params.set('name', companyName);
  const res = await fetch(`${base}/api/news?${params}`, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error('Failed to fetch news');
  return res.json();
}

function formatPrice(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMarketCap(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const SECTOR_SIGNALS = [
  { label: 'SOX index',       value: '+1.8% week',       color: 'green'  as const },
  { label: 'TSMC guidance',   value: 'In-line',          color: 'amber'  as const },
  { label: 'Export controls', value: 'Elevated risk',    color: 'red'    as const },
  { label: 'AI capex cycle',  value: 'Accelerating',     color: 'green'  as const },
];

export default async function DashboardPage({ params }: Props) {
  const { ticker } = await params;
  const upper = ticker.toUpperCase();

  // Stock first — company name sharpens the news query
  const { ohlc, details } = await fetchStock(upper);

  // Scenarios fetches its own news internally and returns AI-labeled enrichedHeadlines.
  // fetchNews runs in parallel as a fallback if scenarios hasn't resolved yet.
  const [scenarioData, { macro }, { headlines: rawHeadlines }] = await Promise.all([
    fetchScenarios(upper),
    fetchMacro(),
    fetchNews(upper, details.name),
  ]);

  // Prefer AI-labeled headlines from the scenarios response; fall back to keyword-labeled
  const headlines = scenarioData.enrichedHeadlines ?? rawHeadlines;

  const priceUp = details.priceChange30d >= 0;

  // Stat card aggregates
  const allPriceLows  = scenarioData.scenarios.map((s) => s.priceLow);
  const allPriceHighs = scenarioData.scenarios.map((s) => s.priceHigh);
  const modelLow  = Math.min(...allPriceLows);
  const modelHigh = Math.max(...allPriceHighs);

  const { bullishSignals, bearishSignals, neutralSignals, confidenceScore } = scenarioData.signalSummary;
  const totalSignals = bullishSignals.length + bearishSignals.length + neutralSignals.length;

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      {/* Disclaimer */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center">
        <p className="text-amber-400 text-xs">
          AI-generated projections for educational purposes only. Not financial advice. Scenario probabilities are model estimates, not guarantees.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Search + timestamp row */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchBar initialValue={upper} />
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-sm shrink-0 bg-[#1c1c1e] border border-white/8 rounded-lg px-3 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Stock header */}
        <div>
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-white text-3xl font-bold tracking-tight">{upper}</h1>
            <span className="text-white text-3xl font-bold">${formatPrice(details.currentPrice)}</span>
            <span className={`text-base font-semibold ${priceUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {priceUp ? '▲' : '▼'} {Math.abs(details.priceChange30d).toFixed(1)}% 30d
            </span>
          </div>
          <p className="text-zinc-500 text-sm">
            {details.name} · {toTitleCase(details.sector)} · Last updated 2 min ago · {formatMarketCap(details.marketCap)} market cap
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">Scenario Confidence</p>
            <p className="text-white text-3xl font-bold mb-1">{confidenceScore}%</p>
            <p className="text-zinc-500 text-sm">
              {confidenceScore >= 70 ? 'High signal clarity' : confidenceScore >= 50 ? 'Moderate clarity' : 'Low signal clarity'}
            </p>
          </div>
          <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">Active Signals</p>
            <p className="text-white text-3xl font-bold mb-1">{totalSignals}</p>
            <p className="text-zinc-500 text-sm">
              {bullishSignals.length} bullish · {bearishSignals.length} bearish · {neutralSignals.length} neutral
            </p>
          </div>
          <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-semibold tracking-widest uppercase mb-2">30-Day Range (Model)</p>
            <p className="text-white text-3xl font-bold mb-1">
              ${modelLow.toLocaleString()}–${modelHigh.toLocaleString()}
            </p>
            <p className="text-zinc-500 text-sm">Across all scenarios</p>
          </div>
        </div>

        {/* Chart */}
        <StockChart ohlc={ohlc} scenarios={scenarioData.scenarios} currentPrice={details.currentPrice} ticker={upper} />

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

          {/* Left: Scenarios */}
          <div className="flex flex-col gap-4">
            <h2 className="text-zinc-400 text-xs font-semibold tracking-widest uppercase">Forward Scenarios</h2>
            {scenarioData.scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} ticker={upper} currentPrice={details.currentPrice} />
            ))}
          </div>

          {/* Right: Signals + News */}
          <div className="flex flex-col gap-4">
            <MacroPanel macro={macro} />
            <SignalPanel signals={SECTOR_SIGNALS} />
            <NewsPanel headlines={headlines} />
          </div>
        </div>
      </div>
    </div>
  );
}
