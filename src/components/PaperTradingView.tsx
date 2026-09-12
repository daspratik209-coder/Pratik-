import React, { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, XCircle, RotateCcw, Plus, CheckCircle2, Shield } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';

export const PaperTradingView: React.FC = () => {
  const {
    virtualBalance,
    openPositions,
    closePaperPosition,
    resetPaperWallet,
    executePaperTrade,
    selectedInstrument,
    currentPrice,
  } = useTrading();

  const cfg = INSTRUMENTS[selectedInstrument];

  // Quick manual trade order state
  const [orderType, setOrderType] = useState<'CALL' | 'PUT'>('CALL');
  const [orderStrike, setOrderStrike] = useState<number>(
    Math.round(currentPrice / cfg.strikeStep) * cfg.strikeStep
  );
  const [orderPremium, setOrderPremium] = useState<number>(+(currentPrice * 0.0055).toFixed(1));
  const [orderLots, setOrderLots] = useState<number>(2);

  // Stats calculation
  const totalOpenPnl = openPositions.reduce((sum, p) => sum + p.pnl, 0);
  const totalInvested = openPositions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0);
  const totalEquity = virtualBalance + totalOpenPnl;

  const handleManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = orderLots * cfg.lotSize;
    executePaperTrade({
      type: orderType,
      strikePrice: orderStrike,
      entryPrice: orderPremium,
      stopLoss: +(orderPremium * 0.75).toFixed(1),
      target: +(orderPremium * 1.55).toFixed(1),
      quantity: qty,
      symbol: `${cfg.symbol} ${orderStrike} ${orderType === 'CALL' ? 'CE' : 'PE'}`,
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Wallet Summary Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Equity */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">মোট ভার্চুয়াল ইকুইটি</span>
          <div className="text-xl font-extrabold font-mono text-cyan-400 mt-0.5">
            ₹{Math.round(totalEquity).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">লাইভ প্রফিট/লস সমন্বিত</span>
        </div>

        {/* Live Unrealized P&L */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">চলতি ওপেন P&L (লাইভ)</span>
          <div
            className={`text-xl font-extrabold font-mono mt-0.5 ${
              totalOpenPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalOpenPnl >= 0 ? '+' : ''}₹{totalOpenPnl.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">
            {openPositions.length}টি ওপেন পজিশন
          </span>
        </div>

        {/* Available Cash / Margin */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">উপলব্ধ ক্যাশ মার্জিন</span>
          <div className="text-xl font-extrabold font-mono text-slate-100 mt-0.5">
            ₹{Math.round(virtualBalance).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">ব্যবহারযোগ্য ট্রেডিং ফান্ড</span>
        </div>

        {/* Reset Wallet Button */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 block">অ্যাকাউন্ট রিসেট</span>
          <button
            onClick={() => {
              if (confirm('আপনি কি ভার্চুয়াল ব্যালেন্স ₹৫,০০,০০০ এ রিসেট করতে চান?')) {
                resetPaperWallet(500000);
              }
            }}
            className="mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>₹৫ লাখ ফান্ড রিসেট</span>
          </button>
        </div>
      </div>

      {/* Manual Quick Order Bar */}
      <form
        onSubmit={handleManualOrder}
        className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200">কুইক পেপার ট্রেড অর্ডার:</span>
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setOrderType('CALL')}
              className={`px-3 py-1 rounded text-xs font-bold transition ${
                orderType === 'CALL'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CALL (CE)
            </button>
            <button
              type="button"
              onClick={() => setOrderType('PUT')}
              className={`px-3 py-1 rounded text-xs font-bold transition ${
                orderType === 'PUT'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              PUT (PE)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">স্ট্রাইক:</span>
            <input
              type="number"
              value={orderStrike}
              onChange={(e) => setOrderStrike(Number(e.target.value))}
              step={cfg.strikeStep}
              className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-cyan-300 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">প্রিমিয়াম:</span>
            <input
              type="number"
              step="0.5"
              value={orderPremium}
              onChange={(e) => setOrderPremium(Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-slate-100 text-xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">লট:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={orderLots}
              onChange={(e) => setOrderLots(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-slate-100 text-xs"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>অর্ডার প্লেস করুন</span>
          </button>
        </div>
      </form>

      {/* Active Open Positions Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-2">
            <span>সক্রিয় ওপেন পজিশন</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {openPositions.length}
            </span>
          </h4>
          <span className="text-[11px] text-slate-500">
            টিক পরিবর্তনের সাথে সাথে P&L স্বয়ংক্রিয়ভাবে আপডেট হচ্ছে
          </span>
        </div>

        {openPositions.length === 0 ? (
          <div className="p-8 text-center rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-xs">
            বর্তমানে কোনো সক্রিয় পেপার ট্রেড নেই। লাইভ সিগন্যাল কার্ড বা অপশন চেইন থেকে সহজে পেপার ট্রেড ওপেন করুন।
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">ইনস্ট্রুমেন্ট</th>
                  <th className="py-2.5 px-2">টাইপ</th>
                  <th className="py-2.5 px-2 text-right">লট / Qty</th>
                  <th className="py-2.5 px-2 text-right">এন্ট্রি দাম (₹)</th>
                  <th className="py-2.5 px-2 text-right">বর্তমান LTP (₹)</th>
                  <th className="py-2.5 px-2 text-right">SL / Target (₹)</th>
                  <th className="py-2.5 px-3 text-right">লাইভ P&L</th>
                  <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {openPositions.map((pos) => {
                  const isProfit = pos.pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-200">
                        {pos.symbol}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            pos.type === 'CALL'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {pos.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {pos.lots} লট ({pos.quantity})
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        ₹{pos.entryPrice}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-cyan-300">
                        ₹{pos.currentPrice}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-400 text-[11px]">
                        <span className="text-rose-400">SL: {pos.stopLoss}</span> /{' '}
                        <span className="text-emerald-400">T: {pos.target}</span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold text-sm ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}₹{pos.pnl} ({isProfit ? '+' : ''}
                        {pos.pnlPercent}%)
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => closePaperPosition(pos.id, 'MANUAL')}
                          className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-bold flex items-center gap-1 mx-auto transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>এক্সিট</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
