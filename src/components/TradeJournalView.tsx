import React, { useState } from 'react';
import { BookOpen, Award, TrendingUp, TrendingDown, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';
import { useTrading } from '../context/TradingContext';

export const TradeJournalView: React.FC = () => {
  const { tradeJournal } = useTrading();

  // Metrics calculation
  const totalTrades = tradeJournal.length;
  const winningTrades = tradeJournal.filter((t) => t.outcome === 'WIN');
  const losingTrades = tradeJournal.filter((t) => t.outcome === 'LOSS');
  const winRate = totalTrades > 0 ? +((winningTrades.length / totalTrades) * 100).toFixed(1) : 0;
  const netPnL = tradeJournal.reduce((sum, t) => sum + t.pnl, 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 99 : 0;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Date', 'Instrument', 'Type', 'Entry Price', 'Exit Price', 'Qty', 'PnL (INR)', 'Outcome', 'Strategy', 'Notes'];
    const rows = tradeJournal.map((t) => [
      `"${t.date}"`,
      `"${t.instrument}"`,
      `"${t.tradeType}"`,
      t.entryPrice,
      t.exitPrice,
      t.quantity,
      t.pnl,
      `"${t.outcome}"`,
      `"${t.strategyUsed}"`,
      `"${t.notes}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pratik_ai_trade_journal_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-100">
              ট্রেড জার্নাল ও অ্যানালিটিক্স ড্যাশবোর্ড
            </h3>
            <p className="text-[11px] text-slate-400">
              ট্রেডের ভুল ও সফলতা পর্যবেক্ষণ করে সাইকোলজি ও ডিসিপ্লিন বাড়ানো
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={totalTrades === 0}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>CSV এক্সপোর্ট</span>
        </button>
      </div>

      {/* Metrics Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Win Rate */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">উইন রেট (Win Rate)</span>
          <div className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">
            {winRate}%
          </div>
          <span className="text-[10px] text-slate-500">
            {winningTrades.length} জয় / {totalTrades} ট্রেড
          </span>
        </div>

        {/* Net Realized P&L */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">নেট রিয়েলাইজড P&L</span>
          <div
            className={`text-xl font-extrabold font-mono mt-0.5 ${
              netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netPnL >= 0 ? '+' : ''}₹{netPnL.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">মোট অর্জিত লাভ/লোকসান</span>
        </div>

        {/* Profit Factor */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">প্রফিট ফ্যাক্টর</span>
          <div className="text-xl font-extrabold font-mono text-cyan-400 mt-0.5">
            {profitFactor}
          </div>
          <span className="text-[10px] text-slate-500">গ্রস প্রফিট / গ্রস লস</span>
        </div>

        {/* Average R:R */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">গড় রিস্ক-রিওয়ার্ড</span>
          <div className="text-xl font-extrabold font-mono text-indigo-400 mt-0.5">
            1 : 2.4
          </div>
          <span className="text-[10px] text-slate-500">স্ট্যাটিস্টিকাল এক্সপেক্টেন্সি</span>
        </div>
      </div>

      {/* Journal Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-mono text-[11px]">
              <th className="py-2.5 px-3">তারিখ ও সময়</th>
              <th className="py-2.5 px-3">ইনস্ট্রুমেন্ট</th>
              <th className="py-2.5 px-2">টাইপ</th>
              <th className="py-2.5 px-2 text-right">এন্ট্রি (₹)</th>
              <th className="py-2.5 px-2 text-right">এক্সিট (₹)</th>
              <th className="py-2.5 px-2 text-right">নেট P&L (₹)</th>
              <th className="py-2.5 px-2 text-center">ফলাফল</th>
              <th className="py-2.5 px-3">স্ট্র্যাটেজি ও রিফ্লেকশন নোট</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {tradeJournal.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  এখনো কোনো ট্রেড জার্নালে যুক্ত করা হয়নি। পেপার ট্রেড ক্লোজ করলে স্বয়ংক্রিয়ভাবে এখানে লগ হবে।
                </td>
              </tr>
            ) : (
              tradeJournal.map((entry) => {
                const isWin = entry.outcome === 'WIN';
                return (
                  <tr key={entry.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {entry.date}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {entry.instrument}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                        {entry.tradeType}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      ₹{entry.entryPrice}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-300">
                      ₹{entry.exitPrice}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-bold ${
                        isWin ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {entry.pnl >= 0 ? '+' : ''}₹{entry.pnl} ({entry.pnlPercent}%)
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isWin
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isWin ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{entry.outcome}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans text-[11px]">
                      <div className="font-semibold text-cyan-300">
                        {entry.strategyUsed}
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        {entry.notes}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
