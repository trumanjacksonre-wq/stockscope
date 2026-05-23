import type { Scenario } from '@/lib/types';

const SCENARIO_STYLES: Record<Scenario['id'], { badge: string; bar: string }> = {
  bull:       { badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', bar: 'bg-emerald-500' },
  base:       { badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',         bar: 'bg-blue-500' },
  bear:       { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',             bar: 'bg-red-500' },
  blackswan:  { badge: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',          bar: 'bg-zinc-500' },
};

const SCENARIO_LABELS: Record<Scenario['id'], string> = {
  bull: 'Bull case',
  base: 'Base case',
  bear: 'Bear case',
  blackswan: 'Black swan',
};

interface Props {
  scenario: Scenario;
}

export default function ScenarioCard({ scenario }: Props) {
  const styles = SCENARIO_STYLES[scenario.id];

  return (
    <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug">
          {SCENARIO_LABELS[scenario.id]} — {scenario.name}
        </h3>
        <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${styles.badge}`}>
          {scenario.probability}% probability
        </span>
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
    </div>
  );
}
