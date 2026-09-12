import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(apiKey),
  });
});

// Gemini Market Analysis Endpoint
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const {
      instrument,
      price,
      changePercent,
      vwap,
      rsi,
      supertrend,
      ema9,
      ema21,
      pcr,
      maxPain,
      isNoTradeZone,
      noTradeReason,
      signalType,
      optionChainSummary,
      userQuery,
      language = 'bn', // 'bn' (Bengali) or 'en' (English)
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in the environment secrets.',
      });
    }

    const systemPrompt = `You are "PRATIK AI" (প্রতীক এআই), an elite quantitative market analyst, algorithmic options strategist, and risk management expert.
Your mission is to provide razor-sharp, institutional-grade market structure analysis, Call/Put signal validation, and risk parameters.

Rules:
1. Always analyze trend structure, key support/resistance levels, Volume-Weighted Average Price (VWAP), Exponential Moving Averages (EMA 9 & 21), Relative Strength Index (RSI 14), Option Chain Put-Call Ratio (PCR), and Max Pain.
2. If the market is in a "No Trade Zone" (choppy, low volume, flat VWAP), explicitly warn the user against forcing trades and emphasize capital preservation.
3. Provide concrete actionable zones: Exact Entry Range, Invalidation / Stop-Loss, and Target 1, 2, 3 with Risk-to-Reward ratio (minimum 1:2).
4. Output language: ${language === 'bn' ? 'Bengali (বাংলা) with English financial terms (e.g., Call, Put, VWAP, Breakout, Stop Loss, Target, PCR) for clarity' : 'English with professional financial precision'}.
5. Format with clean Markdown headers, bullet points, and high-impact visual tags.`;

    const userPrompt = `
Market Snapshot for Analysis:
- Instrument: ${instrument}
- Current Price: ₹${price?.toFixed(2) || 'N/A'} (${changePercent >= 0 ? '+' : ''}${changePercent?.toFixed(2) || '0'}%)
- VWAP: ₹${vwap?.toFixed(2) || 'N/A'}
- RSI (14): ${rsi?.toFixed(1) || 'N/A'}
- EMA (9 / 21): ${ema9?.toFixed(2) || 'N/A'} / ${ema21?.toFixed(2) || 'N/A'}
- SuperTrend: ${supertrend || 'N/A'}
- Option Chain PCR: ${pcr?.toFixed(2) || 'N/A'}
- Max Pain Strike: ${maxPain || 'N/A'}
- Algorithmic Signal Status: ${isNoTradeZone ? `⚠️ NO TRADE ZONE (${noTradeReason})` : signalType}
- Option Chain Highlights: ${optionChainSummary || 'Heavy Put writing at support, Call resistance overhead'}

User Specific Query / Request:
"${userQuery || 'Analyze the current market structure, option chain buildup, and provide a high-probability trade plan or no-trade confirmation.'}"

Please generate:
1. 📊 Market Structure & Institutional Bias (স্মার্ট মানি ও মার্কেট ট্রেন্ড)
2. 🎯 Call / Put Trade Plan or No-Trade Warning (সিগন্যাল ভ্যালিডেশন)
   - Direction (BUY CALL CE / BUY PUT PE / AVOID)
   - Entry Range
   - Strict Stop-Loss
   - Target 1, Target 2, Target 3 (Risk-to-Reward)
3. ⚡ Option Chain & PCR Analysis (পুট-কল রেশিও ও অপশন চেইন রিডিং)
4. 🛡️ Risk Management & Discipline Rules (রিস্ক ম্যানেজমেন্ট বার্তা)
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const analysisText = response.text || 'No response generated from Gemini AI.';
    res.json({
      success: true,
      analysis: analysisText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({
      error: error.message || 'An error occurred during Gemini AI analysis',
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PRATIK AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
