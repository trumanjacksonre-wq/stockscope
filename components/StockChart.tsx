'use client';

import { useEffect, useRef, useState } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';
import type { OHLCBar, Scenario } from '@/lib/types';

// Polygon returns Unix seconds as plain numbers; lc requires the branded UTCTimestamp type
const t = (n: number) => n as UTCTimestamp;

interface Props {
  ohlc: OHLCBar[];
  scenarios: Scenario[];
  currentPrice: number;
}

type ChartMode = 'candlestick' | 'line';
type TimeRange = '3M' | '6M' | '1Y';

const SCENARIO_COLORS: Record<string, string> = {
  bull:      '#22c55e',
  base:      '#3b82f6',
  bear:      '#ef4444',
  blackswan: '#71717a',
};

const RANGE_DAYS: Record<TimeRange, number> = { '3M': 90, '6M': 180, '1Y': 365 };

export default function StockChart({ ohlc, scenarios, currentPrice }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode]       = useState<ChartMode>('candlestick');
  const [range, setRange]     = useState<TimeRange>('3M');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || ohlc.length === 0) return;

    let disposed = false;

    import('lightweight-charts').then((lc) => {
      if (disposed || !containerRef.current) return;

      const { createChart, CrosshairMode, LineStyle, CandlestickSeries, LineSeries, createSeriesMarkers } = lc;

      const chart = createChart(containerRef.current!, {
        layout: { background: { color: '#111111' }, textColor: '#a1a1aa' },
        grid:   { vertLines: { color: '#ffffff0d' }, horzLines: { color: '#ffffff0d' } },
        crosshair:       { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#ffffff14' },
        timeScale:       { borderColor: '#ffffff14', timeVisible: true, rightOffset: 5 },
        width:  containerRef.current!.clientWidth,
        height: 380,
      });

      chartRef.current = chart;

      // Slice OHLC to the selected time range
      const cutoff = Date.now() / 1000 - RANGE_DAYS[range] * 86400;
      const visibleOhlc = ohlc.filter((b) => b.time >= cutoff);
      const bars = visibleOhlc.length > 0 ? visibleOhlc : ohlc;

      const lastBar   = bars[bars.length - 1];
      const todayTime = lastBar.time;
      const day       = 86400;

      // ── Historical series ────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let mainSeries: any;

      if (mode === 'candlestick') {
        mainSeries = chart.addSeries(CandlestickSeries, {
          upColor:          '#22c55e',
          downColor:        '#ef4444',
          borderUpColor:    '#22c55e',
          borderDownColor:  '#ef4444',
          wickUpColor:      '#22c55e',
          wickDownColor:    '#ef4444',
          priceLineVisible: false,
        });
        mainSeries.setData(bars.map((b: OHLCBar) => ({ ...b, time: t(b.time) })));
      } else {
        mainSeries = chart.addSeries(LineSeries, {
          color: '#3b82f6', lineWidth: 2,
          priceLineVisible: false, lastValueVisible: true,
        });
        mainSeries.setData(bars.map((b: OHLCBar) => ({ time: t(b.time), value: b.close })));
      }

      // "Today" marker — v5 uses createSeriesMarkers plugin instead of series.setMarkers
      createSeriesMarkers(mainSeries, [{
        time:     t(todayTime),
        position: 'belowBar',
        color:    '#ffffff80',
        shape:    'arrowUp',
        text:     'Today',
      }]);

      // ── Forward projection lines + bands ────────────────────────────────────
      // Generate daily (trading-day) points so the time scale extends 30 days out.
      // Without intermediate points, fitContent() won't expand the visible range
      // past the last OHLC bar even though the endpoint timestamp is future-dated.
      const PROJ_DAYS = 30;

      function projectData(startVal: number, endVal: number) {
        const pts: { time: UTCTimestamp; value: number }[] = [];
        for (let d = 0; d <= PROJ_DAYS; d++) {
          const ts = todayTime + d * day;
          const dow = new Date(ts * 1000).getUTCDay();
          if (dow === 0 || dow === 6) continue; // skip weekends
          pts.push({ time: t(ts), value: startVal + (endVal - startVal) * (d / PROJ_DAYS) });
        }
        return pts;
      }

      scenarios.forEach((s) => {
        const color = SCENARIO_COLORS[s.id] ?? '#71717a';

        chart.addSeries(LineSeries, {
          color,
          lineWidth:              2,
          lineStyle:              LineStyle.Dashed,
          crosshairMarkerVisible: false,
          priceLineVisible:       false,
          lastValueVisible:       false,
        }).setData(projectData(currentPrice, s.priceTarget));

        chart.addSeries(LineSeries, {
          color: `${color}70`,
          lineWidth:              1,
          lineStyle:              LineStyle.Dotted,
          crosshairMarkerVisible: false,
          priceLineVisible:       false,
          lastValueVisible:       false,
        }).setData(projectData(currentPrice, s.priceHigh));

        chart.addSeries(LineSeries, {
          color: `${color}70`,
          lineWidth:              1,
          lineStyle:              LineStyle.Dotted,
          crosshairMarkerVisible: false,
          priceLineVisible:       false,
          lastValueVisible:       false,
        }).setData(projectData(currentPrice, s.priceLow));
      });

      // fitContent includes all series (historical + projections); rightOffset adds small buffer
      chart.timeScale().fitContent();

      const onResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    });

    return () => {
      disposed = true;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [ohlc, scenarios, currentPrice, mode, range]);

  return (
    <div className="bg-[#111111] border border-white/8 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex gap-1">
          {(['candlestick', 'line'] as ChartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === m ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m === 'candlestick' ? 'Candle' : 'Line'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['3M', '6M', '1Y'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === r ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
