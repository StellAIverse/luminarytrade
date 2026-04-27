/**
 * Trading Indicator Calculation Utilities
 * Performance-optimized calculations for technical indicators
 */

import { 
  OHLCVData, 
  SMAData, 
  EMAData, 
  RSIData, 
  MACDData, 
  BollingerData,
  VWAPData,
  StochasticData,
  ATRData,
  IchimokuData,
  ProcessedIndicators,
  IndicatorConfig
} from '../types/tradingIndicators';

/**
 * Simple Moving Average (SMA)
 */
export const calculateSMA = (data: OHLCVData[], period: number): SMAData[] => {
  const result: SMAData[] = [];
  
  if (data.length < period) return result;
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
    result.push({
      date: data[i].date,
      value: sum / period,
    });
  }
  
  return result;
};

/**
 * Exponential Moving Average (EMA)
 */
export const calculateEMA = (data: OHLCVData[], period: number): EMAData[] => {
  const result: EMAData[] = [];
  
  if (data.length < period) return result;
  
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for the first EMA value
  let ema = data.slice(0, period).reduce((acc, candle) => acc + candle.close, 0) / period;
  
  result.push({
    date: data[period - 1].date,
    value: ema,
  });
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({
      date: data[i].date,
      value: ema,
    });
  }
  
  return result;
};

/**
 * Relative Strength Index (RSI)
 */
export const calculateRSI = (data: OHLCVData[], period: number): RSIData[] => {
  const result: RSIData[] = [];
  
  if (data.length < period + 1) return result;
  
  let avgGain = 0;
  let avgLoss = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  // First RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    date: data[period].date,
    value: 100 - (100 / (1 + rs)),
  });
  
  // Calculate subsequent RSI values
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      date: data[i].date,
      value: 100 - (100 / (1 + rs)),
    });
  }
  
  return result;
};

/**
 * Moving Average Convergence Divergence (MACD)
 */
export const calculateMACD = (
  data: OHLCVData[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): MACDData[] => {
  const result: MACDData[] = [];
  
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  // Align EMAs by date
  const macdLine: { date: string; value: number }[] = [];
  const slowMap = new Map(emaSlow.map(e => [e.date, e.value]));
  
  emaFast.forEach(fast => {
    const slowValue = slowMap.get(fast.date);
    if (slowValue !== undefined) {
      macdLine.push({
        date: fast.date,
        value: fast.value - slowValue,
      });
    }
  });
  
  // Calculate signal line (EMA of MACD)
  if (macdLine.length < signalPeriod) return result;
  
  const multiplier = 2 / (signalPeriod + 1);
  let signal = macdLine.slice(0, signalPeriod).reduce((acc, m) => acc + m.value, 0) / signalPeriod;
  
  const startIndex = signalPeriod - 1;
  result.push({
    date: macdLine[startIndex].date,
    macd: macdLine[startIndex].value,
    signal,
    histogram: macdLine[startIndex].value - signal,
  });
  
  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = (macdLine[i].value - signal) * multiplier + signal;
    result.push({
      date: macdLine[i].date,
      macd: macdLine[i].value,
      signal,
      histogram: macdLine[i].value - signal,
    });
  }
  
  return result;
};

/**
 * Bollinger Bands
 */
export const calculateBollingerBands = (
  data: OHLCVData[],
  period: number,
  stdDev: number
): BollingerData[] => {
  const result: BollingerData[] = [];
  
  if (data.length < period) return result;
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((acc, candle) => acc + candle.close, 0) / period;
    
    const variance = slice.reduce((acc, candle) => {
      const diff = candle.close - mean;
      return acc + diff * diff;
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    result.push({
      date: data[i].date,
      upper: mean + (standardDeviation * stdDev),
      middle: mean,
      lower: mean - (standardDeviation * stdDev),
    });
  }
  
  return result;
};

/**
 * Volume Weighted Average Price (VWAP)
 */
export const calculateVWAP = (data: OHLCVData[]): VWAPData[] => {
  const result: VWAPData[] = [];
  let cumulativeVolume = 0;
  let cumulativeTPVolume = 0;
  
  data.forEach(candle => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeVolume += candle.volume;
    cumulativeTPVolume += typicalPrice * candle.volume;
    
    result.push({
      date: candle.date,
      value: cumulativeVolume === 0 ? 0 : cumulativeTPVolume / cumulativeVolume,
    });
  });
  
  return result;
};

/**
 * Stochastic Oscillator
 */
export const calculateStochastic = (
  data: OHLCVData[],
  kPeriod: number,
  dPeriod: number
): StochasticData[] => {
  const result: StochasticData[] = [];
  const kValues: number[] = [];
  
  for (let i = kPeriod - 1; i < data.length; i++) {
    const slice = data.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    const close = data[i].close;
    
    const k = high === low ? 50 : ((close - low) / (high - low)) * 100;
    kValues.push(k);
    
    if (kValues.length >= dPeriod) {
      const d = kValues.slice(-dPeriod).reduce((acc, val) => acc + val, 0) / dPeriod;
      result.push({
        date: data[i].date,
        k,
        d,
      });
    }
  }
  
  return result;
};

/**
 * Average True Range (ATR)
 */
export const calculateATR = (data: OHLCVData[], period: number): ATRData[] => {
  const result: ATRData[] = [];
  
  if (data.length < period) return result;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    trueRanges.push(tr);
  }
  
  // First ATR
  let atr = trueRanges.slice(0, period).reduce((acc, tr) => acc + tr, 0) / period;
  result.push({
    date: data[period].date,
    value: atr,
  });
  
  // Subsequent ATR values
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result.push({
      date: data[i + 1].date,
      value: atr,
    });
  }
  
  return result;
};

/**
 * Ichimoku Cloud
 */
export const calculateIchimoku = (
  data: OHLCVData[],
  tenkanPeriod: number,
  kijunPeriod: number,
  senkouPeriod: number
): IchimokuData[] => {
  const result: IchimokuData[] = [];
  
  const conversionLine = (period: number, index: number): number => {
    if (index < period - 1) return 0;
    const slice = data.slice(index - period + 1, index + 1);
    const high = Math.max(...slice.map(c => c.high));
    const low = Math.min(...slice.map(c => c.low));
    return (high + low) / 2;
  };
  
  for (let i = Math.max(tenkanPeriod, kijunPeriod, senkouPeriod) - 1; i < data.length; i++) {
    const tenkan = conversionLine(tenkanPeriod, i);
    const kijun = conversionLine(kijunPeriod, i);
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = conversionLine(senkouPeriod, i);
    const chikou = i + 26 < data.length ? data[i + 26].close : data[i].close;
    
    result.push({
      date: data[i].date,
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou,
    });
  }
  
  return result;
};

/**
 * Process all enabled indicators
 */
export const processIndicators = (
  data: OHLCVData[],
  configs: IndicatorConfig[]
): ProcessedIndicators => {
  const result: ProcessedIndicators = {
    overlay: {},
    oscillator: {},
  };
  
  configs.forEach(config => {
    if (!config.enabled) return;
    
    switch (config.type) {
      case 'SMA':
        result.overlay.sma = calculateSMA(data, config.parameters.period || 20);
        break;
      case 'EMA':
        result.overlay.ema = calculateEMA(data, config.parameters.period || 12);
        break;
      case 'RSI':
        result.oscillator.rsi = calculateRSI(data, config.parameters.period || 14);
        break;
      case 'MACD':
        result.oscillator.macd = calculateMACD(
          data,
          config.parameters.fast || 12,
          config.parameters.slow || 26,
          config.parameters.signal || 9
        );
        break;
      case 'BOLLINGER':
        result.overlay.bollinger = calculateBollingerBands(
          data,
          config.parameters.period || 20,
          config.parameters.stdDev || 2
        );
        break;
      case 'VWAP':
        result.overlay.vwap = calculateVWAP(data);
        break;
      case 'STOCHASTIC':
        result.oscillator.stochastic = calculateStochastic(
          data,
          config.parameters.kPeriod || 14,
          config.parameters.dPeriod || 3
        );
        break;
      case 'ATR':
        result.oscillator.atr = calculateATR(data, config.parameters.period || 14);
        break;
      case 'ICHIMOKU':
        result.overlay.ichimoku = calculateIchimoku(
          data,
          config.parameters.tenkan || 9,
          config.parameters.kijun || 26,
          config.parameters.senkou || 52
        );
        break;
    }
  });
  
  return result;
};
