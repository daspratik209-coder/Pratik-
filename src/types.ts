export type InstrumentKey =
  | 'NIFTY'
  | 'BANKNIFTY'
  | 'FINNIFTY'
  | 'SENSEX'
  | 'RELIANCE'
  | 'HDFCBANK'
  | 'BTCUSD';

export interface InstrumentConfig {
  key: InstrumentKey;
  name: string;
  symbol: string;
  category: 'INDEX' | 'STOCK' | 'CRYPTO';
  basePrice: number;
  tickSize: number;
  lotSize: number;
  strikeStep: number;
  currency: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CalculatedIndicators {
  ema9: number;
  ema21: number;
  vwap: number;
  rsi: number;
  supertrend: {
    value: number;
    trend: 'BULLISH' | 'BEARISH';
  };
  choppinessIndex: number;
  isNoTradeZone: boolean;
  noTradeReason?: string;
}

export type SignalDirection = 'CALL' | 'PUT' | 'NO_TRADE';

export interface TradeSignal {
  id: string;
  direction: SignalDirection;
  instrument: InstrumentKey;
  priceAtSignal: number;
  entryRange: [number, number];
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskReward: string;
  confidence: number; // percentage 0-100
  reasons: string[];
  suggestedStrike: {
    type: 'CE' | 'PE';
    strike: number;
    estimatedLtp: number;
    expiry: string;
  };
  generatedAt: number;
  isNoTrade: boolean;
  noTradeReason?: string;
}

export interface OptionStrikeData {
  oi: number;
  chgOi: number;
  volume: number;
  iv: number;
  ltp: number;
  delta: number;
  theta: number;
  buildup: 'LONG_BUILDUP' | 'SHORT_COVERING' | 'SHORT_BUILDUP' | 'LONG_UNWINDING';
}

export interface OptionChainRow {
  strikePrice: number;
  isAtm: boolean;
  isItmCall: boolean;
  isItmPut: boolean;
  call: OptionStrikeData;
  put: OptionStrikeData;
}

export interface OptionChainSummary {
  pcr: number;
  maxPain: number;
  totalCallOi: number;
  totalPutOi: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  expiryDate: string;
}

export interface PaperPosition {
  id: string;
  instrument: InstrumentKey;
  symbol: string;
  type: 'CALL' | 'PUT' | 'EQUITY_BUY' | 'EQUITY_SELL';
  optionType?: 'CE' | 'PE';
  strikePrice?: number;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  lots: number;
  stopLoss: number;
  target: number;
  pnl: number;
  pnlPercent: number;
  status: 'OPEN' | 'CLOSED';
  entryTime: number;
  exitTime?: number;
  exitPrice?: number;
  exitReason?: 'TARGET' | 'STOP_LOSS' | 'MANUAL';
}

export interface TradeJournalEntry {
  id: string;
  date: string;
  instrument: string;
  tradeType: 'CALL (CE)' | 'PUT (PE)' | 'EQUITY';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  outcome: 'WIN' | 'LOSS' | 'BREAKEVEN';
  riskRewardRatio: string;
  strategyUsed: string;
  notes: string;
  exitReason: string;
}

export interface PriceAlert {
  id: string;
  instrument: InstrumentKey;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW' | 'SIGNAL_CHANGE';
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  note?: string;
}

export interface BacktestResult {
  strategyName: string;
  period: string;
  totalTrades: number;
  winRate: number;
  winningTrades: number;
  losingTrades: number;
  netProfit: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  averageRiskReward: string;
  equityCurve: { date: string; equity: number }[];
  recentTrades: {
    id: string;
    type: 'CALL' | 'PUT';
    entry: number;
    exit: number;
    pnl: number;
    outcome: 'WIN' | 'LOSS';
  }[];
}
