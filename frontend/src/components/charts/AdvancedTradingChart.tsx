import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { OHLCVData, IndicatorConfig, ProcessedIndicators } from '../../types/tradingIndicators';
import { processIndicators } from '../../utils/indicatorCalculations';
import { useResponsive } from '../../hooks/useResponsive';

interface AdvancedTradingChartProps {
  data: OHLCVData[];
  indicators: IndicatorConfig[];
  loading?: boolean;
  height?: number;
}

const AdvancedTradingChart: React.FC<AdvancedTradingChartProps> = ({
  data,
  indicators,
  loading = false,
  height = 500,
}) => {
  const { isMobile } = useResponsive();
  const [hoveredData, setHoveredData] = useState<OHLCVData | null>(null);

  // Process indicators with memoization for performance
  const processedIndicators = useMemo(
    () => processIndicators(data, indicators),
    [data, indicators]
  );

  // Merge OHLCV data with indicator data
  const chartData = useMemo(() => {
    return data.map((candle, index) => {
      const merged: any = { ...candle };

      // Add overlay indicators
      if (processedIndicators.overlay.sma) {
        const sma = processedIndicators.overlay.sma.find(s => s.date === candle.date);
        if (sma) merged.sma = sma.value;
      }

      if (processedIndicators.overlay.ema) {
        const ema = processedIndicators.overlay.ema.find(e => e.date === candle.date);
        if (ema) merged.ema = ema.value;
      }

      if (processedIndicators.overlay.bollinger) {
        const bb = processedIndicators.overlay.bollinger.find(b => b.date === candle.date);
        if (bb) {
          merged.bollingerUpper = bb.upper;
          merged.bollingerMiddle = bb.middle;
          merged.bollingerLower = bb.lower;
        }
      }

      if (processedIndicators.overlay.vwap) {
        const vwap = processedIndicators.overlay.vwap.find(v => v.date === candle.date);
        if (vwap) merged.vwap = vwap.value;
      }

      if (processedIndicators.overlay.ichimoku) {
        const ichimoku = processedIndicators.overlay.ichimoku.find(i => i.date === candle.date);
        if (ichimoku) {
          merged.tenkan = ichimoku.tenkan;
          merged.kijun = ichimoku.kijun;
          merged.senkouA = ichimoku.senkouA;
          merged.senkouB = ichimoku.senkouB;
        }
      }

      return merged;
    });
  }, [data, processedIndicators]);

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b' }}>No data available</p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div style={{
        background: 'rgba(30,30,47,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '12px 16px',
        fontSize: 12,
        color: '#e2e8f0',
        minWidth: 200,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#94a3b8' }}>
          {new Date(data.date).toLocaleDateString()}
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Open:</span>
            <span style={{ fontWeight: 600 }}>${data.open.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>High:</span>
            <span style={{ fontWeight: 600, color: '#22c55e' }}>${data.high.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Low:</span>
            <span style={{ fontWeight: 600, color: '#ef4444' }}>${data.low.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Close:</span>
            <span style={{ fontWeight: 600 }}>${data.close.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Volume:</span>
            <span style={{ fontWeight: 600 }}>{data.volume.toLocaleString()}</span>
          </div>

          {/* Show active indicators */}
          {data.sma && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4, marginTop: 4 }}>
              <span style={{ color: '#f59e0b' }}>SMA:</span>
              <span style={{ fontWeight: 600 }}>${data.sma.toFixed(2)}</span>
            </div>
          )}
          {data.ema && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#22d3ee' }}>EMA:</span>
              <span style={{ fontWeight: 600 }}>${data.ema.toFixed(2)}</span>
            </div>
          )}
          {data.bollingerUpper && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#ef4444' }}>BB Upper:</span>
                <span style={{ fontWeight: 600 }}>${data.bollingerUpper.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#ef4444' }}>BB Lower:</span>
                <span style={{ fontWeight: 600 }}>${data.bollingerLower.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Get price range with safety checks
  const minPrice = data.length > 0 ? Math.min(...data.map(d => d.low)) : 0;
  const maxPrice = data.length > 0 ? Math.max(...data.map(d => d.high)) : 0;
  const pricePadding = data.length > 0 ? (maxPrice - minPrice) * 0.1 : 10;

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
            interval={isMobile ? 'preserveStartEnd' : 'auto'}
          />
          <YAxis
            domain={[minPrice - pricePadding, maxPrice + pricePadding]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            width={isMobile ? 60 : 80}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Bollinger Bands Area */}
          {processedIndicators.overlay.bollinger && (
            <Area
              type="monotone"
              dataKey="bollingerUpper"
              stroke="none"
              fill="#ef4444"
              fillOpacity={0.1}
            />
          )}

          {/* Price Line */}
          <Line
            type="monotone"
            dataKey="close"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#6366f1', strokeWidth: 2 }}
          />

          {/* SMA */}
          {processedIndicators.overlay.sma && (
            <Line
              type="monotone"
              dataKey="sma"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
            />
          )}

          {/* EMA */}
          {processedIndicators.overlay.ema && (
            <Line
              type="monotone"
              dataKey="ema"
              stroke="#22d3ee"
              strokeWidth={1.5}
              dot={false}
            />
          )}

          {/* Bollinger Bands Lines */}
          {processedIndicators.overlay.bollinger && (
            <>
              <Line
                type="monotone"
                dataKey="bollingerUpper"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bollingerMiddle"
                stroke="#ef4444"
                strokeWidth={1}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bollingerLower"
                stroke="#ef4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            </>
          )}

          {/* VWAP */}
          {processedIndicators.overlay.vwap && (
            <Line
              type="monotone"
              dataKey="vwap"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          )}

          {/* Ichimoku Cloud */}
          {processedIndicators.overlay.ichimoku && (
            <>
              <Line
                type="monotone"
                dataKey="tenkan"
                stroke="#14b8a6"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="kijun"
                stroke="#f97316"
                strokeWidth={1.5}
                dot={false}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AdvancedTradingChart;
