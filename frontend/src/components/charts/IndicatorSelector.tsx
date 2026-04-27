import React, { useState } from 'react';
import { IndicatorConfig, DEFAULT_INDICATORS } from '../../types/tradingIndicators';

interface IndicatorSelectorProps {
  indicators: IndicatorConfig[];
  onChange: (indicators: IndicatorConfig[]) => void;
}

const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({ indicators, onChange }) => {
  const [expandedSection, setExpandedSection] = useState<'overlay' | 'oscillator'>('overlay');

  const toggleIndicator = (type: string) => {
    const updated = indicators.map(ind =>
      ind.type === type ? { ...ind, enabled: !ind.enabled } : ind
    );
    onChange(updated);
  };

  const updateParameter = (type: string, param: string, value: number) => {
    const updated = indicators.map(ind =>
      ind.type === type
        ? { ...ind, parameters: { ...ind.parameters, [param]: value } }
        : ind
    );
    onChange(updated);
  };

  const overlayIndicators = indicators.filter(ind =>
    ['SMA', 'EMA', 'BOLLINGER', 'VWAP', 'ICHIMOKU'].includes(ind.type)
  );

  const oscillatorIndicators = indicators.filter(ind =>
    ['RSI', 'MACD', 'STOCHASTIC', 'ATR'].includes(ind.type)
  );

  const IndicatorCard = ({ indicator }: { indicator: IndicatorConfig }) => (
    <div
      style={{
        padding: 12,
        background: indicator.enabled ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        border: `1px solid ${indicator.enabled ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
        marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: indicator.color,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
            {indicator.type}
          </span>
        </div>
        <button
          onClick={() => toggleIndicator(indicator.type)}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            border: 'none',
            background: indicator.enabled ? '#6366f1' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {indicator.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {indicator.enabled && Object.keys(indicator.parameters).length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {Object.entries(indicator.parameters).map(([param, value]) => (
            <div key={param} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', minWidth: 60 }}>
                {param}:
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => updateParameter(indicator.type, param, Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#e2e8f0',
                  fontSize: 11,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e1e2f 0%, #252540 100%)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 16,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
        Technical Indicators
      </h3>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setExpandedSection('overlay')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: expandedSection === 'overlay' ? '#6366f1' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Overlay
        </button>
        <button
          onClick={() => setExpandedSection('oscillator')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            background: expandedSection === 'oscillator' ? '#6366f1' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Oscillators
        </button>
      </div>

      {/* Indicator List */}
      <div>
        {expandedSection === 'overlay'
          ? overlayIndicators.map(ind => <IndicatorCard key={ind.type} indicator={ind} />)
          : oscillatorIndicators.map(ind => <IndicatorCard key={ind.type} indicator={ind} />)
        }
      </div>

      {/* Quick Stats */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(99,102,241,0.1)',
          borderRadius: 8,
          borderTop: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Active Indicators</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>
          {indicators.filter(i => i.enabled).length} / {indicators.length}
        </div>
      </div>
    </div>
  );
};

export default IndicatorSelector;
