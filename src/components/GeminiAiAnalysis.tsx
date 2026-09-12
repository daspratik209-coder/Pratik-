import React, { useState } from 'react';
import { Sparkles, Bot, Send, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Languages } from 'lucide-react';
import { useTrading } from '../context/TradingContext';
import { INSTRUMENTS } from '../utils/marketData';

export const GeminiAiAnalysis: React.FC = () => {
  const {
    selectedInstrument,
    currentPrice,
    indicators,
    signal,
    optionChain,
    geminiState,
    requestGeminiAnalysis,
  } = useTrading();

  const cfg = INSTRUMENTS[selectedInstrument];
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const quickPrompts = [
    {
      title: '📊 মার্কেট স্ট্রাকচার ও এফআইআই বায়াস',
      query: 'বর্তমান টেকনিক্যাল ও অপশন চেইন ডেটার ভিত্তিতে মার্কেট স্ট্রাকচার, এফআইআই/ডিআইআই বায়াস ও সাপোর্ট-রেজিস্ট্যান্স বিশ্লেষণ করুন।',
    },
    {
      title: '⚡ অপশন চেইন ও ওপেন ইন্টারেস্ট বিল্ডআপ',
      query: 'বর্তমান PCR এবং অপশন চেইনের কল/পুট রাইটিং দেখে বড় প্লেয়ারদের পজিশন বিশ্লেষণ করুন। কোন লেভেলে শর্ট কভারিং হতে পারে?',
    },
    {
      title: '⚠️ নো-ট্রেড জোন ও ট্র্যাপ ডিটেকশন',
      query: 'বর্তমানে কি কোনো ফলস ব্রেকআউট বা প্রিমিয়াম ডিকে ট্র্যাপ তৈরি হচ্ছে? নো-ট্রেড লজিক অনুযায়ী ক্যাপিটাল প্রটেকশন বার্তা দিন।',
    },
    {
      title: '🎯 হাই-প্রোবাবিলিটি ট্রেড প্ল্যান (SL ও টার্গেটসহ)',
      query: 'ঝুঁকি কমিয়ে রেশিও ১:২.৫ সহ কল অথবা পুটের জন্য একটি অ্যাকশনেবল ট্রেড সেটআপ দিন।',
    },
  ];

  const handleRunAnalysis = (promptText?: string) => {
    const q = promptText || customPrompt;
    requestGeminiAnalysis(q, lang);
    if (!promptText) setCustomPrompt('');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-100">
                PRATIK AI — জেমিনি মার্কেট ইন্টেলিজেন্স (Gemini 3.8 Flash)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LIVE GENAI
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ইনস্টিটিউশনাল অর্ডার ফ্লো, স্মার্ট মানি কনসেপ্টস ও রিস্ক ম্যানেজমেন্ট
            </p>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setLang('bn')}
              className={`px-2.5 py-1 rounded transition ${
                lang === 'bn' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              বাংলা (Bengali)
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded transition ${
                lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>

          <button
            id="btn-run-gemini-analysis"
            disabled={geminiState.loading}
            onClick={() => handleRunAnalysis()}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${geminiState.loading ? 'animate-spin' : ''}`} />
            <span>{geminiState.loading ? 'বিশ্লেষণ হচ্ছে...' : 'AI অ্যানালাইসিস শুরু'}</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts */}
      <div>
        <span className="text-[11px] text-slate-400 font-semibold block mb-2">
          রেডিমেড প্রম্পটসমূহ:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              disabled={geminiState.loading}
              onClick={() => handleRunAnalysis(qp.query)}
              className="text-left p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 transition group"
            >
              <div className="font-bold text-slate-200 group-hover:text-indigo-300">
                {qp.title}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {qp.query}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis()}
          placeholder="জেমিনি এআই-কে আপনার ট্রেডিং প্রশ্ন করুন (যেমন: 24200 কল অপশন হোল্ড করা কি নিরাপদ?)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => handleRunAnalysis()}
          disabled={geminiState.loading || !customPrompt.trim()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>পাঠান</span>
        </button>
      </div>

      {/* AI Output Display Card */}
      <div className="rounded-lg bg-slate-950 border border-slate-800/80 p-4 min-h-[160px] relative">
        {geminiState.loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            <div className="text-xs text-indigo-300 font-semibold">
              PRATIK AI বর্তমান মার্কেট টিক, অপশন চেইন ও ইন্ডিকেটরসমূহ সিন্থেসাইজ করছে...
            </div>
            <p className="text-[11px] text-slate-500">
              মডেল: Google Gemini 3.8 Flash • প্রসেসিং টাইম ~1-2s
            </p>
          </div>
        ) : geminiState.error ? (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">এআই রেসপন্স ত্রুটি:</strong>
              <span>{geminiState.error}</span>
            </div>
          </div>
        ) : geminiState.analysis ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800 text-slate-500">
              <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <Bot className="w-4 h-4" />
                <span>অ্যালগরিদমিক ডায়াগনসিস রিপোর্ট</span>
              </span>
              <span>{geminiState.timestamp}</span>
            </div>

            <div className="prose prose-invert prose-xs max-w-none text-slate-200 text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
              {geminiState.analysis}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
            <Bot className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-400">
              উপরের কোনো একটি প্রম্পটে ক্লিক করুন অথবা আপনার কাস্টম প্রশ্ন লিখে এআই বিশ্লেষণ শুরু করুন।
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              লাইভ স্পট, VWAP, PCR এবং সুপারট্রেন্ড ডেটা স্বয়ংক্রিয়ভাবে জেমিনি এআই মডেলকে পাঠানো হবে।
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
