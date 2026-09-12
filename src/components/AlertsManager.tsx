import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle2, Volume2, ShieldAlert } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';
import { soundManager } from '../utils/audio';

export const AlertsManager: React.FC = () => {
  const { alerts, addAlert, removeAlert, selectedInstrument, currentPrice } = useTrading();
  const cfg = INSTRUMENTS[selectedInstrument];

  const [targetPrice, setTargetPrice] = useState<number>(+currentPrice.toFixed(1));
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [note, setNote] = useState<string>('');

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrice) return;
    addAlert(targetPrice, condition, note || `${cfg.symbol} ${condition} ${targetPrice}`);
    setNote('');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-100">
              লাইভ প্রাইস ও সিগন্যাল অ্যালার্ট ম্যানেজার
            </h3>
            <p className="text-[11px] text-slate-400">
              নির্দিষ্ট প্রাইস লেভেল ও সিগন্যাল ব্রেকআউটে অডিও নোটিফিকেশন
            </p>
          </div>
        </div>

        <button
          onClick={() => soundManager.playCallSignal()}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>সাউন্ড টেস্ট</span>
        </button>
      </div>

      {/* Add Alert Form */}
      <form
        onSubmit={handleCreateAlert}
        className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-2.5 text-xs"
      >
        <span className="font-bold text-slate-300">{cfg.symbol}</span>

        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
          className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
        >
          <option value="ABOVE">উপরে উঠলে (&gt;=)</option>
          <option value="BELOW">নিচে নামলে (&lt;=)</option>
        </select>

        <input
          type="number"
          step="0.5"
          value={targetPrice}
          onChange={(e) => setTargetPrice(Number(e.target.value))}
          className="w-28 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
        />

        <input
          type="text"
          placeholder="নোট (যেমন: ডে হাই ব্রেকআউট)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 min-w-[140px] bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />

        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1 shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>অ্যালার্ট যোগ করুন</span>
        </button>
      </form>

      {/* Active Alerts List */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-300">
          সক্রিয় অ্যালার্টসমূহ ({alerts.length}):
        </h4>

        {alerts.length === 0 ? (
          <div className="p-4 text-center rounded-lg bg-slate-950 border border-slate-800 text-slate-500 text-xs">
            কোনো অ্যালার্ট সেট করা নেই। উপরে আপনার পছন্দসই প্রাইস টার্গেট সেট করুন।
          </div>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs font-mono transition ${
                  a.triggered
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell
                    className={`w-4 h-4 ${
                      a.triggered ? 'text-emerald-400 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-slate-200 mr-2">{a.instrument}</span>
                    <span>
                      {a.condition === 'ABOVE' ? '≥' : '≤'} ₹{a.targetPrice}
                    </span>
                    {a.note && (
                      <span className="ml-2 text-slate-400 font-sans text-[11px]">
                        ({a.note})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {a.triggered ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ট্রিগারড হয়েছে!</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">অপেক্ষমাণ...</span>
                  )}

                  <button
                    onClick={() => removeAlert(a.id)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
