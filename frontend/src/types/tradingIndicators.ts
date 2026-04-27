// Trading indicator types

export type IndicatorType = 
  | 'SMA'          // Simple Moving Average
  | 'EMA'          // Exponential Moving Average
  | 'RSI'          // Relative Strength Index
  | 'MACD'         // Moving Average Convergence Divergence
  | 'BOLLINGER'    // Bollinger Bands
  | 'VWAP'         // Volume Weighted Average Price
  | 'STOCHASTIC'   // Stochastic Oscillator
  | 'ATR'          // Average True Range
  | 'ICHIMOKU';    // Ichimoku Cloud

export interface IndicatorConfig {
  type: IndicatorType;
  enabled: boolean;
  color: string;
  parameters: Record<string, number>;
}

export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SMAData {
  date: string;
  value: number;
}

export interface EMAData {
  date: string;
  value: number;
}

export interface RSIData {
  date: string;
  value: number;
}

export interface MACDData {
  date: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerData {
  date: string;
  upper: number;
  middle: number;
  lower: number;
}

export interface VWAPData {
  date: string;
  value: number;
}

export interface StochasticData {
  date: string;
  k: number;
  d: number;
}

export interface ATRData {
  date: string;
  value: number;
}

export interface IchimokuData {
  date: string;
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number;
}

export interface IndicatorOverlay {
  sma?: SMAData[];
  ema?: EMAData[];
  bollinger?: BollingerData[];
  vwap?: VWAPData[];
  ichimoku?: IchimokuData[];
}

export interface IndicatorOscillator {
  rsi?: RSIData[];
  macd?: MACDData[];
  stochastic?: StochasticData[];
  atr?: ATRData[];
}

export interface ProcessedIndicators {
  overlay: IndicatorOverlay;
  oscillator: IndicatorOscillator;
}

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  {
    type: 'SMA',
    enabled: false,
    color: '#f59e0b',
    parameters: { period: 20 },
  },
  {
    type: 'EMA',
    enabled: false,
    color: '#22d3ee',
    parameters: { period: 12 },
  },
  {
    type: 'RSI',
    enabled: false,
    color: '#a855f7',
    parameters: { period: 14 },
  },
  {
    type: 'MACD',
    enabled: false,
    color: '#3b82f6',
    parameters: { fast: 12, slow: 26, signal: 9 },
  },
  {
    type: 'BOLLINGER',
    enabled: false,
    color: '#ef4444',
    parameters: { period: 20, stdDev: 2 },
  },
  {
    type: 'VWAP',
    enabled: false,
    color: '#22c55e',
    parameters: {},
  },
  {
    type: 'STOCHASTIC',
    enabled: false,
    color: '#f97316',
    parameters: { kPeriod: 14, dPeriod: 3 },
  },
  {
    type: 'ATR',
    enabled: false,
    color: '#ec4899',
    parameters: { period: 14 },
  },
  {
    type: 'ICHIMOKU',
    enabled: false,
    color: '#14b8a6',
    parameters: { tenkan: 9, kijun: 26, senkou: 52 },
  },
];
