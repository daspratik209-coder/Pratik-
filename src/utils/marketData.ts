import {
  InstrumentConfig,
  InstrumentKey,
  Candle,
  OptionChainRow,
  OptionChainSummary,
} from '../types';

export const INSTRUMENTS: Record<InstrumentKey, InstrumentConfig> = {
  NIFTY: {
    key: 'NIFTY',
    name: 'Nifty 50 Index',
    symbol: 'NIFTY 50',
    category: 'INDEX',
    basePrice: 24180.5,
    tickSize: 0.05,
    lotSize: 25,
    strikeStep: 50,
    currency: '₹',
  },
  BANKNIFTY: {
    key: 'BANKNIFTY',
    name: 'Bank Nifty Index',
    symbol: 'BANKNIFTY',
    category: 'INDEX',
    basePrice: 51320.0,
    tickSize: 0.05,
    lotSize: 15,
    strikeStep: 100,
    currency: '₹',
  },
  FINNIFTY: {
    key: 'FINNIFTY',
    name: 'Nifty Financial Services',
    symbol: 'FINNIFTY',
    category: 'INDEX',
    basePrice: 23410.0,
    tickSize: 0.05,
    lotSize: 40,
    strikeStep: 50,
    currency: '₹',
  },
  SENSEX: {
    key: 'SENSEX',
    name: 'BSE Sensex',
    symbol: 'SENSEX',
    category: 'INDEX',
    basePrice: 79650.0,
    tickSize: 0.05,
    lotSize: 10,
    strikeStep: 100,
    currency: '₹',
  },
  RELIANCE: {
    key: 'RELIANCE',
    name: 'Reliance Industries',
    symbol: 'RELIANCE',
    category: 'STOCK',
    basePrice: 2985.0,
    tickSize: 0.05,
    lotSize: 250,
    strikeStep: 20,
    currency: '₹',
  },
  HDFCBANK: {
    key: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    symbol: 'HDFCBANK',
    category: 'STOCK',
    basePrice: 1675.0,
    tickSize: 0.05,
    lotSize: 550,
    strikeStep: 10,
    currency: '₹',
  },
  BTCUSD: {
    key: 'BTCUSD',
    name: 'Bitcoin / USD',
    symbol: 'BTC/USD',
    category: 'CRYPTO',
    basePrice: 68450.0,
    tickSize: 0.5,
    lotSize: 1,
    strikeStep: 500,
    currency: '$',
  },
};

// Generate realistic initial candlestick series
export function generateInitialCandles(
  basePrice: number,
  count: number = 80,
  timeframeMinutes: number = 5
): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const intervalMs = timeframeMinutes * 60 * 1000;
  let currentClose = basePrice;

  // Drift and volatility parameters
  const volatility = basePrice * 0.0018;

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * intervalMs;
    // mild random walk with trending swings
    const trendCycle = Math.sin((count - i) / 12) * (volatility * 0.6);
    const noise = (Math.random() - 0.49) * volatility;
    const delta = trendCycle + noise;

    const open = currentClose;
    const close = Math.max(open + delta, basePrice * 0.5);
    const high = Math.max(open, close) + Math.random() * volatility * 0.7;
    const low = Math.min(open, close) - Math.random() * volatility * 0.7;
    const volume = Math.floor(15000 + Math.random() * 45000);

    candles.push({
      timestamp: time,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume,
    });

    currentClose = close;
  }

  return candles;
}

// Generate realistic Option Chain table based on current spot price
export function generateOptionChain(
  spotPrice: number,
  step: number
): { rows: OptionChainRow[]; summary: OptionChainSummary } {
  const atmStrike = Math.round(spotPrice / step) * step;
  const numStrikes = 9; // 9 above, 9 below, total 19 strikes
  const rows: OptionChainRow[] = [];

  let totalCallOi = 0;
  let totalPutOi = 0;

  for (let i = -numStrikes; i <= numStrikes; i++) {
    const strike = atmStrike + i * step;
    const isAtm = strike === atmStrike;
    const isItmCall = strike < spotPrice;
    const isItmPut = strike > spotPrice;

    // Distance from spot
    const diff = strike - spotPrice;
    const absDiff = Math.abs(diff);

    // Call pricing (Black-Scholes approximation)
    const intrinsicCall = Math.max(0, spotPrice - strike);
    const timeValueCall = Math.max(8, (spotPrice * 0.012) / (1 + (absDiff / (spotPrice * 0.01)) * 0.8));
    const callLtp = +(intrinsicCall + timeValueCall).toFixed(1);

    // Put pricing
    const intrinsicPut = Math.max(0, strike - spotPrice);
    const timeValuePut = Math.max(8, (spotPrice * 0.012) / (1 + (absDiff / (spotPrice * 0.01)) * 0.8));
    const putLtp = +(intrinsicPut + timeValuePut).toFixed(1);

    // Realistic Open Interest profile
    // Calls have higher OI above ATM (resistance), Puts have higher OI below ATM (support)
    const callOiWeight = diff >= 0 ? 1 + (diff / step) * 0.15 : 0.6 / (1 + Math.abs(diff / step) * 0.2);
    const putOiWeight = diff <= 0 ? 1 + (Math.abs(diff) / step) * 0.15 : 0.6 / (1 + (diff / step) * 0.2);

    const callBaseOi = Math.floor((45000 + Math.random() * 65000) * callOiWeight);
    const putBaseOi = Math.floor((48000 + Math.random() * 70000) * putOiWeight);

    const callChgOi = Math.floor((Math.random() - 0.35) * 14000);
    const putChgOi = Math.floor((Math.random() - 0.3) * 16000);

    const callVol = Math.floor(callBaseOi * (0.8 + Math.random() * 0.6));
    const putVol = Math.floor(putBaseOi * (0.8 + Math.random() * 0.6));

    totalCallOi += callBaseOi;
    totalPutOi += putBaseOi;

    // Delta estimation
    const callDelta = +(0.5 - (diff / (spotPrice * 0.04)) * 0.5);
    const safeCallDelta = Math.min(Math.max(callDelta, 0.05), 0.95);
    const safePutDelta = +(safeCallDelta - 1).toFixed(2);

    // Buildup classification
    const callBuildup =
      callChgOi > 0
        ? callLtp > timeValueCall
          ? 'LONG_BUILDUP'
          : 'SHORT_BUILDUP'
        : callLtp > timeValueCall
        ? 'SHORT_COVERING'
        : 'LONG_UNWINDING';

    const putBuildup =
      putChgOi > 0
        ? putLtp > timeValuePut
          ? 'LONG_BUILDUP'
          : 'SHORT_BUILDUP'
        : putLtp > timeValuePut
        ? 'SHORT_COVERING'
        : 'LONG_UNWINDING';

    rows.push({
      strikePrice: strike,
      isAtm,
      isItmCall,
      isItmPut,
      call: {
        oi: callBaseOi,
        chgOi: callChgOi,
        volume: callVol,
        iv: +(13.5 + (absDiff / step) * 0.25 + (Math.random() - 0.5)).toFixed(1),
        ltp: callLtp,
        delta: +safeCallDelta.toFixed(2),
        theta: +(- (callLtp * 0.08 + 2)).toFixed(1),
        buildup: callBuildup,
      },
      put: {
        oi: putBaseOi,
        chgOi: putChgOi,
        volume: putVol,
        iv: +(14.2 + (absDiff / step) * 0.28 + (Math.random() - 0.5)).toFixed(1),
        ltp: putLtp,
        delta: safePutDelta,
        theta: +(- (putLtp * 0.08 + 2)).toFixed(1),
        buildup: putBuildup,
      },
    });
  }

  // Put-Call Ratio
  const pcr = +(totalPutOi / (totalCallOi || 1)).toFixed(2);

  // Calculate Max Pain:
  // For each strike, sum total payout of all calls and puts if price expires there
  let minLoss = Infinity;
  let maxPainStrike = atmStrike;

  for (const candidate of rows) {
    const testStrike = candidate.strikePrice;
    let totalLoss = 0;
    for (const r of rows) {
      // Call loss if testStrike > r.strikePrice
      if (testStrike > r.strikePrice) {
        totalLoss += (testStrike - r.strikePrice) * r.call.oi;
      }
      // Put loss if testStrike < r.strikePrice
      if (testStrike < r.strikePrice) {
        totalLoss += (r.strikePrice - testStrike) * r.put.oi;
      }
    }
    if (totalLoss < minLoss) {
      minLoss = totalLoss;
      maxPainStrike = testStrike;
    }
  }

  const sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    pcr > 1.15 ? 'BULLISH' : pcr < 0.85 ? 'BEARISH' : 'NEUTRAL';

  // Format next Thursday expiry
  const now = new Date();
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7;
  const expiryDate = new Date(now.getTime() + daysUntilThursday * 24 * 60 * 60 * 1000);
  const expiryStr = expiryDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return {
    rows,
    summary: {
      pcr,
      maxPain: maxPainStrike,
      totalCallOi,
      totalPutOi,
      sentiment,
      expiryDate: expiryStr,
    },
  };
}
