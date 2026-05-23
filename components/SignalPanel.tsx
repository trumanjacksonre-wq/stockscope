type SignalColor = 'green' | 'amber' | 'red';

interface Signal {
  label: string;
  value: string;
  color: SignalColor;
}

interface Props {
  signals: Signal[];
}

function dot(color: SignalColor) {
  const cls = { green: 'bg-emerald-400', amber: 'bg-amber-400', red: 'bg-red-400' }[color];
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

export default function SignalPanel({ signals }: Props) {
  return (
    <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
      <h3 className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mb-3">Sector Signals</h3>
      {signals.map((s) => (
        <div key={s.label} className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0">
          <div className="flex items-center gap-2">
            {dot(s.color)}
            <span className="text-zinc-400 text-sm">{s.label}</span>
          </div>
          <span className="text-white text-sm font-medium">{s.value}</span>
        </div>
      ))}
    </div>
  );
}
