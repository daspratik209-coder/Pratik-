import React, { useState, useMemo, useRef } from 'react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';
import { calculateEMA, calculateVWAP, calculateRSI, calculateSupertrend } from '../utils/indicators';
import { Layers, Eye, EyeOff, Maximize2, BarChart2 } from 'lucide-react';

export const ChartSection: React.FC = () => {
  const {
    candles,
    selectedInstrument,
    currentPrice,
    priceChange,
    priceChangePercent,
    timeframe,
    setTimeframe,
    signal,
    openPositions,
  } = useTrading();

  const cfg = INSTRUMENTS[selectedInstrument];

  // Indicator Visibility Toggles
  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showSupertrend, setShowSupertrend] = useState(true);
  const [showRsi, setShowRsi] = useState(true);
  const [showTradeLevels, setShowTradeLevels] = useState(true);

  // Hover Crosshair State
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Indicators calculations memoized
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const ema9 = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21 = useMemo(() => calculateEMA(closes, 21), [closes]);
  const vwap = useMemo(() => calculateVWAP(candles), [candles]);
  const rsi = useMemo(() => calculateRSI(candles, 14), [candles]);
  const supertrend = useMemo(() => calculateSupertrend(candles, 10, 3), [candles]);

  // Display slice (last 60 candles)
  const displayCount = 60;
  const visibleCandles = useMemo(
    () => candles.slice(-displayCount),
    [candles, displayCount]
  );
  const visibleStartIndex = Math.max(0, candles.length - displayCount);

  // Scales
  const minPrice = useMemo(() => {
    if (visibleCandles.length === 0) return 0;
    const lows = visibleCandles.map((c) => c.low);
    return Math.min(...lows);
  }, [visibleCandles]);

  const maxPrice = useMemo(() => {
    if (visibleCandles.length === 0) return 100;
    const highs = visibleCandles.map((c) => c.high);
    return Math.max(...highs);
  }, [visibleCandles]);

  const pricePadding = (maxPrice - minPrice) * 0.08 || 10;
  const scaledMin = minPrice - pricePadding;
  const scaledMax = maxPrice + pricePadding;
  const priceRange = scaledMax - scaledMin || 1;

  // Chart dimensions in SVG viewBox coordinate space
  const svgWidth = 900;
  const mainChartHeight = 320;
  const rsiHeight = showRsi ? 90 : 0;
  const totalSvgHeight = mainChartHeight + (showRsi ? rsiHeight + 20 : 0);

  const candleSpacing = svgWidth / (visibleCandles.length || 1);
  const candleBodyWidth = Math.max(candleSpacing * 0.65, 3);

  const getY = (price: number) => {
    return mainChartHeight - ((price - scaledMin) / priceRange) * (mainChartHeight - 30) - 15;
  };

  const getRsiY = (rsiVal: number) => {
    const topY = mainChartHeight + 20;
    return topY + rsiHeight - (rsiVal / 100) * rsiHeight;
  };

  // Build SVG path strings for indicators
  const ema9Path = useMemo(() => {
    return visibleCandles
      .map((_, i) => {
        const fullIdx = visibleStartIndex + i;
        const val = ema9[fullIdx];
        if (!val) return '';
        const x = i * candleSpacing + candleSpacing / 2;
        const y = getY(val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, ema9, visibleStartIndex, candleSpacing, scaledMin, priceRange]);

  const ema21Path = useMemo(() => {
    return visibleCandles
      .map((_, i) => {
        const fullIdx = visibleStartIndex + i;
        const val = ema21[fullIdx];
        if (!val) return '';
        const x = i * candleSpacing + candleSpacing / 2;
        const y = getY(val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, ema21, visibleStartIndex, candleSpacing, scaledMin, priceRange]);

  const vwapPath = useMemo(() => {
    return visibleCandles
      .map((_, i) => {
        const fullIdx = visibleStartIndex + i;
        const val = vwap[fullIdx];
        if (!val) return '';
        const x = i * candleSpacing + candleSpacing / 2;
        const y = getY(val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, vwap, visibleStartIndex, candleSpacing, scaledMin, priceRange]);

  const rsiPath = useMemo(() => {
    if (!showRsi) return '';
    return visibleCandles
      .map((_, i) => {
        const fullIdx = visibleStartIndex + i;
        const val = rsi[fullIdx] ?? 50;
        const x = i * candleSpacing + candleSpacing / 2;
        const y = getRsiY(val);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [visibleCandles, rsi, showRsi, visibleStartIndex, candleSpacing]);

  // Active hover candle info
  const activeCandle =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleCandles.length
      ? visibleCandles[hoverIndex]
      : visibleCandles[visibleCandles.length - 1];

  const activeEma9 = hoverIndex !== null ? ema9[visibleStartIndex + hoverIndex] : ema9[ema9.length - 1];
  const activeEma21 = hoverIndex !== null ? ema21[visibleStartIndex + hoverIndex] : ema21[ema21.length - 1];
  const activeVwap = hoverIndex !== null ? vwap[visibleStartIndex + hoverIndex] : vwap[vwap.length - 1];
  const activeRsi = hoverIndex !== null ? rsi[visibleStartIndex + hoverIndex] : rsi[rsi.length - 1];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartContainerRef.current) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = clientX / rect.width;
    const idx = Math.floor(ratio * visibleCandles.length);
    if (idx >= 0 && idx < visibleCandles.length) {
      setHoverIndex(idx);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col">
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        {/* Symbol & Active Price Readout */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-slate-100">{cfg.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-800 text-slate-300">
                {cfg.category}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-mono tracking-tight text-white">
                {cfg.currency}
                {currentPrice.toFixed(2)}
              </span>
              <span
                className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                  priceChange >= 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {priceChange >= 0 ? '+' : ''}
                {priceChange.toFixed(2)} ({priceChangePercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* OHLC Bar Readout for active candle */}
        {activeCandle && (
          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60 text-slate-300">
            <span>O: <strong className="text-slate-100">{activeCandle.open}</strong></span>
            <span>H: <strong className="text-emerald-400">{activeCandle.high}</strong></span>
            <span>L: <strong className="text-rose-400">{activeCandle.low}</strong></span>
            <span>C: <strong className="text-cyan-300">{activeCandle.close}</strong></span>
            <span>Vol: <strong className="text-slate-400">{activeCandle.volume.toLocaleString()}</strong></span>
          </div>
        )}

        {/* Timeframe selector & Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold">
            {[1, 3, 5, 15].map((tf) => (
              <button
                key={tf}
                id={`tf-btn-${tf}m`}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md transition ${
                  timeframe === tf
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}m
              </button>
            ))}
          </div>

          {/* Indicator toggles dropdown / pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEma9(!showEma9)}
              className={`px-2 py-1 text-[11px] font-mono font-medium rounded border transition ${
                showEma9
                  ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              EMA 9
            </button>
            <button
              onClick={() => setShowEma21(!showEma21)}
              className={`px-2 py-1 text-[11px] font-mono font-medium rounded border transition ${
                showEma21
                  ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              EMA 21
            </button>
            <button
              onClick={() => setShowVwap(!showVwap)}
              className={`px-2 py-1 text-[11px] font-mono font-medium rounded border transition ${
                showVwap
                  ? 'bg-purple-950/60 border-purple-700/60 text-purple-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              VWAP
            </button>
            <button
              onClick={() => setShowSupertrend(!showSupertrend)}
              className={`px-2 py-1 text-[11px] font-mono font-medium rounded border transition ${
                showSupertrend
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              SuperTrend
            </button>
            <button
              onClick={() => setShowRsi(!showRsi)}
              className={`px-2 py-1 text-[11px] font-mono font-medium rounded border transition ${
                showRsi
                  ? 'bg-blue-950/60 border-blue-700/60 text-blue-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              RSI
            </button>
            <button
              id="btn-toggle-trade-levels"
              onClick={() => setShowTradeLevels(!showTradeLevels)}
              className={`px-2 py-1 text-[11px] font-mono font-bold rounded border transition flex items-center gap-1 ${
                showTradeLevels
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title="এন্ট্রি জোন, টার্গেট এক্সিট এবং স্টপ লস লেভেল চার্টে প্রদর্শন করুন"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>লেভেল (Entry/Exit)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Candlestick Canvas */}
      <div
        ref={chartContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full cursor-crosshair select-none pt-2"
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const y = mainChartHeight * ratio;
            const price = scaledMax - ratio * priceRange;
            return (
              <g key={i}>
                <line
                  x1="0"
                  y1={y}
                  x2={svgWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={svgWidth - 5}
                  y={y - 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Indicator Lines */}
          {showSupertrend && (
            <g>
              {visibleCandles.map((_, i) => {
                const fullIdx = visibleStartIndex + i;
                const st = supertrend;
                if (!st.values[fullIdx]) return null;
                const x = i * candleSpacing + candleSpacing / 2;
                const y = getY(st.values[fullIdx]);
                const isBull = st.trends[fullIdx] === 'BULLISH';
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="1.8"
                    fill={isBull ? '#10b981' : '#f43f5e'}
                    opacity="0.85"
                  />
                );
              })}
            </g>
          )}

          {showVwap && (
            <path
              d={vwapPath}
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.9"
            />
          )}

          {showEma21 && (
            <path
              d={ema21Path}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.6"
              opacity="0.9"
            />
          )}

          {showEma9 && (
            <path
              d={ema9Path}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.8"
              opacity="0.95"
            />
          )}

          {/* Candlesticks */}
          {visibleCandles.map((c, i) => {
            const isGreen = c.close >= c.open;
            const x = i * candleSpacing + candleSpacing / 2;
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
            const color = isGreen ? '#10b981' : '#f43f5e';

            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1.2"
                />
                {/* Body */}
                <rect
                  x={x - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* Current Price Line */}
          <line
            x1="0"
            y1={getY(currentPrice)}
            x2={svgWidth}
            y2={getY(currentPrice)}
            stroke="#06b6d4"
            strokeDasharray="2 2"
            strokeWidth="1"
            opacity="0.8"
          />

          {/* Trade Levels Overlay: Entry Zone, Target 1 Exit, Target 2 Exit, Stop Loss Exit */}
          {showTradeLevels && signal && !signal.isNoTrade && (
            <g id="chart-trade-levels">
              {/* Entry Level Line */}
              {(() => {
                const entryY = getY(signal.priceAtSignal);
                return (
                  <g key="entry-lvl">
                    <line
                      x1="0"
                      y1={entryY}
                      x2={svgWidth - 110}
                      y2={entryY}
                      stroke="#06b6d4"
                      strokeDasharray="4 3"
                      strokeWidth="1.6"
                      opacity="0.9"
                    />
                    <rect
                      x={svgWidth - 105}
                      y={entryY - 9}
                      width="100"
                      height="18"
                      fill="#083344"
                      stroke="#06b6d4"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={svgWidth - 55}
                      y={entryY + 3.5}
                      fill="#22d3ee"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ENTRY {signal.priceAtSignal.toFixed(1)}
                    </text>
                  </g>
                );
              })()}

              {/* Target 1 Exit Level Line */}
              {(() => {
                const t1Y = getY(signal.target1);
                return (
                  <g key="t1-lvl">
                    <line
                      x1="0"
                      y1={t1Y}
                      x2={svgWidth - 110}
                      y2={t1Y}
                      stroke="#10b981"
                      strokeDasharray="4 2"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                    <rect
                      x={svgWidth - 105}
                      y={t1Y - 9}
                      width="100"
                      height="18"
                      fill="#064e3b"
                      stroke="#10b981"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={svgWidth - 55}
                      y={t1Y + 3.5}
                      fill="#34d399"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      T1 EXIT {signal.target1.toFixed(1)}
                    </text>
                  </g>
                );
              })()}

              {/* Target 2 Exit Level Line */}
              {(() => {
                const t2Y = getY(signal.target2);
                return (
                  <g key="t2-lvl">
                    <line
                      x1="0"
                      y1={t2Y}
                      x2={svgWidth - 110}
                      y2={t2Y}
                      stroke="#14b8a6"
                      strokeDasharray="4 2"
                      strokeWidth="1.2"
                      opacity="0.8"
                    />
                    <rect
                      x={svgWidth - 105}
                      y={t2Y - 9}
                      width="100"
                      height="18"
                      fill="#134e4a"
                      stroke="#14b8a6"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={svgWidth - 55}
                      y={t2Y + 3.5}
                      fill="#5eead4"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      T2 EXIT {signal.target2.toFixed(1)}
                    </text>
                  </g>
                );
              })()}

              {/* Stop Loss Exit Level Line */}
              {(() => {
                const slY = getY(signal.stopLoss);
                return (
                  <g key="sl-lvl">
                    <line
                      x1="0"
                      y1={slY}
                      x2={svgWidth - 110}
                      y2={slY}
                      stroke="#f43f5e"
                      strokeDasharray="4 2"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                    <rect
                      x={svgWidth - 105}
                      y={slY - 9}
                      width="100"
                      height="18"
                      fill="#881337"
                      stroke="#f43f5e"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={svgWidth - 55}
                      y={slY + 3.5}
                      fill="#fda4af"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      SL EXIT {signal.stopLoss.toFixed(1)}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Real-time Signal Trigger Beacon on the latest candle */}
          {visibleCandles.length > 0 && signal && (
            (() => {
              const lastIdx = visibleCandles.length - 1;
              const lastCandle = visibleCandles[lastIdx];
              const candleX = lastIdx * candleSpacing + candleSpacing / 2;
              const isCall = signal.direction === 'CALL';
              const isPut = signal.direction === 'PUT';
              const isNoTrade = signal.direction === 'NO_TRADE' || signal.isNoTrade;

              if (isNoTrade) {
                const candleY = Math.max(25, getY(lastCandle.high) - 18);
                return (
                  <g key="sig-beacon" transform={`translate(${candleX}, ${candleY})`}>
                    <rect x="-35" y="-10" width="70" height="18" rx="4" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
                    <text x="0" y="3" fill="#fef3c7" fontSize="8.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">NO TRADE</text>
                  </g>
                );
              }

              if (isCall) {
                const candleY = Math.min(mainChartHeight - 25, getY(lastCandle.low) + 20);
                return (
                  <g key="sig-beacon" transform={`translate(${candleX}, ${candleY})`}>
                    <polygon points="0,-8 -6,0 6,0" fill="#10b981" />
                    <rect x="-38" y="2" width="76" height="18" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.2" />
                    <text x="0" y="14" fill="#34d399" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BUY CALL (CE)</text>
                  </g>
                );
              }

              if (isPut) {
                const candleY = Math.max(25, getY(lastCandle.high) - 24);
                return (
                  <g key="sig-beacon" transform={`translate(${candleX}, ${candleY})`}>
                    <polygon points="0,8 -6,0 6,0" fill="#f43f5e" />
                    <rect x="-38" y="-20" width="76" height="18" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1.2" />
                    <text x="0" y="-8" fill="#fda4af" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">BUY PUT (PE)</text>
                  </g>
                );
              }

              return null;
            })()
          )}

          {/* Hover Crosshair */}
          {hoverIndex !== null && hoverIndex < visibleCandles.length && (
            <g>
              <line
                x1={hoverIndex * candleSpacing + candleSpacing / 2}
                y1="0"
                x2={hoverIndex * candleSpacing + candleSpacing / 2}
                y2={totalSvgHeight}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1={getY(visibleCandles[hoverIndex].close)}
                x2={svgWidth}
                y2={getY(visibleCandles[hoverIndex].close)}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            </g>
          )}

          {/* RSI Sub-chart */}
          {showRsi && (
            <g transform={`translate(0, ${mainChartHeight + 20})`}>
              {/* RSI Background & levels */}
              <rect
                x="0"
                y="0"
                width={svgWidth}
                height={rsiHeight}
                fill="#0b1329"
                stroke="#1e293b"
                rx="4"
              />
              {/* 70 overbought line */}
              <line
                x1="0"
                y1={rsiHeight * 0.3}
                x2={svgWidth}
                y2={rsiHeight * 0.3}
                stroke="#f43f5e"
                strokeDasharray="3 3"
                strokeWidth="0.8"
                opacity="0.5"
              />
              <text x={svgWidth - 5} y={rsiHeight * 0.3 + 3} fill="#f43f5e" fontSize="9" textAnchor="end">
                70 OB
              </text>
              {/* 50 line */}
              <line
                x1="0"
                y1={rsiHeight * 0.5}
                x2={svgWidth}
                y2={rsiHeight * 0.5}
                stroke="#64748b"
                strokeDasharray="2 2"
                strokeWidth="0.8"
                opacity="0.4"
              />
              {/* 30 oversold line */}
              <line
                x1="0"
                y1={rsiHeight * 0.7}
                x2={svgWidth}
                y2={rsiHeight * 0.7}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth="0.8"
                opacity="0.5"
              />
              <text x={svgWidth - 5} y={rsiHeight * 0.7 + 3} fill="#10b981" fontSize="9" textAnchor="end">
                30 OS
              </text>

              {/* RSI Area / Line */}
              <path
                d={rsiPath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.6"
              />
              <text x="8" y="14" fill="#94a3b8" fontSize="10" fontWeight="bold">
                RSI (14):{' '}
                <tspan fill="#38bdf8">
                  {activeRsi ? activeRsi.toFixed(1) : '50.0'}
                </tspan>
              </text>
            </g>
          )}
        </svg>

        {/* Legend Overlay at bottom left */}
        <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-4">
            {showEma9 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>
                <span>EMA9: {activeEma9 ? activeEma9.toFixed(1) : '-'}</span>
              </span>
            )}
            {showEma21 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
                <span>EMA21: {activeEma21 ? activeEma21.toFixed(1) : '-'}</span>
              </span>
            )}
            {showVwap && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span>
                <span>VWAP: {activeVwap ? activeVwap.toFixed(1) : '-'}</span>
              </span>
            )}
            {showSupertrend && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>SuperTrend 10,3</span>
              </span>
            )}
            {showTradeLevels && signal && !signal.isNoTrade && (
              <>
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="w-2 h-0.5 bg-cyan-400 inline-block"></span>
                  <span>Entry</span>
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-0.5 bg-emerald-400 inline-block"></span>
                  <span>T1 Exit</span>
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-0.5 bg-rose-400 inline-block"></span>
                  <span>SL Exit</span>
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            {new Date(activeCandle.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};
