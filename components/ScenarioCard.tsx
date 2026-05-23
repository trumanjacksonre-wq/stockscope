'use client';

import { useState } from 'react';
import type { Scenario } from '@/lib/types';
import BlackSwanModal from './BlackSwanModal';

const SCENARIO_STYLES: Record<Scenario['id'], { badge: string; bar: string }> = {
  bull:       { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', bar: 'bg-emerald-500' },
  base:       { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',         bar: 'bg-blue-500' },
  bear:       { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',             bar: 'bg-red-500' },
  blackswan:  { badge: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',          bar: 'bg-zinc-500' },
};

const SCENARIO_LABELS: Record<Scenario['id'], string> = {
  bull:       'Bull case',
  base:       'Base case',
  bear:       'Bear case',
  blackswan:  'Black swan',
};

interface Props {
  scenario: Scenario;
  ticker: string;
  currentPrice: number;
}

export default function ScenarioCard({ scenario, ticker, currentPrice }: Props) {
  const styles = SCENARIO_STYLES[scenario.id];
  const isBlackSwan = scenario.id === 'blackswan';
  const [showModal, setShowModal] = useState(false);

  const card = (
    <div
      className={`bg-[#1c1c1e] border border-white/8 rounded-xl p-5 flex flex-col gap-3 ${
        isBlackSwan ? 'cursor-pointer hover:border-zinc-500/50 transition-colors group' : ''
      }`}
      onClick={isBlackSwan ? () => setShowModal(true) : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug">
          {SCENARIO_LABELS[scenario.id]} — {scenario.name}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${styles.badge}`}>
            {scenario.probability}% probability
          </span>
          {isBlackSwan && (
            <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors text-xs">
              Explore →
            </span>
          )}
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
        <div
          className={`h-full rounded-full ${styles.bar}`}
          style={{ width: `${scenario.probability}%` }}
        />
      </div>

      {/* Key risk */}
      <p className="text-zinc-500 text-xs">
        <span className="text-zinc-400 font-medium">Key risk: </span>
        {scenario.keyRisk}
      </p>

      {isBlackSwan && (
        <p className="text-zinc-600 text-xs border-t border-white/5 pt-2">
          Click to explore 7 tail-risk scenarios the market isn&apos;t pricing in →
        </p>
      )}
    </div>
  );

  return (
    <>
      {card}
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
