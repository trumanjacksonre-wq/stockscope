'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { UTCTimestamp } from 'lightweight-charts';
import type { OHLCBar, Scenario } from '@/lib/types';

const t = (n: number) => n as UTCTimestamp;

interface Props {
  ohlc: OHLCBar[];        // full-year daily bars from server
  scenarios: Scenario[];
  currentPrice: number;
  ticker: string;
}

type TimeRange = '5D' | '2D' | '6M' | '1Y';
type ChartMode = 'candlestick' | 'line';

const SCENARIO_COLORS: Record<string, string> = {
  bull:      '#22c55e',
  base:      '#3b82f6',
  bear:      '#ef4444',
  blackswan: '#71717a',
};

const RANGE_DAYS: Record<TimeRange, number> = { '5D': 5, '2D': 2, '6M': 180, '1Y': 365 };

export default function StockChart({ ohlc: dailyOhlc, scenarios, currentPrice, ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  const [mode, setMode]                   = useState<ChartMode>('candlestick');
  const [range, setRange]                 = useState<TimeRange>('6M');
  const [intradayOhlc, setIntradayOhlc]   = useState<OHLCBar[] | null>(null);
  const [intradayLoading, setIntradayLoading] = useState(false);
  const [intradayError, setIntradayError] = useState(false);

  // Fetch intraday data when switching to 5D / 2D
  useEffect(() => {
    if (range !== '5D' && range !== '2D') {
      setIntradayOhlc(null);
      setIntradayError(false);
      return;
    }
    setIntradayLoading(true);
    setIntradayError(false);
    const controller = new AbortController();

    fetch(`/api/ohlc?ticker=${ticker}&range=${range}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.ohlc?.length) {
          setIntradayOhlc(d.ohlc);
        } else {
          setIntradayError(true);
        }
      })
      .catch((e) => { if (e.name !== 'AbortError') setIntradayError(true); })
      .finally(() => setIntradayLoading(false));

    return () => controller.abort();
  }, [range, ticker]);

  // Bars to display — memoized so chart effect only re-runs when data actually changes
  const displayBars = useMemo<OHLCBar[]>(() => {
    if (range === '5D' || range === '2D') return intradayOhlc ?? [];
    const cutoff = Date.now() / 1000 - RANGE_DAYS[range] * 86400;
    const sliced = dailyOhlc.filter((b) => b.time >= cutoff);
    return sliced.length > 0 ? sliced : dailyOhlc;
  }, [range, dailyOhlc, intradayOhlc]);

  const showProjections = range === '6M' || range === '1Y';

  useEffect(() => {
    if (!containerRef.current || displayBars.length === 0) return;

    let disposed = false;

    import('lightweight-charts').then((lc) => {
      if (disposed || !containerRef.current) return;

      const { createChart, CrosshairMode, CandlestickSeries, LineSeries, createSeriesMarkers } = lc;

      const isIntraday = range === '5D' || range === '2D';

      const chart = createChart(containerRef.current!, {
        layout: { background: { color: '#111111' }, textColor: '#a1a1aa' },
        grid:   { vertLines: { color: '#ffffff0d' }, horzLines: { color: '#ffffff0d' } },
        crosshair:       { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#ffffff14' },
        timeScale: {
          borderColor:    '#ffffff14',
          timeVisible:    true,
          secondsVisible: false,
          rightOffset:    showProjections ? 8 : 2,
        },
        width:  containerRef.current!.clientWidth,
        height: 400,
      });

      chartRef.current = chart;

      const lastBar   = displayBars[displayBars.length - 1];
      const todayTime = lastBar.time;

      // ── Historical series ──────────────────────────────────────────────────
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
        mainSeries.setData(displayBars.map((b: OHLCBar) => ({ ...b, time: t(b.time) })));
      } else {
        mainSeries = chart.addSeries(LineSeries, {
          color: '#3b82f6', lineWidth: 2,
          priceLineVisible: false, lastValueVisible: true,
        });
        mainSeries.setData(displayBars.map((b: OHLCBar) => ({ time: t(b.time), value: b.close })));
      }

      createSeriesMarkers(mainSeries, [{
        time:     t(todayTime),
        position: 'belowBar',
        color:    '#ffffff60',
        shape:    'arrowUp',
        text:     isIntraday ? 'Now' : 'Today',
      }]);

      // ── Forward projection candlesticks (daily ranges only) ────────────────
      if (showProjections) {
        const PROJ_DAYS = 30;
        const day = 86400;

        scenarios.forEach((s) => {
          const hex = SCENARIO_COLORS[s.id] ?? '#71717a';

          type ProjCandle = {
            time: UTCTimestamp;
            open: number; high: number; low: number; close: number;
            color: string; borderColor: string; wickColor: string;
          };

          const candles: ProjCandle[] = [];
          let prevClose = currentPrice;

          for (let d = 1; d <= PROJ_DAYS; d++) {
            const ts  = todayTime + d * day;
            const dow = new Date(ts * 1000).getUTCDay();
            if (dow === 0 || dow === 6) continue; // skip weekends

            const prog     = d / PROJ_DAYS;
            const closeVal = currentPrice + (s.priceTarget - currentPrice) * prog;
            const highVal  = currentPrice + (s.priceHigh   - currentPrice) * prog;
            const lowVal   = currentPrice + (s.priceLow    - currentPrice) * prog;

            candles.push({
              time:        t(ts),
              open:        prevClose,
              close:       closeVal,
              high:        Math.max(prevClose, closeVal, highVal),
              low:         Math.min(prevClose, closeVal, lowVal),
              color:       `${hex}28`,   // semi-transparent body
              borderColor: `${hex}bb`,
              wickColor:   `${hex}bb`,
            });

            prevClose = closeVal;
          }

          const projSeries = chart.addSeries(CandlestickSeries, {
            upColor:          `${hex}28`,
            downColor:        `${hex}28`,
            borderUpColor:    `${hex}bb`,
            borderDownColor:  `${hex}bb`,
            wickUpColor:      `${hex}bb`,
            wickDownColor:    `${hex}bb`,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          projSeries.setData(candles);
        });
      }

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
  }, [displayBars, scenarios, currentPrice, mode, range, showProjections]);

  // Legend for projection candles
  const projLegend = showProjections ? (
    <div className="flex items-center gap-4">
      {scenarios.map((s) => {
        const hex = SCENARIO_COLORS[s.id] ?? '#71717a';
        const label = s.id === 'bull' ? 'Bull' : s.id === 'base' ? 'Base' : s.id === 'bear' ? 'Bear' : 'Black Swan';
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border" style={{ background: `${hex}28`, borderColor: `${hex}bb` }} />
            <span className="text-zinc-500 text-[10px]">{label}</span>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="bg-[#111111] border border-white/8 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-wrap gap-2">
        <div className="flex items-center gap-3">
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
          {projLegend}
        </div>
        <div className="flex gap-1">
          {(['5D', '2D', '6M', '1Y'] as TimeRange[]).map((r) => (
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

      {/* Loading */}
      {intradayLoading && (
        <div className="flex items-center justify-center h-[400px] gap-3">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm">Loading {range} data…</span>
        </div>
      )}

      {/* Intraday unavailable */}
      {!intradayLoading && intradayError && (
        <div className="flex flex-col items-center justify-center h-[400px] gap-2">
          <p className="text-zinc-500 text-sm">Intraday data unavailable for this ticker</p>
          <p className="text-zinc-600 text-xs">Try 6M or 1Y, or check your Polygon plan</p>
        </div>
      )}

      {/* Chart container */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ display: intradayLoading || intradayError ? 'none' : 'block' }}
      />
    </div>
  );
}
