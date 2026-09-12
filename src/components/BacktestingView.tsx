import React, { useState, useMemo } from 'react';
import { Zap, Play, BarChart2, ShieldAlert, Award, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { runBacktest, StrategyKey } from '../utils/backtesting';
import { INSTRUMENTS } from '../utils/marketData';

export const BacktestingView: React.FC = () => {
  const { candles, selectedInstrument } = useTrading();
  const cfg = INSTRUMENTS[selectedInstrument];

  const [selectedStrategy, setSelectedStrategy] = useState<StrategyKey>('PRATIK_TREND');
  const [initialCapital, setInitialCapital] = useState<number>(100000);

  // Run backtest over candle set
  const result = useMemo(() => {
    return runBacktest(candles, selectedStrategy, initialCapital, cfg.lotSize);
  }, [candles, selectedStrategy, initialCapital, cfg.lotSize]);

  // Equity curve SVG calculations
  const equityPoints = result.equityCurve;
  const equities = equityPoints.map((p) => p.equity);
  const minEquity = equities.length > 0 ? Math.min(...equities) : initialCapital * 0.9;
  const maxEquity = equities.length > 0 ? Math.max(...equities) : initialCapital * 1.1;
  const eqRange = maxEquity - minEquity || 1;

  const svgWidth = 800;
  const svgHeight = 180;

  const equityPath = useMemo(() => {
    if (equityPoints.length === 0) return '';
    return equityPoints
      .map((pt, i) => {
        const x = (i / (equityPoints.length - 1 || 1)) * svgWidth;
        const y = svgHeight - ((pt.equity - minEquity) / eqRange) * (svgHeight - 24) - 12;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [equityPoints, minEquity, eqRange]);

  const isNetPositive = result.netProfit >= 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-100">
              অ্যালগরিদমিক স্ট্র্যাটেজি ব্যাকটেস্টিং ইঞ্জিন
            </h3>
            <p className="text-[11px] text-slate-400">
              রিয়েল ক্যান্ডেলস্টিক ও টেকনিক্যাল কনফ্লুয়েন্সের উপর স্ট্র্যাটেজি ভ্যালিডেশন
            </p>
          </div>
        </div>

        {/* Strategy Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value as StrategyKey)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="PRATIK_TREND">
              PRATIK AI Multi-Confluence (SuperTrend + EMA 9/21 + VWAP)
            </option>
            <option value="VWAP_MOMENTUM">
              VWAP Pullback & RSI Momentum Scalping
            </option>
            <option value="BREAKOUT_VOLATILITY">
              Dynamic 10-Bar Range Breakout
            </option>
            <option value="PCR_REVERSION">
              Option Chain PCR & Extreme RSI Mean Reversion
            </option>
          </select>
        </div>
      </div>

      {/* Metrics Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        {/* Win Rate */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">উইন রেট (Win Rate)</span>
          <div className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">
            {result.winRate}%
          </div>
          <span className="text-[10px] text-slate-500">
            {result.winningTrades} জয় / {result.totalTrades} ট্রেড
          </span>
        </div>

        {/* Net Profit */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">নেট প্রফিট</span>
          <div
            className={`text-xl font-extrabold font-mono mt-0.5 ${
              isNetPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isNetPositive ? '+' : ''}₹{result.netProfit.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">
            রিটার্ন: {((result.netProfit / initialCapital) * 100).toFixed(1)}%
          </span>
        </div>

        {/* Profit Factor */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">প্রফিট ফ্যাক্টর</span>
          <div className="text-xl font-extrabold font-mono text-cyan-400 mt-0.5">
            {result.profitFactor}
          </div>
          <span className="text-[10px] text-slate-500">অ্যালগো স্বাস্থ্য সূচক</span>
        </div>

        {/* Max Drawdown */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">ম্যাক্স ড্রডাউন (DD)</span>
          <div className="text-xl font-extrabold font-mono text-amber-400 mt-0.5">
            {result.maxDrawdownPercent}%
          </div>
          <span className="text-[10px] text-slate-500">পিক থেকে সর্বোচ্চ পতন</span>
        </div>

        {/* Avg RR */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">গড় রিস্ক : রিওয়ার্ড</span>
          <div className="text-xl font-extrabold font-mono text-indigo-400 mt-0.5">
            {result.averageRiskReward}
          </div>
          <span className="text-[10px] text-slate-500">ট্রেড এক্সপেক্টেন্সি</span>
        </div>
      </div>

      {/* Equity Curve Graph */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
        <div className="flex items-center justify-between pb-2 text-[11px] text-slate-400">
          <span className="font-bold text-slate-200">ইকুইটি গ্রোথ কার্ভ (Equity Curve):</span>
          <span className="font-mono">
            প্রারম্ভিক: ₹{initialCapital.toLocaleString()} → বর্তমান: ₹
            {(initialCapital + result.netProfit).toLocaleString()}
          </span>
        </div>

        <div className="w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            {/* Grid */}
            <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1={svgHeight - 20} x2={svgWidth} y2={svgHeight - 20} stroke="#1e293b" strokeDasharray="3 3" />

            {/* Path */}
            <path
              d={equityPath}
              fill="none"
              stroke={isNetPositive ? '#10b981' : '#f43f5e'}
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>

      {/* Recent Sample Backtest Trades */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 mb-2">
          সাম্প্রতিক এক্সিকিউটেড ব্যাকটেস্ট ট্রেডসমূহ:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {result.recentTrades.map((t, idx) => {
            const isWin = t.outcome === 'WIN';
            return (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold mr-1.5 ${
                      t.type === 'CALL'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {t.type}
                  </span>
                  <span className="text-slate-300">
                    {t.entry} → {t.exit}
                  </span>
                </div>
                <div
                  className={`font-bold flex items-center gap-1 ${
                    isWin ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isWin ? '+' : ''}₹{t.pnl}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
