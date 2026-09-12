import React from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Zap,
  Wallet,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Flame,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';
import { InstrumentKey } from '../types';

interface HeaderProps {
  activeTab: 'terminal' | 'volatility' | 'optionChain' | 'gemini' | 'paper' | 'journal' | 'backtest';
  setActiveTab: (tab: 'terminal' | 'volatility' | 'optionChain' | 'gemini' | 'paper' | 'journal' | 'backtest') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    selectedInstrument,
    setSelectedInstrument,
    currentPrice,
    priceChange,
    priceChangePercent,
    indicators,
    optionChain,
    isStreaming,
    setIsStreaming,
    tickSpeed,
    setTickSpeed,
    soundEnabled,
    setSoundEnabled,
    virtualBalance,
    openPositions,
    injectMarketScenario,
  } = useTrading();

  const cfg = INSTRUMENTS[selectedInstrument];
  const isPositive = priceChange >= 0;

  // Calculate total unrealized PnL from open positions
  const totalOpenPnl = openPositions.reduce((acc, p) => acc + p.pnl, 0);

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 text-slate-100">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & App Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white font-black text-xl tracking-wider">
            P
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PRATIK AI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO ALGO v3.8
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              লাইভ মার্কেট আর্কিটেকচার • অপশন চেইন • সিগন্যাল ইঞ্জিন
            </p>
          </div>
        </div>

        {/* Real-time Status / Regime & PCR Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          {/* Regime Badge */}
          <div
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 font-medium ${
              indicators.isNoTradeZone
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : indicators.supertrend.trend === 'BULLISH'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {indicators.isNoTradeZone ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>NO TRADE CHOP (CI: {indicators.choppinessIndex.toFixed(0)})</span>
              </>
            ) : indicators.supertrend.trend === 'BULLISH' ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>BULLISH MOMENTUM</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                <span>BEARISH SQUEEZE</span>
              </>
            )}
          </div>

          {/* PCR Badge */}
          <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <span className="text-slate-500">PCR:</span>
            <span
              className={`font-semibold ${
                optionChain.summary.pcr >= 1.1
                  ? 'text-emerald-400'
                  : optionChain.summary.pcr <= 0.85
                  ? 'text-rose-400'
                  : 'text-slate-200'
              }`}
            >
              {optionChain.summary.pcr}
            </span>
            <span className="text-[10px] text-slate-500">({optionChain.summary.sentiment})</span>
          </div>

          {/* India VIX */}
          <div className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
            <span className="text-slate-500">VIX:</span>
            <span className="font-semibold text-cyan-300">13.85</span>
            <span className="text-[10px] text-emerald-400">-1.4%</span>
          </div>
        </div>

        {/* Paper Wallet & Simulation Controls */}
        <div className="flex items-center gap-2">
          {/* Virtual Wallet */}
          <div
            onClick={() => setActiveTab('paper')}
            className="cursor-pointer group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-700/60 transition"
            title="ভার্চুয়াল পেপার ট্রেডিং ব্যালেন্স"
          >
            <Wallet className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">ভার্চুয়াল ফান্ড</div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>₹{virtualBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                {totalOpenPnl !== 0 && (
                  <span
                    className={`text-[10px] px-1 rounded font-mono ${
                      totalOpenPnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {totalOpenPnl >= 0 ? '+' : ''}₹{totalOpenPnl}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            id="btn-sound-toggle"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition ${
              soundEnabled
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'সাউন্ড অ্যালার্ট চালু' : 'সাউন্ড বন্ধ'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Stream Play/Pause */}
          <button
            id="btn-stream-toggle"
            onClick={() => setIsStreaming(!isStreaming)}
            className={`p-2 rounded-lg border flex items-center gap-1 text-xs font-semibold transition ${
              isStreaming
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title={isStreaming ? 'লাইভ টিক চালু আছে' : 'টিক থামানো আছে'}
          >
            {isStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden sm:inline">{isStreaming ? 'LIVE' : 'PAUSED'}</span>
          </button>

          {/* Speed Selector */}
          <button
            id="btn-speed-toggle"
            onClick={() => setTickSpeed(tickSpeed === 1 ? 2 : tickSpeed === 2 ? 4 : 1)}
            className="px-2 py-1 text-xs font-mono font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300"
            title="টিক স্পিড পরিবর্তন"
          >
            {tickSpeed}x
          </button>
        </div>
      </div>

      {/* Market Watch Instrument Ribbon */}
      <div className="border-t border-slate-800/80 bg-slate-900/50 px-4 py-1.5 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-w-max">
          {/* Instruments */}
          <div className="flex items-center gap-1.5">
            {(Object.keys(INSTRUMENTS) as InstrumentKey[]).map((key) => {
              const item = INSTRUMENTS[key];
              const isSelected = selectedInstrument === key;
              return (
                <button
                  id={`instrument-tab-${key}`}
                  key={key}
                  onClick={() => setSelectedInstrument(key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{item.symbol}</span>
                  {isSelected && (
                    <span className="flex items-center text-[11px] font-mono">
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-rose-400" />
                      )}
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {cfg.currency}
                        {currentPrice.toFixed(1)}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Fast Simulation Trigger Buttons */}
          <div className="hidden xl:flex items-center gap-1 pl-4 border-l border-slate-800 text-[11px]">
            <span className="text-slate-500 text-[10px] mr-1">টেস্টিং সিনারিও:</span>
            <button
              onClick={() => injectMarketScenario('BULLISH_BREAKOUT')}
              className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 transition"
              title="বুলিশ ব্রেকআউট টেস্ট করুন"
            >
              <Zap className="w-3 h-3 text-emerald-400" /> ব্রেকআউট
            </button>
            <button
              onClick={() => injectMarketScenario('BEARISH_DUMP')}
              className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 flex items-center gap-1 transition"
              title="বেয়ারিশ ডাম্প টেস্ট করুন"
            >
              <Zap className="w-3 h-3 text-rose-400" /> ব্রেকডাউন
            </button>
            <button
              onClick={() => injectMarketScenario('CHOPPY_RANGE')}
              className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/50 flex items-center gap-1 transition"
              title="নো-ট্রেড চপ রেঞ্জ টেস্ট করুন"
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" /> চপ রেঞ্জ
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-t border-slate-800/60 bg-slate-950 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            id="nav-tab-terminal"
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'terminal'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>লাইভ টার্মিনাল ও সিগন্যাল</span>
          </button>

          <button
            id="nav-tab-volatility"
            onClick={() => setActiveTab('volatility')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'volatility'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>ভলাট্যালিটি হিটম্যাপ</span>
          </button>

          <button
            id="nav-tab-option-chain"
            onClick={() => setActiveTab('optionChain')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'optionChain'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-mono text-cyan-400 font-bold">OI</span>
            <span>অপশন চেইন অ্যানালাইসিস</span>
          </button>

          <button
            id="nav-tab-gemini"
            onClick={() => setActiveTab('gemini')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'gemini'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>জেমিনি এআই অ্যানালাইসিস</span>
          </button>

          <button
            id="nav-tab-paper"
            onClick={() => setActiveTab('paper')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'paper'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>পেপার ট্রেডিং ({openPositions.length})</span>
          </button>

          <button
            id="nav-tab-journal"
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'journal'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>ট্রেড জার্নাল</span>
          </button>

          <button
            id="nav-tab-backtest"
            onClick={() => setActiveTab('backtest')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'backtest'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>ব্যাকটেস্টিং ইঞ্জিন</span>
          </button>
        </div>
      </div>
    </header>
  );
};
