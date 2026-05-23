'use client';

import { useState } from 'react';
import type { Scenario } from '@/lib/types';
import BlackSwanModal from './BlackSwanModal';

const SCENARIO_STYLES: Record<Scenario['id'], { badge: string; bar: string; accent: string }> = {
  bull:      { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', bar: 'bg-emerald-500', accent: 'text-emerald-400' },
  base:      { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',         bar: 'bg-blue-500',    accent: 'text-blue-400'    },
  bear:      { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',             bar: 'bg-red-500',     accent: 'text-red-400'     },
  blackswan: { badge: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',          bar: 'bg-zinc-500',    accent: 'text-zinc-400'    },
};

const SCENARIO_LABELS: Record<Scenario['id'], string> = {
  bull:      'Bull case',
  base:      'Base case',
  bear:      'Bear case',
  blackswan: 'Black swan',
};

interface Props {
  scenario: Scenario;
  ticker: string;
  currentPrice: number;
}

export default function ScenarioCard({ scenario, ticker, currentPrice }: Props) {
  const styles = SCENARIO_STYLES[scenario.id];
  const isBlackSwan = scenario.id === 'blackswan';
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (isBlackSwan) {
      setShowModal(true);
    } else {
      setExpanded((e) => !e);
    }
  };

  const upside = scenario.priceTarget > currentPrice
    ? `+${(((scenario.priceTarget - currentPrice) / currentPrice) * 100).toFixed(1)}%`
    : `${(((scenario.priceTarget - currentPrice) / currentPrice) * 100).toFixed(1)}%`;

  return (
    <>
      <div
        className="bg-[#1c1c1e] border border-white/8 rounded-xl overflow-hidden cursor-pointer hover:border-white/20 transition-colors group"
        onClick={handleClick}
      >
        {/* Summary row — always visible */}
        <div className="p-5 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-white font-semibold text-sm leading-snug">
              {SCENARIO_LABELS[scenario.id]} — {scenario.name}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${styles.badge}`}>
                {scenario.probability}% probability
              </span>
              <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs">
                {isBlackSwan ? 'Explore →' : (expanded ? '▲' : '▼')}
              </span>
            </div>
          </div>

          {/* Price range */}
          <p className="text-white text-xl font-bold tracking-tight">
            ${scenario.priceLow.toLocaleString()} – ${scenario.priceHigh.toLocaleString()}
          </p>

          {/* Description */}
          <p className="text-zinc-400 text-sm leading-relaxed">{scenario.description}</p>

          {/* Driver tags */}
          <div className="flex flex-wrap gap-1.5">
            {scenario.drivers.map((d) => (
              <span key={d} className="bg-white/5 border border-white/8 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                {d}
              </span>
            ))}
          </div>

          {/* Probability bar */}
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${scenario.probability}%` }} />
          </div>

          {/* Key risk */}
          <p className="text-zinc-500 text-xs">
            <span className="text-zinc-400 font-medium">Key risk: </span>
            {scenario.keyRisk}
          </p>

          {isBlackSwan && (
            <p className="text-zinc-600 text-xs border-t border-white/5 pt-2">
              Click to explore 5 tail-risk scenarios the market isn&apos;t pricing in →
            </p>
          )}
        </div>

        {/* Expanded brief — non-black-swan cards */}
        {!isBlackSwan && expanded && (
          <div className="border-t border-white/8 px-5 py-5 space-y-5">

            {/* Price target + timeframe */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Price target</p>
                <p className={`text-2xl font-bold ${styles.accent}`}>${scenario.priceTarget.toLocaleString()}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{upside} from current</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Timeframe</p>
                <p className="text-white text-lg font-semibold">{scenario.timeframe}</p>
                <p className="text-zinc-500 text-xs mt-0.5">Expected to resolve</p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Trigger events */}
            <div>
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-3">
                What triggers this scenario
              </p>
              <ul className="space-y-2">
                {scenario.triggerEvents.map((event, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed">
                    <span className={`shrink-0 mt-1 text-[10px] font-bold ${styles.accent}`}>0{i + 1}</span>
                    {event}
                  </li>
                ))}
              </ul>
            </div>

            <div className="h-px bg-white/5" />

            {/* Key risk callout */}
            <div className="bg-white/3 border border-white/6 rounded-lg px-4 py-3">
              <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-1">Primary risk to this view</p>
              <p className="text-zinc-300 text-sm leading-relaxed">{scenario.keyRisk}</p>
            </div>

          </div>
        )}
      </div>

      {showModal && (
        <BlackSwanModal
          ticker={ticker}
          currentPrice={currentPrice}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
