/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/Header';
import { ChartSection } from './components/ChartSection';
import { TradeExecutionPanel } from './components/TradeExecutionPanel';
import { SignalCard } from './components/SignalCard';
import { PositionCalculator } from './components/PositionCalculator';
import { OptionChainView } from './components/OptionChainView';
import { GeminiAiAnalysis } from './components/GeminiAiAnalysis';
import { PaperTradingView } from './components/PaperTradingView';
import { TradeJournalView } from './components/TradeJournalView';
import { BacktestingView } from './components/BacktestingView';
import { AlertsManager } from './components/AlertsManager';
import { VolatilityHeatMap } from './components/VolatilityHeatMap';
import { ShieldCheck, Cpu, Database, Activity, Sparkles, Flame } from 'lucide-react';

type TabType = 'terminal' | 'volatility' | 'optionChain' | 'gemini' | 'paper' | 'journal' | 'backtest';

const MainDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('terminal');
  const { openPositions } = useTrading();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* App Header & Navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-4">
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Live Chart, Volatility Heat Map, Trade Execution Terminal, Risk Calculator & Alerts */}
            <div className="lg:col-span-8 space-y-4">
              <ChartSection />
              <VolatilityHeatMap />
              <TradeExecutionPanel />
              <PositionCalculator />
              <AlertsManager />
            </div>

            {/* Right Column: Algorithmic Signal Card & Gemini AI Preview */}
            <div className="lg:col-span-4 space-y-4">
              <SignalCard />

              {/* Volatility & Sentiment Concentration Snapshot Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>ভলাট্যালিটি ও সেন্টিমেন্ট হিটম্যাপ</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('volatility')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    ফুলস্ক্রিন ভিউ →
                  </button>
                </div>
                <div className="mt-2.5 text-xs space-y-2 text-slate-300">
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">D3.js হিটম্যাপ স্ট্যাটাস:</span>
                    <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      সক্রিয় (Active)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">সেন্টিমেন্ট কনসেন্ট্রেশন:</span>
                    <span className="font-mono font-bold text-cyan-300">PCR ও OI ক্লাস্টার ভিত্তিক</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">ভলাট্যালিটি মডেল:</span>
                    <span className="font-semibold text-amber-300">IV Smile & Skew Analysis</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('volatility')}
                  className="w-full mt-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-amber-900/30 transition flex items-center justify-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>ফুল ভলাট্যালিটি হিটম্যাপ খুলুন</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>জেমিনি এআই লাইভ ইন্টেলিজেন্স</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('gemini')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    সম্পূর্ণ দেখুন →
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  ইনস্টিটিউশনাল স্মার্ট মানি কনসেপ্ট, সাপোর্ট-রেজিস্ট্যান্স ও ফলস ব্রেকআউট ডিটেকশন করতে জেমিনি ৩.৮ ফ্ল্যাশ চালিত অ্যানালাইসিস ব্যবহার করুন।
                </p>
                <button
                  onClick={() => setActiveTab('gemini')}
                  className="w-full mt-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition"
                >
                  জেমিনি অ্যানালাইসিস খুলুন
                </button>
              </div>

              {/* Quick Option Chain Preview Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>অপশন চেইন হাইলাইটস</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('optionChain')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    ফুল চেইন →
                  </button>
                </div>
                <div className="mt-2 text-xs space-y-1.5 text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Put-Call Ratio (PCR):</span>
                    <span className="font-mono font-bold text-emerald-400">1.24 (বুলিশ বায়াস)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">ম্যাক্স পেইন লেভেল:</span>
                    <span className="font-mono font-bold text-indigo-400">ATM সাপোর্ট জোন</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">রাইটিং সেন্টিমেন্ট:</span>
                    <span className="font-semibold text-cyan-300">হেভি পুট রাইটিং</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'volatility' && <VolatilityHeatMap />}
        {activeTab === 'optionChain' && <OptionChainView />}
        {activeTab === 'gemini' && <GeminiAiAnalysis />}
        {activeTab === 'paper' && <PaperTradingView />}
        {activeTab === 'journal' && <TradeJournalView />}
        {activeTab === 'backtest' && <BacktestingView />}
      </main>

      {/* Footer & Market Architecture Health Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3 px-4 text-xs text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>লাইভ মার্কেট ইঞ্জিন: সক্রিয় (Tick ~1.2s)</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>সিগন্যাল এলগো: SuperTrend + EMA + VWAP</span>
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-slate-400">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>লোকাল স্টেট পারসিস্টেন্স: Active</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            PRATIK AI • ভার্চুয়াল পেপার ট্রেডিং ও অ্যানালিটিক্স প্ল্যাটফর্ম
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <MainDashboard />
    </TradingProvider>
  );
}
