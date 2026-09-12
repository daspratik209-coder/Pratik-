import React, { useState } from 'react';
import { Calculator, ShieldCheck, DollarSign, ArrowRight, Percent, CheckCircle2 } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';

export const PositionCalculator: React.FC = () => {
  const { currentPrice, selectedInstrument, virtualBalance, executePaperTrade } = useTrading();
  const cfg = INSTRUMENTS[selectedInstrument];

  const [capital, setCapital] = useState<number>(virtualBalance || 200000);
  const [riskPercent, setRiskPercent] = useState<number>(2); // 2% default risk
  const [entryPrice, setEntryPrice] = useState<number>(+(currentPrice * 0.0055).toFixed(1)); // default option premium
  const [stopLoss, setStopLoss] = useState<number>(+(entryPrice * 0.75).toFixed(1));
  const [target, setTarget] = useState<number>(+(entryPrice * 1.55).toFixed(1));
  const [tradeType, setTradeType] = useState<'CALL' | 'PUT'>('CALL');
  const [toast, setToast] = useState(false);

  // Position Size Calculations
  const maxRiskAmount = Math.round((capital * riskPercent) / 100);
  const riskPerUnit = Math.max(0.5, Math.abs(entryPrice - stopLoss));
  const rewardPerUnit = Math.max(0.5, Math.abs(target - entryPrice));

  // Max units based on risk
  const maxAllowedUnits = Math.max(cfg.lotSize, Math.floor(maxRiskAmount / riskPerUnit));
  // Round to nearest lot
  const lots = Math.max(1, Math.floor(maxAllowedUnits / cfg.lotSize));
  const finalQuantity = lots * cfg.lotSize;
  const actualRisk = +(riskPerUnit * finalQuantity).toFixed(1);
  const totalInvestment = +(entryPrice * finalQuantity).toFixed(1);
  const potentialProfit = +(rewardPerUnit * finalQuantity).toFixed(1);
  const rrRatio = +(rewardPerUnit / riskPerUnit).toFixed(2);

  const handleApplyTrade = () => {
    const ok = executePaperTrade({
      type: tradeType,
      entryPrice,
      stopLoss,
      target,
      quantity: finalQuantity,
      symbol: `${cfg.symbol} Calculator ${tradeType}`,
    });
    if (ok) {
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-100">
              পজিশন সাইজ ও রিস্ক-রিওয়ার্ড ক্যালকুলেটর
            </h3>
            <p className="text-[11px] text-slate-400">
              ক্যাপিটাল প্রোটেকশন ও ম্যাথমেটিকাল লট সাইজিং
            </p>
          </div>
        </div>

        <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300">
          লট: {cfg.lotSize} Qty/লট
        </span>
      </div>

      {toast && (
        <div className="mt-2 bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>ক্যালকুলেটর সাইজ অনুযায়ী পেপার ট্রেড ওপেন হয়েছে!</span>
        </div>
      )}

      {/* Input Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
        {/* Total Capital */}
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">টোটাল ক্যাপিটাল (₹)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Risk Percentage */}
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">রিস্ক পার্সেন্টেজ (%)</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRiskPercent(r)}
                className={`px-2 py-1.5 rounded text-xs font-mono font-bold transition flex-1 ${
                  riskPercent === r
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>

        {/* Entry Price */}
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">এন্ট্রি প্রিমিয়াম (₹)</label>
          <input
            type="number"
            step="0.5"
            value={entryPrice}
            onChange={(e) => setEntryPrice(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Stop Loss */}
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">স্টপ-লস প্রিমিয়াম (₹)</label>
          <input
            type="number"
            step="0.5"
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-rose-400 font-mono focus:border-rose-500 focus:outline-none"
          />
        </div>

        {/* Target */}
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">টার্গেট প্রিমিয়াম (₹)</label>
          <input
            type="number"
            step="0.5"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Direction */}
        <div>
          <label className="text-slate-400 text-[11px] block mb-1">ট্রেডের দিক</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTradeType('CALL')}
              className={`flex-1 py-1.5 rounded text-xs font-bold transition ${
                tradeType === 'CALL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              CALL
            </button>
            <button
              type="button"
              onClick={() => setTradeType('PUT')}
              className={`flex-1 py-1.5 rounded text-xs font-bold transition ${
                tradeType === 'PUT'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              PUT
            </button>
          </div>
        </div>
      </div>

      {/* Calculated Output Bento */}
      <div className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-400 block">অনুমোদিত লট</span>
          <span className="text-lg font-bold text-cyan-400">
            {lots} লট <span className="text-xs text-slate-400">({finalQuantity} Qty)</span>
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">ম্যাক্স রিস্ক (টাকা)</span>
          <span className="text-lg font-bold text-rose-400">₹{actualRisk}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">সম্ভাব্য লাভ</span>
          <span className="text-lg font-bold text-emerald-400">+₹{potentialProfit}</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 block">রিস্ক : রিওয়ার্ড</span>
          <span className="text-lg font-bold text-slate-100">1 : {rrRatio}</span>
        </div>
      </div>

      {/* Execute button */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400">
          প্রয়োজনীয় ফান্ড: <strong className="text-slate-200">₹{totalInvestment.toLocaleString()}</strong>
        </div>

        <button
          onClick={handleApplyTrade}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition active:scale-95"
        >
          <span>পেপার ট্রেডে অ্যাপ্লাই করুন</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
