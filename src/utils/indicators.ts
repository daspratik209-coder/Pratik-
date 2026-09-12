import { Candle, CalculatedIndicators, TradeSignal, InstrumentKey } from '../types';

// Exponential Moving Average
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const val = data[i] * k + emaArray[i - 1] * (1 - k);
    emaArray.push(val);
  }
  return emaArray;
}

// Relative Strength Index (RSI 14)
export function calculateRSI(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period + 1) {
    return candles.map(() => 50);
  }

  const closes = candles.map((c) => c.close);
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i <= period; i++) {
    rsi.push(50);
  }

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

// Volume Weighted Average Price (VWAP)
export function calculateVWAP(candles: Candle[]): number[] {
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;
  const vwap: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1000;
    cumulativeTypicalPriceVolume += typicalPrice * vol;
    cumulativeVolume += vol;
    vwap.push(cumulativeTypicalPriceVolume / cumulativeVolume);
  }

  return vwap;
}

// Average True Range (ATR)
export function calculateATR(candles: Candle[], period: number = 10): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const currentTR = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      tr.push(currentTR);
    }
  }

  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    sum += tr[i];
    if (i < period) {
      atr.push(sum / (i + 1));
    } else {
      sum -= tr[i - period];
      atr.push(sum / period);
    }
  }
  return atr;
}

// SuperTrend (Period 10, Multiplier 3)
export function calculateSupertrend(
  candles: Candle[],
  period: number = 10,
  multiplier: number = 3
): { values: number[]; trends: ('BULLISH' | 'BEARISH')[] } {
  const atr = calculateATR(candles, period);
  const values: number[] = [];
  const trends: ('BULLISH' | 'BEARISH')[] = [];

  let prevTrend: 'BULLISH' | 'BEARISH' = 'BULLISH';
  let prevUpper = 0;
  let prevLower = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const curAtr = atr[i] || 10;
    const basicUpper = (c.high + c.low) / 2 + multiplier * curAtr;
    const basicLower = (c.high + c.low) / 2 - multiplier * curAtr;

    let finalUpper = basicUpper;
    let finalLower = basicLower;

    if (i > 0) {
      const prevClose = candles[i - 1].close;
      if (basicUpper < prevUpper || prevClose > prevUpper) {
        finalUpper = basicUpper;
      } else {
        finalUpper = prevUpper;
      }

      if (basicLower > prevLower || prevClose < prevLower) {
        finalLower = basicLower;
      } else {
        finalLower = prevLower;
      }
    }

    let currentTrend: 'BULLISH' | 'BEARISH' = prevTrend;
    if (c.close > finalUpper) {
      currentTrend = 'BULLISH';
    } else if (c.close < finalLower) {
      currentTrend = 'BEARISH';
    }

    prevTrend = currentTrend;
    prevUpper = finalUpper;
    prevLower = finalLower;

    trends.push(currentTrend);
    values.push(currentTrend === 'BULLISH' ? finalLower : finalUpper);
  }

  return { values, trends };
}

// Choppiness Index (14 Period)
// CI > 61.8 indicates choppy range-bound market; CI < 38.2 indicates strong trend
export function calculateChoppinessIndex(candles: Candle[], period: number = 14): number {
  if (candles.length < period) return 50;

  const slice = candles.slice(-period);
  let trSum = 0;
  let highestHigh = -Infinity;
  let lowestLow = Infinity;

  for (let i = 0; i < slice.length; i++) {
    const c = slice[i];
    if (c.high > highestHigh) highestHigh = c.high;
    if (c.low < lowestLow) lowestLow = c.low;

    if (i === 0) {
      trSum += c.high - c.low;
    } else {
      const prevC = slice[i - 1];
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - prevC.close),
        Math.abs(c.low - prevC.close)
      );
      trSum += tr;
    }
  }

  const range = highestHigh - lowestLow;
  if (range <= 0) return 65; // flatline is choppy

  const ci = 100 * (Math.log10(trSum / range) / Math.log10(period));
  return Math.min(Math.max(ci, 10), 95);
}

// Complete Technical Indicator Suite for current slice
export function computeIndicators(candles: Candle[]): CalculatedIndicators {
  if (candles.length === 0) {
    return {
      ema9: 0,
      ema21: 0,
      vwap: 0,
      rsi: 50,
      supertrend: { value: 0, trend: 'BULLISH' },
      choppinessIndex: 50,
      isNoTradeZone: false,
    };
  }

  const closes = candles.map((c) => c.close);
  const ema9Arr = calculateEMA(closes, 9);
  const ema21Arr = calculateEMA(closes, 21);
  const vwapArr = calculateVWAP(candles);
  const rsiArr = calculateRSI(candles, 14);
  const stResult = calculateSupertrend(candles, 10, 3);
  const chop = calculateChoppinessIndex(candles, 14);

  const lastIdx = candles.length - 1;
  const lastClose = closes[lastIdx];
  const lastEma9 = ema9Arr[lastIdx];
  const lastEma21 = ema21Arr[lastIdx];
  const lastVwap = vwapArr[lastIdx];
  const lastRsi = rsiArr[lastIdx];
  const lastStVal = stResult.values[lastIdx];
  const lastStTrend = stResult.trends[lastIdx];

  // No Trade Zone Detection Logic:
  // 1. Choppiness Index > 61.8 (High market chop/ranging)
  // 2. EMA 9 and EMA 21 intertwined (< 0.05% difference)
  // 3. Price ping-ponging across VWAP within tight band
  const emaDiffPercent = Math.abs((lastEma9 - lastEma21) / lastClose) * 100;
  const vwapDiffPercent = Math.abs((lastClose - lastVwap) / lastClose) * 100;

  let isNoTrade = false;
  let noTradeReason = '';

  if (chop >= 61.8) {
    isNoTrade = true;
    noTradeReason = `High Market Choppiness (CI: ${chop.toFixed(1)} > 61.8). High risk of false breakouts & option decay.`;
  } else if (emaDiffPercent < 0.04 && vwapDiffPercent < 0.05) {
    isNoTrade = true;
    noTradeReason = `Consolidation Squeeze. EMA 9 & EMA 21 entangled with flat VWAP. Await clear candle breakout.`;
  } else if (lastRsi > 46 && lastRsi < 54 && chop > 56) {
    isNoTrade = true;
    noTradeReason = `Neutral RSI 50 Equilibrium with sideways volume. Protect capital, avoid overtrading.`;
  }

  return {
    ema9: lastEma9,
    ema21: lastEma21,
    vwap: lastVwap,
    rsi: lastRsi,
    supertrend: {
      value: lastStVal,
      trend: lastStTrend,
    },
    choppinessIndex: chop,
    isNoTradeZone: isNoTrade,
    noTradeReason,
  };
}

// Algorithmic Signal Engine: Call vs Put vs No Trade
export function generateSignal(
  candles: Candle[],
  instrument: InstrumentKey,
  strikeStep: number
): TradeSignal {
  const currentPrice = candles[candles.length - 1].close;
  const indicators = computeIndicators(candles);
  const now = Date.now();

  // If in No-Trade Zone, output designated No-Trade signal
  if (indicators.isNoTradeZone) {
    return {
      id: `SIG-NOTRADE-${now}`,
      direction: 'NO_TRADE',
      instrument,
      priceAtSignal: currentPrice,
      entryRange: [currentPrice, currentPrice],
      stopLoss: currentPrice,
      target1: currentPrice,
      target2: currentPrice,
      target3: currentPrice,
      riskReward: 'N/A',
      confidence: 90,
      reasons: [
        indicators.noTradeReason || 'Market is in sideways consolidation.',
        'High option premium decay (Theta trap).',
        'Algorithmic recommendation: Sit on hands, preserve trading capital.',
      ],
      suggestedStrike: {
        type: 'CE',
        strike: Math.round(currentPrice / strikeStep) * strikeStep,
        estimatedLtp: 0,
        expiry: 'Current Expiry',
      },
      generatedAt: now,
      isNoTrade: true,
      noTradeReason: indicators.noTradeReason,
    };
  }

  // Determine Bullish vs Bearish
  const isBullish =
    indicators.ema9 > indicators.ema21 &&
    currentPrice > indicators.vwap &&
    indicators.supertrend.trend === 'BULLISH';

  const isBearish =
    indicators.ema9 < indicators.ema21 &&
    currentPrice < indicators.vwap &&
    indicators.supertrend.trend === 'BEARISH';

  // Fallback to trend based on Supertrend and EMA
  const direction: 'CALL' | 'PUT' = isBullish || (!isBearish && indicators.rsi >= 50) ? 'CALL' : 'PUT';

  // Calculate parameters according to ATR or percentage
  const atr = Math.max(currentPrice * 0.0035, 15); // Dynamic buffer

  let entryLow: number;
  let entryHigh: number;
  let stopLoss: number;
  let t1: number;
  let t2: number;
  let t3: number;
  let suggestedStrikeNum: number;
  const atmStrike = Math.round(currentPrice / strikeStep) * strikeStep;

  if (direction === 'CALL') {
    entryLow = +(currentPrice - atr * 0.2).toFixed(2);
    entryHigh = +(currentPrice + atr * 0.15).toFixed(2);
    stopLoss = +(currentPrice - atr * 1.0).toFixed(2);
    const risk = currentPrice - stopLoss;
    t1 = +(currentPrice + risk * 1.5).toFixed(2);
    t2 = +(currentPrice + risk * 2.5).toFixed(2);
    t3 = +(currentPrice + risk * 3.8).toFixed(2);
    suggestedStrikeNum = atmStrike;
  } else {
    entryLow = +(currentPrice - atr * 0.15).toFixed(2);
    entryHigh = +(currentPrice + atr * 0.2).toFixed(2);
    stopLoss = +(currentPrice + atr * 1.0).toFixed(2);
    const risk = stopLoss - currentPrice;
    t1 = +(currentPrice - risk * 1.5).toFixed(2);
    t2 = +(currentPrice - risk * 2.5).toFixed(2);
    t3 = +(currentPrice - risk * 3.8).toFixed(2);
    suggestedStrikeNum = atmStrike;
  }

  // Calculate confidence
  let confidence = 75;
  const reasons: string[] = [];

  if (direction === 'CALL') {
    reasons.push(`SuperTrend is BULLISH support at ₹${indicators.supertrend.value.toFixed(1)}`);
    if (indicators.ema9 > indicators.ema21) {
      confidence += 7;
      reasons.push('EMA 9 Golden Cross above EMA 21 showing bullish momentum');
    }
    if (currentPrice > indicators.vwap) {
      confidence += 6;
      reasons.push('Price holding firmly above VWAP institutional benchmark');
    }
    if (indicators.rsi > 52 && indicators.rsi < 70) {
      confidence += 5;
      reasons.push(`RSI(14) in strong bullish expansion zone (${indicators.rsi.toFixed(1)})`);
    }
  } else {
    reasons.push(`SuperTrend is BEARISH resistance at ₹${indicators.supertrend.value.toFixed(1)}`);
    if (indicators.ema9 < indicators.ema21) {
      confidence += 7;
      reasons.push('EMA 9 Bearish Cross below EMA 21 showing selling pressure');
    }
    if (currentPrice < indicators.vwap) {
      confidence += 6;
      reasons.push('Price rejected from VWAP, institutional sellers active');
    }
    if (indicators.rsi < 48 && indicators.rsi > 30) {
      confidence += 5;
      reasons.push(`RSI(14) in bearish breakdown zone (${indicators.rsi.toFixed(1)})`);
    }
  }

  // Estimated option premium
  const approxPremium = +(currentPrice * 0.0055).toFixed(1);

  return {
    id: `SIG-${direction}-${now}`,
    direction,
    instrument,
    priceAtSignal: currentPrice,
    entryRange: [entryLow, entryHigh],
    stopLoss,
    target1: t1,
    target2: t2,
    target3: t3,
    riskReward: '1:2.5',
    confidence: Math.min(confidence, 94),
    reasons,
    suggestedStrike: {
      type: direction === 'CALL' ? 'CE' : 'PE',
      strike: suggestedStrikeNum,
      estimatedLtp: approxPremium,
      expiry: 'This Week Expiry',
    },
    generatedAt: now,
    isNoTrade: false,
  };
}
