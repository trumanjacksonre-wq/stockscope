import type { NewsHeadline } from '@/lib/types';

const IMPACT_STYLES = {
  bullish: {
    icon: '▲',
    label: 'Bullish',
    cls: 'text-emerald-400',
  },
  bearish: {
    icon: '▼',
    label: 'Bearish',
    cls: 'text-red-400',
  },
  neutral: {
    icon: '◆',
    label: 'Neutral',
    cls: 'text-zinc-400',
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  headlines: NewsHeadline[];
}

export default function NewsPanel({ headlines }: Props) {
  return (
    <div className="bg-[#1c1c1e] border border-white/8 rounded-xl p-5">
      <h3 className="text-zinc-400 text-xs font-semibold tracking-widest uppercase mb-3">Latest News Impact</h3>
      <div className="flex flex-col gap-4">
        {headlines.slice(0, 5).map((item, i) => {
          const impact = item.impact ?? 'neutral';
          const style = IMPACT_STYLES[impact];
          return (
            <div key={i} className="border-b border-white/5 last:border-0 pb-4 last:pb-0">
              <p className="text-zinc-500 text-xs mb-1">
                {item.source} · {timeAgo(item.publishedAt)}
              </p>
              <p className="text-white text-sm font-medium leading-snug mb-1.5">{item.headline}</p>
              <p className={`text-xs font-medium ${style.cls}`}>
                {style.icon} {style.label}
                {impact !== 'neutral' && ' — '}
                {impact === 'bullish' && 'supports bull scenario'}
                {impact === 'bearish' && 'elevates bear scenario risk'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
