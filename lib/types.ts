export interface Scenario {
  id: 'bull' | 'base' | 'bear' | 'blackswan';
  name: string;
  probability: number;
  priceLow: number;
  priceHigh: number;
  priceTarget: number;
  timeframe: string;
  description: string;
  drivers: string[];
  keyRisk: string;
  triggerEvents: string[];
}

export interface SignalSummary {
  bullishSignals: string[];
  bearishSignals: string[];
  neutralSignals: string[];
  overallSentiment: 'bullish' | 'neutral' | 'bearish';
  confidenceScore: number;
}

export interface NewsImpact {
  headline: string;
  impact: 'bullish' | 'bearish' | 'neutral';
  reason: string;
}

export interface ScenarioResponse {
  ticker: string;
  currentPrice: number;
  generatedAt: string;
  scenarios: Scenario[];
  signalSummary: SignalSummary;
  newsImpacts?: NewsImpact[];
  enrichedHeadlines?: NewsHeadline[];
}

export interface OHLCBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MacroData {
  fedRate: number;
  cpi: number;
  cpiMoM: number;
  treasury10y: number;
  vix: number;
  usdTrend: string;
  usdIndex: number;
}

export interface NewsHeadline {
  source: string;
  headline: string;
  publishedAt: string;
  impact?: 'bullish' | 'bearish' | 'neutral';
}

export type BlackSwanCategory =
  | 'geopolitical'
  | 'climate'
  | 'regulatory'
  | 'contagion'
  | 'supply-chain'
  | 'currency'
  | 'technology'
  | 'health';

export interface BlackSwanEvent {
  id: string;
  title: string;
  category: BlackSwanCategory;
  probability: number;
  priceTarget: number;
  dropPct: number;
  description: string;
  chainOfCausation: string;
  triggerSignals: string[];
  outOfBoxScore: number; // 0–100: how non-consensus this is
}

export interface BlackSwanResponse {
  ticker: string;
  currentPrice: number;
  events: BlackSwanEvent[];
}

export interface TickerDetails {
  ticker: string;
  name: string;
  currentPrice: number;
  priceChange30d: number;
  high52w: number;
  low52w: number;
  avgVolume: number;
  peRatio: number | null;
  marketCap: number;
  sector: string;
}
