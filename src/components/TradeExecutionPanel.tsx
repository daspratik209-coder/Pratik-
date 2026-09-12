import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Zap,
  Target,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  XCircle,
  Sliders,
  DollarSign,
  Compass,
  Lock,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';

export const TradeExecutionPanel: React.FC = () => {
  const {
    signal,
    currentPrice,
    selectedInstrument,
    virtualBalance,
    openPositions,
    executePaperTrade,
    closePaperPosition,
    closeAllPositions,
    trailSlToEntry,
    injectMarketScenario,
  } = useTrading();

  const cfg = INSTRUMENTS[selectedInstrument];

  // Selected trade execution tab: 'CALL' | 'PUT' | 'SIGNAL'
  const [activeTab, setActiveTab] = useState<'CALL' | 'PUT' | 'SIGNAL'>('CALL');
  const [strikeOffset, setStrikeOffset] = useState<'ATM' | 'ITM' | 'OTM'>('ATM');
  const [lotMultiplier, setLotMultiplier] = useState<number>(2);
  const [entryType, setEntryType] = useState<'MARKET' | 'ZONE'>('MARKET');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const totalQuantity = cfg.lotSize * lotMultiplier;

  // Derive strikes for Call and Put
  const atmStrike = Math.round(currentPrice / cfg.strikeStep) * cfg.strikeStep;
  const itmCallStrike = atmStrike - cfg.strikeStep;
  const otmCallStrike = atmStrike + cfg.strikeStep;

  const itmPutStrike = atmStrike + cfg.strikeStep;
  const otmPutStrike = atmStrike - cfg.strikeStep;

  // Selected strikes
  const selectedCallStrike =
    strikeOffset === 'ATM' ? atmStrike : strikeOffset === 'ITM' ? itmCallStrike : otmCallStrike;

  const selectedPutStrike =
    strikeOffset === 'ATM' ? atmStrike : strikeOffset === 'ITM' ? itmPutStrike : otmPutStrike;

  // Premiums estimate
  const callPremium =
    strikeOffset === 'ATM'
      ? +(currentPrice * 0.0058).toFixed(1)
      : strikeOffset === 'ITM'
      ? +(currentPrice * 0.0085).toFixed(1)
      : +(currentPrice * 0.0035).toFixed(1);

  const putPremium =
    strikeOffset === 'ATM'
      ? +(currentPrice * 0.0058).toFixed(1)
      : strikeOffset === 'ITM'
      ? +(currentPrice * 0.0085).toFixed(1)
      : +(currentPrice * 0.0035).toFixed(1);

  // Exit targets and stop loss for Call
  const callSl = +(callPremium * 0.72).toFixed(1); // 28% risk
  const callT1 = +(callPremium * 1.45).toFixed(1); // 45% gain
  const callT2 = +(callPremium * 1.85).toFixed(1); // 85% gain

  // Exit targets and stop loss for Put
  const putSl = +(putPremium * 0.72).toFixed(1);
  const putT1 = +(putPremium * 1.45).toFixed(1);
  const putT2 = +(putPremium * 1.85).toFixed(1);

  const handleBuyCall = () => {
    const ok = executePaperTrade({
      type: 'CALL',
      strikePrice: selectedCallStrike,
      entryPrice: callPremium,
      stopLoss: callSl,
      target: callT1,
      quantity: totalQuantity,
      symbol: `${cfg.symbol} ${selectedCallStrike} CE`,
    });
    if (ok) {
      showToast(`সফলভাবে BUY CALL (CE) এক্সিকিউট হয়েছে! Strike: ${selectedCallStrike}`);
    }
  };

  const handleBuyPut = () => {
    const ok = executePaperTrade({
      type: 'PUT',
      strikePrice: selectedPutStrike,
      entryPrice: putPremium,
      stopLoss: putSl,
      target: putT1,
      quantity: totalQuantity,
      symbol: `${cfg.symbol} ${selectedPutStrike} PE`,
    });
    if (ok) {
      showToast(`সফলভাবে BUY PUT (PE) এক্সিকিউট হয়েছে! Strike: ${selectedPutStrike}`);
    }
  };

  const handleSignalSyncTrade = () => {
    if (signal.isNoTrade || signal.direction === 'NO_TRADE') {
      alert('বর্তমানে নো-ট্রেড জোন সক্রিয়! ক্যাপিটাল সুরক্ষার স্বার্থে এন্ট্রি নিষিদ্ধ।');
      return;
    }

    const isCall = signal.direction === 'CALL';
    const premium = signal.suggestedStrike.estimatedLtp || +(currentPrice * 0.0055).toFixed(1);

    const ok = executePaperTrade({
      type: isCall ? 'CALL' : 'PUT',
      strikePrice: signal.suggestedStrike.strike,
      entryPrice: premium,
      stopLoss: +(premium * 0.75).toFixed(1),
      target: +(premium * 1.55).toFixed(1),
      quantity: totalQuantity,
      symbol: `${cfg.symbol} ${signal.suggestedStrike.strike} ${signal.suggestedStrike.type}`,
    });

    if (ok) {
      showToast(`অ্যালগো সিগন্যাল অনুযায়ী ${signal.direction} সফলভাবে এক্সিকিউট হয়েছে!`);
    }
  };

  return (
    <div
      id="trade-execution-panel"
      className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl space-y-4 relative"
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute top-2 right-4 z-20 bg-cyan-400 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-2 shadow-2xl animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">
              ট্রেড এক্সিকিউশন ও এন্ট্রি/এক্সিট টার্মিনাল
            </h2>
            <p className="text-[11px] text-slate-400">
              Signal • Buy Call (CE) • Buy Put (PE) • Entry Zone • Stop Loss & Target Exit
            </p>
          </div>
        </div>

        {/* Live Spot Readout */}
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-mono">লাইভ স্পট প্রাইস</span>
          <span className="text-sm font-bold font-mono text-cyan-300">
            {cfg.currency}{currentPrice.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Trade Selector Tabs: BUY CALL / BUY PUT / ALGO SIGNAL */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          id="tab-buy-call"
          onClick={() => setActiveTab('CALL')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'CALL'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>BUY CALL (CE)</span>
        </button>

        <button
          id="tab-buy-put"
          onClick={() => setActiveTab('PUT')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'PUT'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-900'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>BUY PUT (PE)</span>
        </button>

        <button
          id="tab-algo-signal"
          onClick={() => setActiveTab('SIGNAL')}
          className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'SIGNAL'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
              : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>ALGO সিগন্যাল</span>
        </button>
      </div>

      {/* Tab 1: BUY CALL (CE) FORM */}
      {activeTab === 'CALL' && (
        <div className="space-y-3 bg-emerald-950/10 border border-emerald-500/20 p-3.5 rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              বুলিশ কল অপশন সেটআপ (BUY CALL)
            </span>

            {/* Strike Selection Buttons */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-slate-400 text-[10px] mr-1">স্ট্রাইক:</span>
              <button
                onClick={() => setStrikeOffset('ITM')}
                className={`px-2 py-0.5 rounded border transition ${
                  strikeOffset === 'ITM'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                ITM ({itmCallStrike})
              </button>
              <button
                onClick={() => setStrikeOffset('ATM')}
                className={`px-2 py-0.5 rounded border transition ${
                  strikeOffset === 'ATM'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                ATM ({atmStrike})
              </button>
              <button
                onClick={() => setStrikeOffset('OTM')}
                className={`px-2 py-0.5 rounded border transition ${
                  strikeOffset === 'OTM'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                OTM ({otmCallStrike})
              </button>
            </div>
          </div>

          {/* Entry, Stop Loss & Exit Targets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Entry Zone */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>এন্ট্রি প্রাইস (Entry)</span>
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                ₹{callPremium}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                স্পট: ₹{(currentPrice - 5).toFixed(0)}-₹{(currentPrice + 5).toFixed(0)}
              </span>
            </div>

            {/* Stop Loss (Exit) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-rose-400" />
                <span>স্টপ-লস (SL Exit)</span>
              </div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-1">
                ₹{callSl}
              </div>
              <span className="text-[10px] text-rose-500/80 block mt-0.5">
                ঝুঁকি: -₹{(callPremium - callSl).toFixed(1)}/শেয়ার
              </span>
            </div>

            {/* Target 1 (Exit) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>টার্গেট ১ (T1 Exit)</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                ₹{callT1}
              </div>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                লাভ: +₹{(callT1 - callPremium).toFixed(1)} (+45%)
              </span>
            </div>

            {/* Target 2 (Exit) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Target className="w-3 h-3 text-teal-300" />
                <span>টার্গেট ২ (T2 Exit)</span>
              </div>
              <div className="text-sm font-bold font-mono text-teal-300 mt-1">
                ₹{callT2}
              </div>
              <span className="text-[10px] text-teal-400/80 block mt-0.5">
                লাভ: +₹{(callT2 - callPremium).toFixed(1)} (+85%)
              </span>
            </div>
          </div>

          {/* Sizing & Execution Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              {/* Lot multiplier */}
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1 text-xs">
                <button
                  onClick={() => setLotMultiplier(Math.max(1, lotMultiplier - 1))}
                  className="px-2.5 py-0.5 text-slate-400 hover:text-white font-bold"
                >
                  -
                </button>
                <span className="px-2 font-mono font-bold text-slate-200">
                  {lotMultiplier} লট ({totalQuantity} Qty)
                </span>
                <button
                  onClick={() => setLotMultiplier(lotMultiplier + 1)}
                  className="px-2.5 py-0.5 text-slate-400 hover:text-white font-bold"
                >
                  +
                </button>
              </div>

              <div className="text-xs text-slate-400">
                প্রয়োজনীয় ক্যাপিটাল:{' '}
                <strong className="text-slate-100 font-mono font-bold">
                  ₹{Math.round(callPremium * totalQuantity).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Execution Button */}
            <button
              id="btn-buy-call-execute"
              onClick={handleBuyCall}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition"
            >
              <span>BUY CALL (CE) এন্ট্রি কনফার্ম</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: BUY PUT (PE) FORM */}
      {activeTab === 'PUT' && (
        <div className="space-y-3 bg-rose-950/10 border border-rose-500/20 p-3.5 rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              বেয়ারিশ পুট অপশন সেটআপ (BUY PUT)
            </span>

            {/* Strike Selection Buttons */}
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-slate-400 text-[10px] mr-1">স্ট্রাইক:</span>
              <button
                onClick={() => setStrikeOffset('ITM')}
                className={`px-2 py-0.5 rounded border transition ${
                  strikeOffset === 'ITM'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                ITM ({itmPutStrike})
              </button>
              <button
                onClick={() => setStrikeOffset('ATM')}
                className={`px-2 py-0.5 rounded border transition ${
                  strikeOffset === 'ATM'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                ATM ({atmStrike})
              </button>
              <button
                onClick={() => setStrikeOffset('OTM')}
                className={`px-2 py-0.5 rounded border transition ${
                  strikeOffset === 'OTM'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                OTM ({otmPutStrike})
              </button>
            </div>
          </div>

          {/* Entry, Stop Loss & Exit Targets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Entry Zone */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>এন্ট্রি প্রাইস (Entry)</span>
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                ₹{putPremium}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                স্পট: ₹{(currentPrice + 5).toFixed(0)}-₹{(currentPrice - 5).toFixed(0)}
              </span>
            </div>

            {/* Stop Loss (Exit) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-rose-400" />
                <span>স্টপ-লস (SL Exit)</span>
              </div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-1">
                ₹{putSl}
              </div>
              <span className="text-[10px] text-rose-500/80 block mt-0.5">
                ঝুঁকি: -₹{(putPremium - putSl).toFixed(1)}/শেয়ার
              </span>
            </div>

            {/* Target 1 (Exit) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>টার্গেট ১ (T1 Exit)</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                ₹{putT1}
              </div>
              <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                লাভ: +₹{(putT1 - putPremium).toFixed(1)} (+45%)
              </span>
            </div>

            {/* Target 2 (Exit) */}
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Target className="w-3 h-3 text-teal-300" />
                <span>টার্গেট ২ (T2 Exit)</span>
              </div>
              <div className="text-sm font-bold font-mono text-teal-300 mt-1">
                ₹{putT2}
              </div>
              <span className="text-[10px] text-teal-400/80 block mt-0.5">
                লাভ: +₹{(putT2 - putPremium).toFixed(1)} (+85%)
              </span>
            </div>
          </div>

          {/* Sizing & Execution Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              {/* Lot multiplier */}
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1 text-xs">
                <button
                  onClick={() => setLotMultiplier(Math.max(1, lotMultiplier - 1))}
                  className="px-2.5 py-0.5 text-slate-400 hover:text-white font-bold"
                >
                  -
                </button>
                <span className="px-2 font-mono font-bold text-slate-200">
                  {lotMultiplier} লট ({totalQuantity} Qty)
                </span>
                <button
                  onClick={() => setLotMultiplier(lotMultiplier + 1)}
                  className="px-2.5 py-0.5 text-slate-400 hover:text-white font-bold"
                >
                  +
                </button>
              </div>

              <div className="text-xs text-slate-400">
                প্রয়োজনীয় ক্যাপিটাল:{' '}
                <strong className="text-slate-100 font-mono font-bold">
                  ₹{Math.round(putPremium * totalQuantity).toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Execution Button */}
            <button
              id="btn-buy-put-execute"
              onClick={handleBuyPut}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-900/30 active:scale-95 transition"
            >
              <span>BUY PUT (PE) এন্ট্রি কনফার্ম</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: ALGO SIGNAL SYNC */}
      {activeTab === 'SIGNAL' && (
        <div className="space-y-3 bg-indigo-950/10 border border-indigo-500/20 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-lg ${
                  signal.direction === 'CALL'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : signal.direction === 'PUT'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {signal.direction === 'CALL' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : signal.direction === 'PUT' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-100 uppercase">
                  অ্যালগো কারেন্ট সিগন্যাল: {signal.direction}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  কনফিডেন্স: {signal.confidence}% • R:R {signal.riskReward}
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-cyan-300">
              স্ট্রাইক: {signal.suggestedStrike.strike} {signal.suggestedStrike.type}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">এন্ট্রি জোন</span>
              <span className="font-mono font-bold text-cyan-300">
                {cfg.currency}{signal.entryRange[0]} - {signal.entryRange[1]}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">স্টপ লস (SL)</span>
              <span className="font-mono font-bold text-rose-400">
                {cfg.currency}{signal.stopLoss}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">টার্গেট ১ (T1)</span>
              <span className="font-mono font-bold text-emerald-400">
                {cfg.currency}{signal.target1}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">টার্গেট ২ (T2)</span>
              <span className="font-mono font-bold text-teal-300">
                {cfg.currency}{signal.target2}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-slate-400">
              {signal.direction === 'NO_TRADE' ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> নো ট্রেড জোন সক্রিয় (চপি মার্কেট)
                </span>
              ) : (
                <span>লট সাইজ: {lotMultiplier} লট ({totalQuantity} Qty)</span>
              )}
            </div>

            <button
              id="btn-sync-signal-trade"
              onClick={handleSignalSyncTrade}
              disabled={signal.direction === 'NO_TRADE'}
              className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition ${
                signal.direction === 'NO_TRADE'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : signal.direction === 'CALL'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
              }`}
            >
              <span>সিগন্যাল সিঙ্ক করে ট্রেড নিন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE OPEN POSITIONS & QUICK EXIT CONTROLS */}
      {openPositions.length > 0 && (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/90 p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                অ্যাক্টিভ ওপেন ট্রেড ও এক্সিট কন্ট্রোল ({openPositions.length})
              </span>
            </div>

            {/* Panic Exit All Button */}
            <button
              id="btn-panic-exit-all"
              onClick={closeAllPositions}
              className="px-3 py-1 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>🚨 সব এক্সিট করুন (EXIT ALL)</span>
            </button>
          </div>

          <div className="space-y-2">
            {openPositions.map((pos) => {
              const isProfit = pos.pnl >= 0;
              const isCall = pos.type === 'CALL';

              return (
                <div
                  key={pos.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        isCall ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {pos.symbol}
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      এন্ট্রি: <strong>₹{pos.entryPrice}</strong> → কারেন্ট: <strong>₹{pos.currentPrice}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({pos.quantity} Qty)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live PnL badge */}
                    <div
                      className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                        isProfit
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {isProfit ? '+' : ''}₹{pos.pnl.toLocaleString()} ({pos.pnlPercent}%)
                    </div>

                    {/* Trail SL to Entry button */}
                    <button
                      onClick={() => trailSlToEntry(pos.id)}
                      title="স্টপ লস সরাসরি এন্ট্রি প্রাইসে নিয়ে আসুন যাতে কোনো লস না হয়"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition"
                    >
                      <Lock className="w-3 h-3" />
                      <span>SL to Entry</span>
                    </button>

                    {/* Single Position Exit button */}
                    <button
                      onClick={() => closePaperPosition(pos.id, 'MANUAL')}
                      className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold shadow transition"
                    >
                      এক্সিট (EXIT)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Simulator Quick Trigger Scenario Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
        <span className="text-slate-500 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5" />
          মার্কেট অ্যাকশন টেস্ট ট্রিগার:
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => injectMarketScenario('BULLISH_BREAKOUT')}
            className="px-2.5 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-semibold transition"
          >
            + বুলিশ ব্রেকআউট (CALL)
          </button>
          <button
            onClick={() => injectMarketScenario('BEARISH_DUMP')}
            className="px-2.5 py-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 font-semibold transition"
          >
            - বেয়ারিশ ডাম্প (PUT)
          </button>
          <button
            onClick={() => injectMarketScenario('CHOPPY_RANGE')}
            className="px-2.5 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-semibold transition"
          >
            ~ চপি সাইডওয়েজ (NO-TRADE)
          </button>
        </div>
      </div>
    </div>
  );
};
