import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';

export const SignalCard: React.FC = () => {
  const { signal, currentPrice, selectedInstrument, executePaperTrade } = useTrading();
  const cfg = INSTRUMENTS[selectedInstrument];

  const [lotMultiplier, setLotMultiplier] = useState<number>(2);
  const [tradeSuccessToast, setTradeSuccessToast] = useState<boolean>(false);

  const isNoTrade = signal.isNoTrade || signal.direction === 'NO_TRADE';
  const isCall = signal.direction === 'CALL';

  const totalQuantity = cfg.lotSize * lotMultiplier;
  const estimatedPremium = signal.suggestedStrike.estimatedLtp || +(currentPrice * 0.0055).toFixed(1);
  const totalInvestment = Math.round(estimatedPremium * totalQuantity);

  const handleExecuteTrade = () => {
    if (isNoTrade) return;

    const ok = executePaperTrade({
      type: isCall ? 'CALL' : 'PUT',
      strikePrice: signal.suggestedStrike.strike,
      entryPrice: estimatedPremium,
      stopLoss: +(estimatedPremium * 0.75).toFixed(1), // 25% premium risk
      target: +(estimatedPremium * 1.55).toFixed(1), // 55% premium reward (1:2.2 RR)
      quantity: totalQuantity,
      symbol: `${cfg.symbol} ${signal.suggestedStrike.strike} ${signal.suggestedStrike.type}`,
    });

    if (ok) {
      setTradeSuccessToast(true);
      setTimeout(() => setTradeSuccessToast(false), 3000);
    }
  };

  return (
    <div
      id="signal-card-container"
      className={`relative rounded-xl border p-4 shadow-xl transition-all ${
        isNoTrade
          ? 'bg-amber-950/20 border-amber-500/40 shadow-amber-950/10'
          : isCall
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/10'
          : 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/10'
      }`}
    >
      {/* Toast Confirmation */}
      {tradeSuccessToast && (
        <div className="absolute top-2 right-2 bg-cyan-500 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg animate-bounce z-10">
          <CheckCircle2 className="w-4 h-4" />
          <span>অর্ডার সফলভাবে পেপার পোর্টফোলিওতে এক্সিকিউট হয়েছে!</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span
            className={`p-2 rounded-lg ${
              isNoTrade
                ? 'bg-amber-500/20 text-amber-400'
                : isCall
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isNoTrade ? (
              <ShieldAlert className="w-5 h-5" />
            ) : isCall ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wide">
                {isNoTrade ? 'নো ট্রেড জোন (NO TRADE ZONE)' : isCall ? 'CALL সিগন্যাল (BUY CE)' : 'PUT সিগন্যাল (BUY PE)'}
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  isNoTrade
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : isCall
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                কনফিডেন্স {signal.confidence}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isNoTrade
                ? 'মার্কেট চপি ও সাইডওয়েজ—ক্যাপিটাল প্রোটেকশন সক্রিয়'
                : `হাই-প্রোবাবিলিটি অ্যালগরিদমিক এন্ট্রি • R:R ${signal.riskReward}`}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3" />
            {new Date(signal.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-xs font-mono font-bold text-slate-300">
            স্পট @ {cfg.currency}{signal.priceAtSignal.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Content Body */}
      {isNoTrade ? (
        /* NO TRADE ZONE BODY */
        <div className="py-4 space-y-3">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <strong className="font-semibold block mb-0.5">ট্রেড পরিহার করার কারণ:</strong>
              <p className="leading-relaxed">
                {signal.noTradeReason ||
                  'মার্কেট বর্তমানে সংকীর্ণ রেঞ্জের ভেতর সাইডওয়েজ কনসোলিডেশনে আছে। প্রিমিয়াম ডিকে ও ফলস ব্রেকআউটের ঝুঁকি বেশি। নতুন পজিশন নেওয়া সম্পূর্ণ নিষিদ্ধ।'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">চপিনেস ইনডেক্স (CI)</span>
              <span className="text-base font-bold font-mono text-amber-400">64.8 (হাই চপ)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">অ্যালগো পরামর্শ</span>
              <span className="text-base font-bold text-slate-200">ক্যাপিটাল বাঁচান</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            "সফল ট্রেডাররা ভালো এন্ট্রি খোঁজার চেয়ে বাজে মার্কেট পরিহার করতে বেশি দক্ষ।"
          </p>
        </div>
      ) : (
        /* ACTIVE CALL / PUT SIGNAL BODY */
        <div className="py-3 space-y-3">
          {/* Key Trade Parameters: Entry Zone, SL, Targets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Entry Range */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>এন্ট্রি জোন</span>
              </div>
              <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
                {cfg.currency}{signal.entryRange[0]} - {signal.entryRange[1]}
              </div>
            </div>

            {/* Strict Stop Loss */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-rose-400" />
                <span>স্টপ-লস (SL)</span>
              </div>
              <div className="text-sm font-bold font-mono text-rose-400 mt-1">
                {cfg.currency}{signal.stopLoss}
              </div>
            </div>

            {/* Target 1 */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>টার্গেট ১ (T1)</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                {cfg.currency}{signal.target1}
              </div>
            </div>

            {/* Target 2 / 3 */}
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Target className="w-3 h-3 text-emerald-300" />
                <span>টার্গেট ২ / ৩</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-300 mt-1">
                {cfg.currency}{signal.target2} / {signal.target3}
              </div>
            </div>
          </div>

          {/* Suggested Option Strike Card */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                সাজেস্টেড অপশন স্ট্রাইক
              </span>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>
                  {cfg.symbol} {signal.suggestedStrike.strike} {signal.suggestedStrike.type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300">
                  LTP ~₹{estimatedPremium}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                লট সাইজ: {cfg.lotSize} • এক্সপায়রি: {signal.suggestedStrike.expiry}
              </div>
            </div>

            {/* Quick 1-Click Paper Execution */}
            <div className="flex items-center gap-2">
              {/* Lot selector */}
              <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-1 text-xs">
                <button
                  onClick={() => setLotMultiplier(Math.max(1, lotMultiplier - 1))}
                  className="px-2 py-0.5 hover:text-cyan-400 font-bold"
                >
                  -
                </button>
                <span className="px-2 font-mono font-bold text-slate-200">
                  {lotMultiplier} লট ({totalQuantity} Qty)
                </span>
                <button
                  onClick={() => setLotMultiplier(lotMultiplier + 1)}
                  className="px-2 py-0.5 hover:text-cyan-400 font-bold"
                >
                  +
                </button>
              </div>

              {/* Action Button */}
              <button
                id="btn-execute-paper-trade"
                onClick={handleExecuteTrade}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-95 ${
                  isCall
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-900/30'
                }`}
              >
                <span>পেপার ট্রেড এক্সিকিউট (₹{totalInvestment.toLocaleString()})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Technical Reasons / Confluences */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
            <span className="text-[10px] text-slate-400 font-bold block mb-1">
              অ্যালগরিদমিক কনফ্লুয়েন্স ফ্যাক্টরসমূহ:
            </span>
            <ul className="space-y-1">
              {signal.reasons.map((r, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
