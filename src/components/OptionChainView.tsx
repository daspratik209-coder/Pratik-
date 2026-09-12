import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';
import { ShieldAlert, TrendingUp, TrendingDown, Layers, HelpCircle, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react';

export const OptionChainView: React.FC = () => {
  const { optionChain, currentPrice, selectedInstrument, executePaperTrade } = useTrading();
  const cfg = INSTRUMENTS[selectedInstrument];

  const [filterNearAtm, setFilterNearAtm] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { rows, summary } = optionChain;

  // Filter rows if user wants near ATM only
  const displayRows = filterNearAtm
    ? rows.filter((r) => Math.abs(r.strikePrice - currentPrice) <= cfg.strikeStep * 7)
    : rows;

  const handleQuickTrade = (strike: number, type: 'CALL' | 'PUT', ltp: number) => {
    const ok = executePaperTrade({
      type,
      strikePrice: strike,
      entryPrice: ltp,
      stopLoss: +(ltp * 0.75).toFixed(1),
      target: +(ltp * 1.5).toFixed(1),
      quantity: cfg.lotSize * 2,
      symbol: `${cfg.symbol} ${strike} ${type === 'CALL' ? 'CE' : 'PE'}`,
    });

    if (ok) {
      setToastMsg(`${cfg.symbol} ${strike} ${type === 'CALL' ? 'CE' : 'PE'} পেপার ট্রেড ওপেন হয়েছে!`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const getBuildupBadge = (buildup: string) => {
    switch (buildup) {
      case 'LONG_BUILDUP':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">লং বিল্ডআপ</span>;
      case 'SHORT_COVERING':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">শর্ট কভারিং</span>;
      case 'SHORT_BUILDUP':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">শর্ট বিল্ডআপ</span>;
      case 'LONG_UNWINDING':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">লং আনওয়াইন্ডিং</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Toast */}
      {toastMsg && (
        <div className="bg-cyan-500 text-slate-950 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Option Chain Top Intelligence Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Spot Price */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">বর্তমান স্পট প্রাইস</span>
          <div className="text-xl font-extrabold font-mono text-cyan-400 mt-0.5">
            {cfg.currency}{currentPrice.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">এক্সপায়রি: {summary.expiryDate}</span>
        </div>

        {/* PCR */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">পুট-কল রেশিও (PCR)</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-xl font-extrabold font-mono ${
                summary.pcr >= 1.15
                  ? 'text-emerald-400'
                  : summary.pcr <= 0.85
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {summary.pcr}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                summary.pcr >= 1.15
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : summary.pcr <= 0.85
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {summary.sentiment}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {summary.pcr > 1.2 ? 'স্ট্রং বুলিশ ও পুট রাইটিং' : summary.pcr < 0.8 ? 'বেয়ারিশ ও কল রাইটিং' : 'ব্যালেন্সড জোন'}
          </span>
        </div>

        {/* Max Pain Strike */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">ম্যাক্স পেইন স্ট্রাইক (Max Pain)</span>
          <div className="text-xl font-extrabold font-mono text-indigo-400 mt-0.5">
            {summary.maxPain}
          </div>
          <span className="text-[10px] text-slate-500">ইনস্টিটিউশনাল এক্সপায়রি ম্যাগনেট লেভেল</span>
        </div>

        {/* Total OI */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">মোট ওপেন ইন্টারেস্ট (OI)</span>
          <div className="text-xs font-mono font-bold mt-1 space-y-0.5">
            <div className="flex justify-between text-rose-400">
              <span>Call OI:</span>
              <span>{(summary.totalCallOi / 100000).toFixed(2)}L</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Put OI:</span>
              <span>{(summary.totalPutOi / 100000).toFixed(2)}L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterNearAtm(!filterNearAtm)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
              filterNearAtm
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            {filterNearAtm ? 'ATM নিকটবর্তী স্ট্রাইক (Near ATM)' : 'সব স্ট্রাইক দেখান (All)'}
          </button>
          <span className="text-xs text-slate-500">
            লট সাইজ: <strong className="text-slate-300">{cfg.lotSize}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block"></span>
            <span>ITM (In-The-Money)</span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-400 inline-block"></span>
            <span>ATM (At-The-Money)</span>
          </span>
        </div>
      </div>

      {/* Option Chain Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            {/* Top Multi-Header */}
            <tr className="border-b border-slate-800 bg-slate-900/90 text-center font-bold">
              <th colSpan={6} className="py-2 px-3 text-cyan-400 border-r border-slate-800">
                CALL OPTIONS (CE)
              </th>
              <th className="py-2 px-4 text-white bg-slate-800/80">
                STRIKE
              </th>
              <th colSpan={6} className="py-2 px-3 text-amber-400 border-l border-slate-800">
                PUT OPTIONS (PE)
              </th>
            </tr>
            {/* Column Headers */}
            <tr className="border-b border-slate-800/80 bg-slate-950/90 text-[11px] font-mono text-slate-400">
              <th className="py-2 px-2 text-right">OI</th>
              <th className="py-2 px-2 text-right">Chg OI</th>
              <th className="py-2 px-2 text-right">IV</th>
              <th className="py-2 px-2 text-right">Delta</th>
              <th className="py-2 px-2 text-right text-cyan-300 font-bold">LTP (₹)</th>
              <th className="py-2 px-2 text-center border-r border-slate-800">অ্যাকশন</th>

              <th className="py-2 px-4 text-center font-bold text-white bg-slate-900/90">
                স্ট্রাইক
              </th>

              <th className="py-2 px-2 text-center border-l border-slate-800">অ্যাকশন</th>
              <th className="py-2 px-2 text-left text-amber-300 font-bold">LTP (₹)</th>
              <th className="py-2 px-2 text-left">Delta</th>
              <th className="py-2 px-2 text-left">IV</th>
              <th className="py-2 px-2 text-left">Chg OI</th>
              <th className="py-2 px-2 text-left">OI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
            {displayRows.map((row) => {
              const isAtm = row.isAtm;
              const isItmCall = row.isItmCall;
              const isItmPut = row.isItmPut;

              return (
                <tr
                  key={row.strikePrice}
                  className={`hover:bg-slate-800/40 transition ${
                    isAtm ? 'bg-cyan-950/30' : ''
                  }`}
                >
                  {/* CALL SIDE */}
                  {/* Call OI */}
                  <td className={`py-1.5 px-2 text-right ${isItmCall ? 'bg-amber-950/15' : ''}`}>
                    {row.call.oi.toLocaleString()}
                  </td>
                  {/* Call Chg OI */}
                  <td
                    className={`py-1.5 px-2 text-right font-medium ${
                      row.call.chgOi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    } ${isItmCall ? 'bg-amber-950/15' : ''}`}
                  >
                    {row.call.chgOi >= 0 ? '+' : ''}
                    {row.call.chgOi.toLocaleString()}
                  </td>
                  {/* Call IV */}
                  <td className={`py-1.5 px-2 text-right text-slate-400 ${isItmCall ? 'bg-amber-950/15' : ''}`}>
                    {row.call.iv}%
                  </td>
                  {/* Call Delta */}
                  <td className={`py-1.5 px-2 text-right text-slate-400 ${isItmCall ? 'bg-amber-950/15' : ''}`}>
                    {row.call.delta}
                  </td>
                  {/* Call LTP */}
                  <td className={`py-1.5 px-2 text-right font-bold text-cyan-300 ${isItmCall ? 'bg-amber-950/15' : ''}`}>
                    ₹{row.call.ltp}
                  </td>
                  {/* 1-Click Buy Call */}
                  <td className={`py-1.5 px-2 text-center border-r border-slate-800 ${isItmCall ? 'bg-amber-950/15' : ''}`}>
                    <button
                      onClick={() => handleQuickTrade(row.strikePrice, 'CALL', row.call.ltp)}
                      className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold transition"
                      title="Buy Call CE Paper Trade"
                    >
                      BUY CE
                    </button>
                  </td>

                  {/* STRIKE PRICE */}
                  <td
                    className={`py-1.5 px-4 text-center font-bold text-xs ${
                      isAtm
                        ? 'bg-cyan-500/20 text-cyan-300 border-x-2 border-cyan-400'
                        : 'bg-slate-900 text-slate-100'
                    }`}
                  >
                    {row.strikePrice}
                    {isAtm && <span className="block text-[9px] font-normal text-cyan-400">ATM</span>}
                  </td>

                  {/* PUT SIDE */}
                  {/* 1-Click Buy Put */}
                  <td className={`py-1.5 px-2 text-center border-l border-slate-800 ${isItmPut ? 'bg-amber-950/15' : ''}`}>
                    <button
                      onClick={() => handleQuickTrade(row.strikePrice, 'PUT', row.put.ltp)}
                      className="px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-bold transition"
                      title="Buy Put PE Paper Trade"
                    >
                      BUY PE
                    </button>
                  </td>
                  {/* Put LTP */}
                  <td className={`py-1.5 px-2 text-left font-bold text-amber-300 ${isItmPut ? 'bg-amber-950/15' : ''}`}>
                    ₹{row.put.ltp}
                  </td>
                  {/* Put Delta */}
                  <td className={`py-1.5 px-2 text-left text-slate-400 ${isItmPut ? 'bg-amber-950/15' : ''}`}>
                    {row.put.delta}
                  </td>
                  {/* Put IV */}
                  <td className={`py-1.5 px-2 text-left text-slate-400 ${isItmPut ? 'bg-amber-950/15' : ''}`}>
                    {row.put.iv}%
                  </td>
                  {/* Put Chg OI */}
                  <td
                    className={`py-1.5 px-2 text-left font-medium ${
                      row.put.chgOi >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    } ${isItmPut ? 'bg-amber-950/15' : ''}`}
                  >
                    {row.put.chgOi >= 0 ? '+' : ''}
                    {row.put.chgOi.toLocaleString()}
                  </td>
                  {/* Put OI */}
                  <td className={`py-1.5 px-2 text-left ${isItmPut ? 'bg-amber-950/15' : ''}`}>
                    {row.put.oi.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
