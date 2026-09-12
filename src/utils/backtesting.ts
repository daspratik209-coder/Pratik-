import { Candle, BacktestResult } from '../types';
import { calculateEMA, calculateSupertrend, calculateVWAP, calculateRSI } from './indicators';

export type StrategyKey = 'PRATIK_TREND' | 'VWAP_MOMENTUM' | 'PCR_REVERSION' | 'BREAKOUT_VOLATILITY';

export function runBacktest(
  candles: Candle[],
  strategyKey: StrategyKey,
  initialCapital: number = 100000,
  lotSize: number = 25
): BacktestResult {
  const closes = candles.map((c) => c.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const vwap = calculateVWAP(candles);
  const rsi = calculateRSI(candles, 14);
  const supertrend = calculateSupertrend(candles, 10, 3);

  let capital = initialCapital;
  const equityCurve: { date: string; equity: number }[] = [];
  const trades: {
    id: string;
    type: 'CALL' | 'PUT';
    entry: number;
    exit: number;
    pnl: number;
    outcome: 'WIN' | 'LOSS';
  }[] = [];

  let inPosition: {
    type: 'CALL' | 'PUT';
    entryPrice: number;
    stopLoss: number;
    target: number;
    qty: number;
    entryBar: number;
  } | null = null;

  let peakCapital = initialCapital;
  let maxDrawdown = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let grossProfits = 0;
  let grossLosses = 0;

  for (let i = 25; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];
    const dateStr = new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Manage open trade
    if (inPosition) {
      let exitPrice: number | null = null;
      let exitReason: 'WIN' | 'LOSS' | null = null;

      if (inPosition.type === 'CALL') {
        if (c.high >= inPosition.target) {
          exitPrice = inPosition.target;
          exitReason = 'WIN';
        } else if (c.low <= inPosition.stopLoss) {
          exitPrice = inPosition.stopLoss;
          exitReason = 'LOSS';
        } else if (i - inPosition.entryBar >= 12) {
          // Time-based exit
          exitPrice = c.close;
          exitReason = exitPrice > inPosition.entryPrice ? 'WIN' : 'LOSS';
        }
      } else {
        // PUT
        if (c.low <= inPosition.target) {
          exitPrice = inPosition.target;
          exitReason = 'WIN';
        } else if (c.high >= inPosition.stopLoss) {
          exitPrice = inPosition.stopLoss;
          exitReason = 'LOSS';
        } else if (i - inPosition.entryBar >= 12) {
          exitPrice = c.close;
          exitReason = exitPrice < inPosition.entryPrice ? 'WIN' : 'LOSS';
        }
      }

      if (exitPrice !== null && exitReason !== null) {
        const pointDiff = inPosition.type === 'CALL'
          ? exitPrice - inPosition.entryPrice
          : inPosition.entryPrice - exitPrice;
        
        // Option points conversion (~0.5 delta)
        const optionPoint = pointDiff * 0.55;
        const tradePnl = Math.round(optionPoint * inPosition.qty);

        capital += tradePnl;
        if (tradePnl > 0) {
          totalWins++;
          grossProfits += tradePnl;
        } else {
          totalLosses++;
          grossLosses += Math.abs(tradePnl);
        }

        trades.push({
          id: `BT-${trades.length + 1}`,
          type: inPosition.type,
          entry: +inPosition.entryPrice.toFixed(1),
          exit: +exitPrice.toFixed(1),
          pnl: tradePnl,
          outcome: tradePnl > 0 ? 'WIN' : 'LOSS',
        });

        inPosition = null;
      }
    }

    // Check entry signals if not in position
    if (!inPosition) {
      let signal: 'CALL' | 'PUT' | null = null;

      if (strategyKey === 'PRATIK_TREND') {
        // Supertrend + EMA 9/21 cross confirmation
        const emaCrossUp = ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1];
        const emaCrossDown = ema9[i] < ema21[i] && ema9[i - 1] >= ema21[i - 1];

        if (emaCrossUp && supertrend.trends[i] === 'BULLISH' && c.close > vwap[i]) {
          signal = 'CALL';
        } else if (emaCrossDown && supertrend.trends[i] === 'BEARISH' && c.close < vwap[i]) {
          signal = 'PUT';
        }
      } else if (strategyKey === 'VWAP_MOMENTUM') {
        // VWAP Bounce with RSI confirmation
        const bouncedAboveVwap = prevC.low <= vwap[i - 1] && c.close > vwap[i] && rsi[i] > 52;
        const rejectedBelowVwap = prevC.high >= vwap[i - 1] && c.close < vwap[i] && rsi[i] < 48;
        if (bouncedAboveVwap) signal = 'CALL';
        else if (rejectedBelowVwap) signal = 'PUT';
      } else if (strategyKey === 'BREAKOUT_VOLATILITY') {
        // 10-bar Donchian breakout
        const highestPast10 = Math.max(...candles.slice(i - 10, i).map((x) => x.high));
        const lowestPast10 = Math.min(...candles.slice(i - 10, i).map((x) => x.low));

        if (c.close > highestPast10 && rsi[i] > 55) signal = 'CALL';
        else if (c.close < lowestPast10 && rsi[i] < 45) signal = 'PUT';
      } else {
        // PCR / Mean reversion
        if (rsi[i] < 32 && c.close > c.open) signal = 'CALL';
        else if (rsi[i] > 68 && c.close < c.open) signal = 'PUT';
      }

      if (signal) {
        const riskDistance = Math.max(c.close * 0.003, 20);
        inPosition = {
          type: signal,
          entryPrice: c.close,
          stopLoss: signal === 'CALL' ? c.close - riskDistance : c.close + riskDistance,
          target: signal === 'CALL' ? c.close + riskDistance * 2.2 : c.close - riskDistance * 2.2,
          qty: lotSize * 2,
          entryBar: i,
        };
      }
    }

    // Track peak and drawdown
    if (capital > peakCapital) peakCapital = capital;
    const currentDrawdown = ((peakCapital - capital) / peakCapital) * 100;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

    equityCurve.push({
      date: dateStr,
      equity: capital,
    });
  }

  const totalTrades = totalWins + totalLosses;
  const winRate = totalTrades > 0 ? +((totalWins / totalTrades) * 100).toFixed(1) : 0;
  const netProfit = capital - initialCapital;
  const profitFactor = grossLosses > 0 ? +(grossProfits / grossLosses).toFixed(2) : grossProfits > 0 ? 99.0 : 0;

  const strategyNames: Record<StrategyKey, string> = {
    PRATIK_TREND: 'PRATIK AI Multi-Confluence Engine (Supertrend + EMA 9/21 + VWAP)',
    VWAP_MOMENTUM: 'VWAP Institutional Pullback & RSI Expansion',
    BREAKOUT_VOLATILITY: 'Dynamic Range Breakout & Volume Surge',
    PCR_REVERSION: 'Option Chain PCR & Extreme RSI Mean Reversion',
  };

  return {
    strategyName: strategyNames[strategyKey],
    period: 'Intraday High-Frequency (Simulated 80 Candles)',
    totalTrades,
    winRate,
    winningTrades: totalWins,
    losingTrades: totalLosses,
    netProfit,
    profitFactor,
    maxDrawdownPercent: +maxDrawdown.toFixed(1),
    averageRiskReward: '1:2.2',
    equityCurve,
    recentTrades: trades.slice(-8),
  };
}
