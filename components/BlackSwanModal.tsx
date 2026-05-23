'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BlackSwanEvent, BlackSwanResponse, BlackSwanCategory } from '@/lib/types';

const CATEGORY_LABELS: Record<BlackSwanCategory, string> = {
  geopolitical:   'Geopolitical',
  climate:        'Climate / Physical',
  regulatory:     'Regulatory',
  contagion:      'Market Contagion',
  'supply-chain': 'Supply Chain',
  currency:       'Currency',
  technology:     'Tech Disruption',
  health:         'Health / Pandemic',
};

const CATEGORY_COLORS: Record<BlackSwanCategory, string> = {
  geopolitical:   'text-red-400 bg-red-400/10 border-red-400/20',
  climate:        'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  regulatory:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
  contagion:      'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'supply-chain': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  currency:       'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  technology:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  health:         'text-pink-400 bg-pink-400/10 border-pink-400/20',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300 leading-relaxed">
          <span className="text-zinc-600 mt-1 shrink-0">◆</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function EventCard({ event }: { event: BlackSwanEvent }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = CATEGORY_COLORS[event.category] ?? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';

  return (
    <div className="bg-[#141416] border border-white/8 rounded-xl overflow-hidden">
      {/* Summary row — always visible, clickable */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-5 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${colorClass}`}>
                {CATEGORY_LABELS[event.category]}
              </span>
              <span className="text-zinc-600 text-[10px]">Blind spot score: {event.outOfBoxScore}/100</span>
            </div>
            <p className="text-white text-sm font-semibold leading-snug">{event.title}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-red-400 text-xl font-bold">{event.dropPct}%</p>
            <p className="text-zinc-500 text-xs">${event.priceTarget.toFixed(0)} target</p>
            <p className="text-zinc-600 text-xs mt-1">{event.probability}% prob.</p>
          </div>
        </div>

        {/* Blind spot meter */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-zinc-600 text-xs w-28 shrink-0">Consensus blind spot</span>
          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-zinc-600 to-zinc-300" style={{ width: `${event.outOfBoxScore}%` }} />
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed">{event.description}</p>

        <p className="text-zinc-600 text-xs mt-3 flex items-center gap-1">
          {expanded ? '▲ collapse' : '▼ full analyst brief — revenue impact, price path, precedent, contagion, recovery'}
        </p>
      </button>

      {/* Full brief — expanded */}
      {expanded && (
        <div className="border-t border-white/8 px-5 py-5 space-y-5">

          {/* Chain + Why Now side by side on wide screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Section label="Chain of causation">
              <p className="text-zinc-300 text-sm leading-relaxed">{event.chainOfCausation}</p>
            </Section>
            <Section label="Why this risk is elevated right now">
              <p className="text-zinc-300 text-sm leading-relaxed">{event.whyNowRisk}</p>
            </Section>
          </div>

          <div className="h-px bg-white/5" />

          {/* Revenue impact */}
          <Section label="Revenue & margin impact">
            <p className="text-zinc-300 text-sm leading-relaxed">{event.affectedRevenue}</p>
          </Section>

          {/* Price pathology */}
          <Section label="How the selloff unfolds">
            <p className="text-zinc-300 text-sm leading-relaxed">{event.pricePathology}</p>
          </Section>

          <div className="h-px bg-white/5" />

          {/* Historical precedent */}
          <Section label="Closest historical precedent">
            <p className="text-zinc-300 text-sm leading-relaxed">{event.historicalPrecedent}</p>
          </Section>

          <div className="h-px bg-white/5" />

          {/* Contagion + Recovery side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Section label="Blast radius — other names at risk">
              <BulletList items={event.contagionTo} />
            </Section>
            <Section label="Recovery outlook (60–90 days post-event)">
              <p className="text-zinc-300 text-sm leading-relaxed">{event.recoveryOutlook}</p>
            </Section>
          </div>

          <div className="h-px bg-white/5" />

          {/* Trigger signals + Risk reducers side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Section label="Early-warning signals to watch">
              <BulletList items={event.triggerSignals} />
            </Section>
            <Section label="What would reduce this risk">
              <BulletList items={event.riskReducers} />
            </Section>
          </div>

        </div>
      )}
    </div>
  );
}

interface Props {
  ticker: string;
  currentPrice: number;
  onClose: () => void;
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
      setError('Failed to generate analysis. Try again.');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0f]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-zinc-400 text-xs font-semibold tracking-widest uppercase">Black Swan Deep-Dive</span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-400 text-xs">{ticker} @ ${currentPrice.toFixed(2)}</span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-600 text-xs">7 tail-risk scenarios the market isn&apos;t pricing in</span>
          </div>
          <h2 className="text-white text-xl font-bold mt-0.5">Non-consensus threats · Full analyst brief</h2>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-sm px-3 py-1.5 border border-white/8 rounded-lg hover:border-white/20 shrink-0"
        >
          ✕ Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-4xl mx-auto w-full space-y-4">

          {loading && (
            <div className="flex flex-col items-center justify-center h-72 gap-4">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm text-center">
                Running full tail-risk analysis across geopolitical, climate,<br />
                supply-chain, contagion, regulatory, and technology vectors…
              </p>
              <p className="text-zinc-600 text-xs">~10–15 seconds</p>
            </div>
          )}

          {error && <div className="text-center py-16 text-zinc-500">{error}</div>}

          {data && (
            <>
              <p className="text-zinc-600 text-xs pb-1">
                Ordered by (consensus blind spot × plausibility). Click any event to expand the full brief — revenue impact, price pathology, historical precedent, contagion map, recovery outlook, and risk-reduction signals.
              </p>
              {data.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
