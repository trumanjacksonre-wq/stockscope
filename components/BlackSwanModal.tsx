'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BlackSwanEvent, BlackSwanResponse, BlackSwanCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<BlackSwanCategory, string> = {
  geopolitical:  'Geopolitical',
  climate:       'Climate / Physical',
  regulatory:    'Regulatory',
  contagion:     'Market Contagion',
  'supply-chain':'Supply Chain',
  currency:      'Currency',
  technology:    'Tech Disruption',
  health:        'Health / Pandemic',
};

const CATEGORY_COLORS: Record<BlackSwanCategory, string> = {
  geopolitical:  'text-red-400 bg-red-400/10 border-red-400/20',
  climate:       'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  regulatory:    'text-amber-400 bg-amber-400/10 border-amber-400/20',
  contagion:     'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'supply-chain':'text-orange-400 bg-orange-400/10 border-orange-400/20',
  currency:      'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  technology:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  health:        'text-pink-400 bg-pink-400/10 border-pink-400/20',
};

interface Props {
  ticker: string;
  currentPrice: number;
  onClose: () => void;
}

function OutOfBoxMeter({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-500 text-xs whitespace-nowrap">Consensus blind spot</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden" style={{ width: 64 }}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-zinc-500 to-zinc-300"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-zinc-400 text-xs font-mono">{score}</span>
    </div>
  );
}

function EventCard({ event, currentPrice }: { event: BlackSwanEvent; currentPrice: number }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = CATEGORY_COLORS[event.category] ?? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';

  return (
    <button
      onClick={() => setExpanded((e) => !e)}
      className="w-full text-left bg-[#1a1a1c] border border-white/8 rounded-xl p-5 hover:border-white/16 transition-colors"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border mb-2 ${colorClass}`}>
            {CATEGORY_LABELS[event.category]}
          </span>
          <p className="text-white text-sm font-semibold leading-snug">{event.title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-red-400 text-lg font-bold">{event.dropPct}%</p>
          <p className="text-zinc-500 text-xs">${event.priceTarget.toFixed(0)}</p>
        </div>
      </div>

      {/* Probability bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-zinc-600 rounded-full" style={{ width: `${Math.min(event.probability * 8, 100)}%` }} />
        </div>
        <span className="text-zinc-500 text-xs">{event.probability}% probability</span>
      </div>

      <OutOfBoxMeter score={event.outOfBoxScore} />

      {/* Description — always visible */}
      <p className="text-zinc-400 text-sm leading-relaxed mt-3">{event.description}</p>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/8 space-y-3 text-left">
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Chain of causation</p>
            <p className="text-zinc-300 text-sm leading-relaxed">{event.chainOfCausation}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-2">Watch for these signals</p>
            <ul className="space-y-1">
              {event.triggerSignals.map((sig, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                  <span className="text-zinc-600 mt-0.5 shrink-0">◆</span>
                  {sig}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <p className="text-zinc-600 text-xs mt-3">{expanded ? '▲ collapse' : '▼ chain of causation + signals'}</p>
    </button>
  );
}

export default function BlackSwanModal({ ticker, currentPrice, onClose }: Props) {
  const [data, setData] = useState<BlackSwanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/blackswan?ticker=${ticker}`);
      if (!res.ok) throw new Error('Failed to load');
      setData(await res.json());
    } catch {
      setError('Failed to generate scenarios. Try again.');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-400 text-xs font-semibold tracking-widest uppercase">Black Swan Analysis</span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-400 text-xs">{ticker} @ ${currentPrice.toFixed(2)}</span>
          </div>
          <h2 className="text-white text-xl font-bold mt-0.5">
            Tail risks nobody is pricing in
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-sm px-3 py-1.5 border border-white/8 rounded-lg hover:border-white/20"
        >
          ✕ Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">Running tail-risk analysis across geopolitical, climate,<br />supply-chain, and contagion vectors…</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-zinc-500">{error}</div>
        )}

        {data && (
          <div className="space-y-3">
            <p className="text-zinc-500 text-xs mb-5">
              Ordered by consensus blind spot × plausibility. Click any event to see the chain of causation and early-warning signals.
            </p>
            {data.events.map((event) => (
              <EventCard key={event.id} event={event} currentPrice={currentPrice} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
