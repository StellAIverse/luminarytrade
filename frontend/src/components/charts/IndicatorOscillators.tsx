import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { OHLCVData, IndicatorConfig } from '../../types/tradingIndicators';
import { processIndicators } from '../../utils/indicatorCalculations';
import { useResponsive } from '../../hooks/useResponsive';

interface IndicatorOscillatorsProps {
  data: OHLCVData[];
  indicators: IndicatorConfig[];
  height?: number;
}

const IndicatorOscillators: React.FC<IndicatorOscillatorsProps> = ({
  data,
  indicators,
  height = 200,
}) => {
  const { isMobile } = useResponsive();

  const processedIndicators = useMemo(
    () => processIndicators(data, indicators),
    [data, indicators]
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div style={{
        background: 'rgba(30,30,47,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 11,
        color: '#e2e8f0',
      }}>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span style={{ fontWeight: 600 }}>{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  };

  const oscillators = [];

  // RSI Chart
  if (processedIndicators.oscillator.rsi) {
    oscillators.push(
      <div key="rsi" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
          RSI (Relative Strength Index)
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={processedIndicators.oscillator.rsi}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              interval={isMobile ? 'preserveStartEnd' : 'auto'}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              name="RSI"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // MACD Chart
  if (processedIndicators.oscillator.macd) {
    oscillators.push(
      <div key="macd" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
          MACD (Moving Average Convergence Divergence)
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={processedIndicators.oscillator.macd}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              interval={isMobile ? 'preserveStartEnd' : 'auto'}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Bar
              dataKey="histogram"
              fill="#6366f1"
              fillOpacity={0.6}
              name="Histogram"
            />
            <Line
              type="monotone"
              dataKey="macd"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="MACD"
            />
            <Line
              type="monotone"
              dataKey="signal"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              name="Signal"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Stochastic Chart
  if (processedIndicators.oscillator.stochastic) {
    oscillators.push(
      <div key="stochastic" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
          Stochastic Oscillator
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={processedIndicators.oscillator.stochastic}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              interval={isMobile ? 'preserveStartEnd' : 'auto'}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="k"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="%K"
            />
            <Line
              type="monotone"
              dataKey="d"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              name="%D"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ATR Chart
  if (processedIndicators.oscillator.atr) {
    oscillators.push(
      <div key="atr" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
          ATR (Average True Range)
        </div>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={processedIndicators.oscillator.atr}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              interval={isMobile ? 'preserveStartEnd' : 'auto'}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#ec4899"
              fill="#ec4899"
              fillOpacity={0.2}
              strokeWidth={2}
              name="ATR"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (oscillators.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 24 }}>
      {oscillators}
    </div>
  );
};

export default IndicatorOscillators;
