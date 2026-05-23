import type { MacroData } from '@/lib/types';

type SignalColor = 'green' | 'amber' | 'red';

function Dot({ color }: { color: SignalColor }) {
  const cls = { green: 'bg-emerald-400', amber: 'bg-amber-400', red: 'bg-red-400' }[color];
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

function Row({ label, value, color }: { label: string; value: string; color: SignalColor }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        <Dot color={color} />
        <span className="text-zinc-400 text-sm">{label}</span>
      </div>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  );
}

function rateColor(rate: number): SignalColor {
  if (rate <= 2.5) return 'green';
  if (rate <= 4.5) return 'amber';
  return 'red';
}

function cpiColor(cpi: number): SignalColor {
  if (cpi <= 2.5) return 'green';
  if (cpi <= 3.5) return 'amber';
  return 'red';
}

function yieldColor(y: number): SignalColor {
  if (y < 3.5) return 'green';
  if (y < 4.5) return 'amber';
  return 'red';
}

function vixColor(vix: number): SignalColor {
  if (vix < 18) return 'green';
  if (vix < 28) return 'amber';
  return 'red';
}

function usdColor(trend: string): SignalColor {
  if (trend === 'Weakening' || trend === 'Weak') return 'green';
  if (trend === 'Neutral') return 'amber';
  return 'red';
}

interface Props {
  macro: MacroData;
}

export default function MacroPanel({ macro }: Props) {
  const cpiArrow = macro.cpiMoM >= 0 ? '↑' : '↓';
  const vixLabel = macro.vix < 18 ? 'low' : macro.vix < 28 ? 'mid' : 'high';
  const usdValue = macro.usdIndex > 0
    ? `${macro.usdTrend} (${macro.usdIndex})`
    : macro.usdTrend;

  return (
    <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
      <h3 className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mb-3">
        Macro Signals
      </h3>
      <Row
        label="Fed rate"
        value={`${macro.fedRate}% — Hold`}
        color={rateColor(macro.fedRate)}
      />
      <Row
        label="CPI trend"
        value={`${macro.cpi}% ${cpiArrow}`}
        color={cpiColor(macro.cpi)}
      />
      <Row
        label="10Y treasury"
        value={`${macro.treasury10y}%`}
        color={yieldColor(macro.treasury10y)}
      />
      <Row
        label="USD index"
        value={usdValue}
        color={usdColor(macro.usdTrend)}
      />
      <Row
        label="VIX"
        value={macro.vix > 0 ? `${macro.vix} (${vixLabel})` : 'N/A'}
        color={vixColor(macro.vix)}
      />
    </div>
  );
}
