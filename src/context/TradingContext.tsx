import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  InstrumentKey,
  Candle,
  CalculatedIndicators,
  TradeSignal,
  OptionChainRow,
  OptionChainSummary,
  PaperPosition,
  TradeJournalEntry,
  PriceAlert,
} from '../types';
import { INSTRUMENTS } from '../utils/marketData';
import { generateInitialCandles, generateOptionChain } from '../utils/marketData';
import { computeIndicators, generateSignal } from '../utils/indicators';
import { soundManager } from '../utils/audio';

interface GeminiState {
  loading: boolean;
  analysis: string;
  error?: string;
  timestamp?: string;
}

interface TradingContextType {
  selectedInstrument: InstrumentKey;
  setSelectedInstrument: (key: InstrumentKey) => void;
  candles: Candle[];
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  indicators: CalculatedIndicators;
  signal: TradeSignal;
  optionChain: { rows: OptionChainRow[]; summary: OptionChainSummary };
  timeframe: number;
  setTimeframe: (tf: number) => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  tickSpeed: number;
  setTickSpeed: (v: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  // Paper Trading
  virtualBalance: number;
  openPositions: PaperPosition[];
  tradeJournal: TradeJournalEntry[];
  executePaperTrade: (params: {
    type: 'CALL' | 'PUT' | 'EQUITY_BUY';
    strikePrice?: number;
    entryPrice: number;
    stopLoss: number;
    target: number;
    quantity: number;
    symbol: string;
  }) => boolean;
  closePaperPosition: (positionId: string, reason?: 'TARGET' | 'STOP_LOSS' | 'MANUAL') => void;
  closeAllPositions: () => void;
  trailSlToEntry: (positionId: string) => void;
  resetPaperWallet: (amount?: number) => void;
  // Alerts
  alerts: PriceAlert[];
  addAlert: (targetPrice: number, condition: 'ABOVE' | 'BELOW' | 'SIGNAL_CHANGE', note?: string) => void;
  removeAlert: (id: string) => void;
  // Gemini
  geminiState: GeminiState;
  requestGeminiAnalysis: (customQuery?: string, lang?: 'bn' | 'en') => Promise<void>;
  // Force simulate market movement (Bullish impulse / Bearish breakdown / Consolidation chop)
  injectMarketScenario: (scenario: 'BULLISH_BREAKOUT' | 'BEARISH_DUMP' | 'CHOPPY_RANGE') => void;
}

const TradingContext = createContext<TradingContextType | null>(null);

const STORAGE_WALLET_KEY = 'pratik_ai_wallet_balance_v1';
const STORAGE_POSITIONS_KEY = 'pratik_ai_open_positions_v1';
const STORAGE_JOURNAL_KEY = 'pratik_ai_trade_journal_v1';
const STORAGE_ALERTS_KEY = 'pratik_ai_alerts_v1';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentKey>('NIFTY');
  const [timeframe, setTimeframe] = useState<number>(5);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [tickSpeed, setTickSpeed] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Candlesticks & Market state
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateInitialCandles(INSTRUMENTS.NIFTY.basePrice, 80, 5)
  );

  // Indicators & Signal
  const [indicators, setIndicators] = useState<CalculatedIndicators>(() =>
    computeIndicators(candles)
  );
  const [signal, setSignal] = useState<TradeSignal>(() =>
    generateSignal(candles, 'NIFTY', INSTRUMENTS.NIFTY.strikeStep)
  );

  // Option Chain
  const [optionChain, setOptionChain] = useState<{
    rows: OptionChainRow[];
    summary: OptionChainSummary;
  }>(() => generateOptionChain(candles[candles.length - 1].close, INSTRUMENTS.NIFTY.strikeStep));

  // Virtual Wallet & Paper Trading state
  const [virtualBalance, setVirtualBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WALLET_KEY);
      return saved ? parseFloat(saved) : 500000;
    } catch {
      return 500000;
    }
  });

  const [openPositions, setOpenPositions] = useState<PaperPosition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POSITIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [tradeJournal, setTradeJournal] = useState<TradeJournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_JOURNAL_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed initial realistic journal trade for immediate analytics preview
    return [
      {
        id: 'TJ-101',
        date: new Date(Date.now() - 3600 * 1000 * 4).toLocaleDateString() + ' 10:15 AM',
        instrument: 'NIFTY 24200 CE',
        tradeType: 'CALL (CE)',
        entryPrice: 112.5,
        exitPrice: 148.0,
        quantity: 50,
        pnl: 1775,
        pnlPercent: 31.5,
        outcome: 'WIN',
        riskRewardRatio: '1:2.4',
        strategyUsed: 'Supertrend Bullish Flip + VWAP Bounce',
        notes: 'Clean continuation from opening range. T2 reached effortlessly.',
        exitReason: 'TARGET',
      },
      {
        id: 'TJ-102',
        date: new Date(Date.now() - 3600 * 1000 * 2).toLocaleDateString() + ' 12:40 PM',
        instrument: 'BANKNIFTY 51400 PE',
        tradeType: 'PUT (PE)',
        entryPrice: 285.0,
        exitPrice: 255.0,
        quantity: 30,
        pnl: -900,
        pnlPercent: -10.5,
        outcome: 'LOSS',
        riskRewardRatio: '1:2.0',
        strategyUsed: 'Breakdown Fakeout',
        notes: 'Strict SL respected as Choppiness Index spiked into consolidation.',
        exitReason: 'STOP_LOSS',
      },
    ];
  });

  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ALERTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Gemini State
  const [geminiState, setGeminiState] = useState<GeminiState>({
    loading: false,
    analysis: '',
  });

  // Keep references to avoid closures in interval
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const openPositionsRef = useRef(openPositions);
  openPositionsRef.current = openPositions;
  const virtualBalanceRef = useRef(virtualBalance);
  virtualBalanceRef.current = virtualBalance;
  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;

  // Persist wallet, positions, journal
  useEffect(() => {
    localStorage.setItem(STORAGE_WALLET_KEY, virtualBalance.toString());
  }, [virtualBalance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_POSITIONS_KEY, JSON.stringify(openPositions));
  }, [openPositions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_JOURNAL_KEY, JSON.stringify(tradeJournal));
  }, [tradeJournal]);

  useEffect(() => {
    localStorage.setItem(STORAGE_ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Handle instrument change
  const handleSelectInstrument = (key: InstrumentKey) => {
    setSelectedInstrument(key);
    const cfg = INSTRUMENTS[key];
    const newCandles = generateInitialCandles(cfg.basePrice, 80, timeframe);
    setCandles(newCandles);
    const newInd = computeIndicators(newCandles);
    setIndicators(newInd);
    setSignal(generateSignal(newCandles, key, cfg.strikeStep));
    setOptionChain(generateOptionChain(newCandles[newCandles.length - 1].close, cfg.strikeStep));
  };

  // Current Price & Changes
  const currentCandle = candles[candles.length - 1];
  const firstCandle = candles[0];
  const currentPrice = currentCandle.close;
  const priceChange = +(currentPrice - firstCandle.open).toFixed(2);
  const priceChangePercent = +((priceChange / firstCandle.open) * 100).toFixed(2);

  // Live Tick Streaming Engine
  useEffect(() => {
    if (!isStreaming) return;

    const intervalMs = Math.max(1200 / tickSpeed, 300);
    const interval = setInterval(() => {
      const activeCandles = [...candlesRef.current];
      if (activeCandles.length === 0) return;

      const last = { ...activeCandles[activeCandles.length - 1] };
      const cfg = INSTRUMENTS[selectedInstrument];
      const volatility = cfg.basePrice * 0.00035 * tickSpeed;

      // Realistic random tick
      const noise = (Math.random() - 0.495) * volatility;
      const newClose = +(last.close + noise).toFixed(2);
      const newHigh = Math.max(last.high, newClose);
      const newLow = Math.min(last.low, newClose);
      const newVol = last.volume + Math.floor(Math.random() * 80 + 20);

      last.close = newClose;
      last.high = newHigh;
      last.low = newLow;
      last.volume = newVol;

      activeCandles[activeCandles.length - 1] = last;
      setCandles(activeCandles);

      // Periodically recompute indicators and signals
      const ind = computeIndicators(activeCandles);
      setIndicators(ind);

      // Check alerts
      const updatedAlerts = alertsRef.current.map((a) => {
        if (!a.triggered && a.instrument === selectedInstrument) {
          if (
            (a.condition === 'ABOVE' && newClose >= a.targetPrice) ||
            (a.condition === 'BELOW' && newClose <= a.targetPrice)
          ) {
            soundManager.playTargetHit();
            return { ...a, triggered: true, triggeredAt: Date.now() };
          }
        }
        return a;
      });
      setAlerts(updatedAlerts);

      // Update and manage open paper positions live
      const currentPosList = [...openPositionsRef.current];
      let balanceChange = 0;
      const closedPosList: TradeJournalEntry[] = [];
      const remainingPosList: PaperPosition[] = [];

      currentPosList.forEach((pos) => {
        if (pos.status !== 'OPEN') return;
        if (pos.instrument !== selectedInstrument) {
          remainingPosList.push(pos);
          return;
        }

        // Calculate option simulated price change
        // Options move with approx ~0.55 delta of spot movement
        const spotDiff = newClose - pos.entryPrice;
        let pnlPoints = 0;

        if (pos.type === 'CALL') {
          pnlPoints = spotDiff * 0.55;
        } else if (pos.type === 'PUT') {
          pnlPoints = -spotDiff * 0.55;
        } else {
          pnlPoints = spotDiff;
        }

        const updatedLtp = Math.max(1, +(pos.entryPrice + pnlPoints).toFixed(1));
        const currentPnl = Math.round(pnlPoints * pos.quantity);
        const pnlPct = +((pnlPoints / pos.entryPrice) * 100).toFixed(1);

        // Check if Stop Loss hit
        let hitSl = false;
        let hitTarget = false;

        if (pos.type === 'CALL') {
          if (newClose <= pos.stopLoss) hitSl = true;
          if (newClose >= pos.target) hitTarget = true;
        } else if (pos.type === 'PUT') {
          if (newClose >= pos.stopLoss) hitSl = true;
          if (newClose <= pos.target) hitTarget = true;
        }

        if (hitSl || hitTarget) {
          const reason = hitTarget ? 'TARGET' : 'STOP_LOSS';
          if (hitTarget) soundManager.playTargetHit();
          else soundManager.playStopLossHit();

          balanceChange += currentPnl;
          closedPosList.push({
            id: `TJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            instrument: `${pos.symbol} ${pos.strikePrice ? pos.strikePrice + ' ' + pos.optionType : ''}`,
            tradeType: pos.type === 'CALL' ? 'CALL (CE)' : pos.type === 'PUT' ? 'PUT (PE)' : 'EQUITY',
            entryPrice: pos.entryPrice,
            exitPrice: updatedLtp,
            quantity: pos.quantity,
            pnl: currentPnl,
            pnlPercent: pnlPct,
            outcome: currentPnl > 0 ? 'WIN' : currentPnl < 0 ? 'LOSS' : 'BREAKEVEN',
            riskRewardRatio: '1:2.4',
            strategyUsed: 'Algorithmic Signal Execution',
            notes: `Auto-closed as ${reason === 'TARGET' ? 'Target reached' : 'Stop Loss triggered'}.`,
            exitReason: reason,
          });
        } else {
          remainingPosList.push({
            ...pos,
            currentPrice: updatedLtp,
            pnl: currentPnl,
            pnlPercent: pnlPct,
          });
        }
      });

      if (closedPosList.length > 0) {
        setOpenPositions(remainingPosList);
        setTradeJournal((prev) => [...closedPosList, ...prev]);
        setVirtualBalance((prev) => prev + balanceChange);
      } else {
        setOpenPositions(remainingPosList);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isStreaming, tickSpeed, selectedInstrument]);

  // Periodic Option Chain & Signal refresh
  useEffect(() => {
    const cfg = INSTRUMENTS[selectedInstrument];
    const newSignal = generateSignal(candles, selectedInstrument, cfg.strikeStep);
    setSignal(newSignal);

    // Refresh option chain occasionally
    const newChain = generateOptionChain(candles[candles.length - 1].close, cfg.strikeStep);
    setOptionChain(newChain);
  }, [candles.length, selectedInstrument]);

  // Execute Paper Trade
  const executePaperTrade = (params: {
    type: 'CALL' | 'PUT' | 'EQUITY_BUY';
    strikePrice?: number;
    entryPrice: number;
    stopLoss: number;
    target: number;
    quantity: number;
    symbol: string;
  }): boolean => {
    const totalCost = params.entryPrice * params.quantity;
    if (totalCost > virtualBalance) {
      alert(`Insufficient virtual capital! Needed: ₹${totalCost.toLocaleString()}, Available: ₹${virtualBalance.toLocaleString()}`);
      return false;
    }

    const newPos: PaperPosition = {
      id: `POS-${Date.now()}`,
      instrument: selectedInstrument,
      symbol: params.symbol,
      type: params.type,
      optionType: params.type === 'CALL' ? 'CE' : params.type === 'PUT' ? 'PE' : undefined,
      strikePrice: params.strikePrice,
      entryPrice: params.entryPrice,
      currentPrice: params.entryPrice,
      quantity: params.quantity,
      lots: Math.max(1, Math.floor(params.quantity / INSTRUMENTS[selectedInstrument].lotSize)),
      stopLoss: params.stopLoss,
      target: params.target,
      pnl: 0,
      pnlPercent: 0,
      status: 'OPEN',
      entryTime: Date.now(),
    };

    setOpenPositions((prev) => [newPos, ...prev]);
    soundManager.playClick();
    return true;
  };

  // Close Paper Position Manually
  const closePaperPosition = (positionId: string, reason: 'TARGET' | 'STOP_LOSS' | 'MANUAL' = 'MANUAL') => {
    const pos = openPositions.find((p) => p.id === positionId);
    if (!pos) return;

    soundManager.playClick();
    const newJournalEntry: TradeJournalEntry = {
      id: `TJ-${Date.now()}`,
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      instrument: `${pos.symbol} ${pos.strikePrice ? pos.strikePrice + ' ' + pos.optionType : ''}`,
      tradeType: pos.type === 'CALL' ? 'CALL (CE)' : pos.type === 'PUT' ? 'PUT (PE)' : 'EQUITY',
      entryPrice: pos.entryPrice,
      exitPrice: pos.currentPrice,
      quantity: pos.quantity,
      pnl: pos.pnl,
      pnlPercent: pos.pnlPercent,
      outcome: pos.pnl > 0 ? 'WIN' : pos.pnl < 0 ? 'LOSS' : 'BREAKEVEN',
      riskRewardRatio: '1:2.4',
      strategyUsed: 'Manual Discretionary Exit',
      notes: `Closed manually by trader at ₹${pos.currentPrice}.`,
      exitReason: reason,
    };

    setVirtualBalance((prev) => prev + pos.pnl);
    setOpenPositions((prev) => prev.filter((p) => p.id !== positionId));
    setTradeJournal((prev) => [newJournalEntry, ...prev]);
  };

  const closeAllPositions = () => {
    if (openPositions.length === 0) return;
    soundManager.playClick();
    let totalPnl = 0;
    const entries: TradeJournalEntry[] = openPositions.map((pos) => {
      totalPnl += pos.pnl;
      return {
        id: `TJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        instrument: `${pos.symbol} ${pos.strikePrice ? pos.strikePrice + ' ' + pos.optionType : ''}`,
        tradeType: pos.type === 'CALL' ? 'CALL (CE)' : pos.type === 'PUT' ? 'PUT (PE)' : 'EQUITY',
        entryPrice: pos.entryPrice,
        exitPrice: pos.currentPrice,
        quantity: pos.quantity,
        pnl: pos.pnl,
        pnlPercent: pos.pnlPercent,
        outcome: pos.pnl > 0 ? 'WIN' : pos.pnl < 0 ? 'LOSS' : 'BREAKEVEN',
        riskRewardRatio: '1:2.4',
        strategyUsed: 'Panic / Exit All Action',
        notes: `Emergency/Manual exit across all active open positions.`,
        exitReason: 'MANUAL',
      };
    });

    setVirtualBalance((prev) => prev + totalPnl);
    setTradeJournal((prev) => [...entries, ...prev]);
    setOpenPositions([]);
  };

  const trailSlToEntry = (positionId: string) => {
    setOpenPositions((prev) =>
      prev.map((p) => {
        if (p.id === positionId) {
          return { ...p, stopLoss: p.entryPrice };
        }
        return p;
      })
    );
    soundManager.playClick();
  };

  const resetPaperWallet = (amount: number = 500000) => {
    setVirtualBalance(amount);
    setOpenPositions([]);
    soundManager.playClick();
  };

  const addAlert = (targetPrice: number, condition: 'ABOVE' | 'BELOW' | 'SIGNAL_CHANGE', note?: string) => {
    const newAlert: PriceAlert = {
      id: `ALERT-${Date.now()}`,
      instrument: selectedInstrument,
      targetPrice,
      condition,
      createdAt: Date.now(),
      triggered: false,
      note,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    soundManager.playClick();
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Request Gemini Server AI Analysis
  const requestGeminiAnalysis = async (customQuery?: string, lang: 'bn' | 'en' = 'bn') => {
    setGeminiState({ loading: true, analysis: '' });
    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: INSTRUMENTS[selectedInstrument].name,
          price: currentPrice,
          changePercent: priceChangePercent,
          vwap: indicators.vwap,
          rsi: indicators.rsi,
          supertrend: indicators.supertrend.trend,
          ema9: indicators.ema9,
          ema21: indicators.ema21,
          pcr: optionChain.summary.pcr,
          maxPain: optionChain.summary.maxPain,
          isNoTradeZone: indicators.isNoTradeZone,
          noTradeReason: indicators.noTradeReason,
          signalType: signal.direction,
          optionChainSummary: `Total Call OI: ${optionChain.summary.totalCallOi.toLocaleString()}, Total Put OI: ${optionChain.summary.totalPutOi.toLocaleString()}, Sentiment: ${optionChain.summary.sentiment}`,
          userQuery: customQuery,
          language: lang,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to obtain AI analysis');
      }

      setGeminiState({
        loading: false,
        analysis: data.analysis,
        timestamp: new Date().toLocaleTimeString(),
      });
      soundManager.playClick();
    } catch (err: any) {
      setGeminiState({
        loading: false,
        analysis: '',
        error: err.message || 'Error contacting Gemini AI',
      });
    }
  };

  // Force simulate market movement scenarios (testing & user demos)
  const injectMarketScenario = (scenario: 'BULLISH_BREAKOUT' | 'BEARISH_DUMP' | 'CHOPPY_RANGE') => {
    const activeCandles = [...candles];
    const last = activeCandles[activeCandles.length - 1];
    const cfg = INSTRUMENTS[selectedInstrument];

    if (scenario === 'BULLISH_BREAKOUT') {
      const jump = cfg.basePrice * 0.008;
      const newClose = +(last.close + jump).toFixed(2);
      activeCandles.push({
        timestamp: Date.now(),
        open: last.close,
        high: +(newClose + jump * 0.2).toFixed(2),
        low: last.close,
        close: newClose,
        volume: 85000,
      });
      soundManager.playCallSignal();
    } else if (scenario === 'BEARISH_DUMP') {
      const drop = cfg.basePrice * 0.008;
      const newClose = +(last.close - drop).toFixed(2);
      activeCandles.push({
        timestamp: Date.now(),
        open: last.close,
        high: last.close,
        low: +(newClose - drop * 0.2).toFixed(2),
        close: newClose,
        volume: 92000,
      });
      soundManager.playPutSignal();
    } else {
      // Choppy range simulation
      const smallDelta = (Math.random() - 0.5) * (cfg.basePrice * 0.0005);
      activeCandles.push({
        timestamp: Date.now(),
        open: last.close,
        high: last.close + 2,
        low: last.close - 2,
        close: +(last.close + smallDelta).toFixed(2),
        volume: 8000,
      });
      soundManager.playStopLossHit();
    }

    setCandles(activeCandles);
    const ind = computeIndicators(activeCandles);
    setIndicators(ind);
    setSignal(generateSignal(activeCandles, selectedInstrument, cfg.strikeStep));
  };

  return (
    <TradingContext.Provider
      value={{
        selectedInstrument,
        setSelectedInstrument: handleSelectInstrument,
        candles,
        currentPrice,
        priceChange,
        priceChangePercent,
        indicators,
        signal,
        optionChain,
        timeframe,
        setTimeframe,
        isStreaming,
        setIsStreaming,
        tickSpeed,
        setTickSpeed,
        soundEnabled,
        setSoundEnabled,
        virtualBalance,
        openPositions,
        tradeJournal,
        executePaperTrade,
        closePaperPosition,
        closeAllPositions,
        trailSlToEntry,
        resetPaperWallet,
        alerts,
        addAlert,
        removeAlert,
        geminiState,
        requestGeminiAnalysis,
        injectMarketScenario,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within a TradingProvider');
  return ctx;
};
