/**
 * Dashboard.tsx
 *
 * Advanced data visualization dashboard with 5 interactive chart widgets,
 * time-window controls, summary statistics, export capabilities,
 * and real-time WebSocket data updates.
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useRealtimeDashboard } from '../hooks/useRealtimeDashboard';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FraudHeatmapCell, TimeWindow } from '../types/dashboard.types';
import TimeWindowSelector from './dashboard/TimeWindowSelector';
import CreditScoreTrendChart from './dashboard/CreditScoreTrendChart';
import FraudRiskHeatmap from './dashboard/FraudRiskHeatmap';
import TransactionVolumeChart from './dashboard/TransactionVolumeChart';
import AgentPerformanceChart from './dashboard/AgentPerformanceChart';
import RiskDistributionChart from './dashboard/RiskDistributionChart';
import TradingBonusesChart from './dashboard/TradingBonusesChart';
import ConnectionStatusBar from './dashboard/ConnectionStatusBar';
import LiveAlertFeed from './dashboard/LiveAlertFeed';
import WaitlistStatus from './WaitlistStatus';
import { printDashboard } from '../utils/exportUtils';
import { useResponsive } from '../hooks/useResponsive';
import { createSuccessNotification } from '../contexts/NotificationContext';
import { spacing } from '../styles/theme';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
}

const StatCard: React.FC<StatCardProps> = memo(({ label, value, icon, color, trend }) => (
  <div
    data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
    style={{
      background: 'linear-gradient(135deg, #1e1e2f 0%, #252540 100%)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: { xs: '16px 18px', sm: '20px 22px' }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as string,
      display: 'flex',
      alignItems: 'center',
      gap: { xs: 12, sm: 16 }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as number,
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      transition: 'transform 0.2s',
      minHeight: { xs: 80, sm: 100 }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as number,
    }}
  >
<div style={{
       width: { xs: 48, sm: 52 }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as number,
       height: { xs: 48, sm: 52 }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as number,
       borderRadius: 12,
       background: `${color}22`,
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       fontSize: { xs: 20, sm: 22 }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as number,
     }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {trend && (
        <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>
          {trend}
        </div>
      )}
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

// ─── Drill-down Modal ─────────────────────────────────────────────────────────
 
interface DrillDownModalProps {
  cell: FraudHeatmapCell;
  onClose: () => void;
}

const DrillDownModal: React.FC<DrillDownModalProps> = memo(({ cell, onClose }) => (
 
const DrillDownModal: React.FC<DrillDownModalProps> = ({ cell, onClose }) => (
  <div
    data-testid="drilldown-modal"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      padding: { xs: '16px', sm: '24px' }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as string,
    }}
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: '#1e1e2f',
        borderRadius: { xs: 12, sm: 16 }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as number,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: { xs: '20px', sm: '28px' }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as string,
        minWidth: { xs: '80vw', sm: '340px' }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as string,
        maxWidth: { xs: '90vw', sm: '400px' }[theme.breakpoints.up('sm') ? 'sm' : 'xs'] as unknown as string,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Fraud Detail</h3>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 6,
            color: '#94a3b8',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {[
          { label: 'Day', value: cell.dayLabel },
          { label: 'Hour', value: `${String(cell.hour).padStart(2, '0')}:00 – ${String(cell.hour + 1).padStart(2, '0')}:00` },
          { label: 'Alert Count', value: cell.count },
          { label: 'Severity', value: cell.severity.toUpperCase() },
        ].map((row) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
));

DrillDownModal.displayName = 'DrillDownModal';

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { data, loading, error, timeWindow, setTimeWindow, refresh } = useDashboardData('7D');
  const { summaryPatch, liveScorePoints, liveFraudCells, hasLiveData } = useRealtimeDashboard();
  const { status, latency } = useWebSocket();
  const [drillDownCell, setDrillDownCell] = useState<FraudHeatmapCell | null>(null);
  const { isMobile, isTablet } = useResponsive();

  // Merge live realtime patches on top of snapshot data - memoized to prevent unnecessary recalculations
  const mergedSummary = useMemo(
    () => data
      ? { ...data.summary, ...summaryPatch }
      : null,
    [data, summaryPatch]
  );

  const mergedScoreTrend = useMemo(
    () => [
      ...liveScorePoints,
      ...(data?.creditScoreTrend ?? []),
    ].slice(0, 100),
    [liveScorePoints, data]
  );

  const mergedFraudHeatmap = useMemo(
    () => [
      ...(data?.fraudHeatmap ?? []),
      ...liveFraudCells,
    ],
    [data, liveFraudCells]
  );
  const addNotification = useNotification((state) => state.addNotification);
  const latestBonuses = useRealtimeDashboard().latestBonuses;

  // Merge live realtime patches on top of snapshot data
  const mergedSummary = data
    ? { ...data.summary, ...summaryPatch }
    : null;

  const handleCellClick = useCallback((cell: FraudHeatmapCell) => {
    setDrillDownCell(cell);
  }, []);

  const handleCloseModal = useCallback(() => {
    setDrillDownCell(null);
  }, []);

  const mergedTradingBonuses = data?.tradingBonuses ?? [];
  const mergedBonusBreakdown = data?.bonusBreakdown ?? [];
  const mergedBonusHistory = data?.bonusHistory ?? [];

  // Bonus notifications
  useEffect(() => {
    if (latestBonuses.length > 0) {
      const latest = latestBonuses[0];
      addNotification(
        createSuccessNotification(
          `+${latest.amount} tokens from ${latest.type} bonus - ${latest.description}`,
          'New Trading Bonus!',
          6000
        )
      );
    }
  }, [latestBonuses, addNotification]);

  return (
    <div style={{
      fontFamily: "'Inter', 'IBM Plex Sans', system-ui, -apple-system, sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f0f1a 0%, #151525 100%)',
      padding: isMobile ? `${spacing.md}px` : isTablet ? `${spacing.lg}px` : `${spacing.xl}px`,
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: spacing.xl,
        flexWrap: 'wrap',
        gap: spacing.md,
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #e2e8f0, #6366f1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.01em',
          }}>
            Analytics Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Real-time insights & performance metrics
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* WebSocket status indicator */}
          <ConnectionStatusBar
            status={status}
            latency={latency}
            hasLiveData={hasLiveData}
          />

          <TimeWindowSelector value={timeWindow} onChange={setTimeWindow} />
          <button
            data-testid="refresh-button"
            onClick={refresh}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
          >
            ↻ Refresh
          </button>
          <button
            data-testid="print-button"
            onClick={printDashboard}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#94a3b8',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
          >
            🖨 Print
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12,
          color: '#fca5a5',
          fontSize: 14,
          marginBottom: 20,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Summary Statistics */}
{mergedSummary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(160px, 1fr))' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: { xs: spacing.md, sm: spacing.lg, md: spacing.xl }[theme.breakpoints.up('sm') ? (theme.breakpoints.up('md') ? 'md' : 'sm') : 'xs'] as unknown as number,
          marginBottom: spacing.lg,
        }}>
          <StatCard
            label="Total Transactions"
            value={mergedSummary.totalTransactions}
            icon="📊"
            color="#6366f1"
            trend={`Avg $${data?.volumeStatistics.avg.toLocaleString() ?? '—'}`}
          />
          <StatCard
            label="Avg Credit Score"
            value={mergedSummary.avgCreditScore}
            icon="📈"
            color="#22c55e"
            trend={`Min ${data?.scoreStatistics.min ?? '—'} · Max ${data?.scoreStatistics.max ?? '—'}`}
          />
          <StatCard
            label="Fraud Alerts"
            value={mergedSummary.fraudAlerts}
            icon="🛡"
            color="#f59e0b"
            trend={`${data?.riskDistribution.find((r) => r.name === 'Critical')?.value ?? 0}% critical`}
          />
          <StatCard
            label="Active Agents"
            value={mergedSummary.activeAgents}
            icon="🤖"
            color="#22d3ee"
          />
        <StatCard
          label="Risk Score"
          value={`${mergedSummary.riskScore}%`}
          icon="⚡"
          color="#ef4444"
          trend={`σ ${data?.scoreStatistics.stddev ?? '—'}`}
        />
          <StatCard
            label="Trading Bonuses"
            value={`$${(data?.tradingBonuses?.reduce((s, p) => s + p.bonusAmount, 0) ?? 0).toLocaleString()}`}
            icon="💰"
            color="#22c55e"
            trend={`${data?.bonusBreakdown?.length ?? 0} sources`}
          />
        </div>

        {/* Waitlist Status */}
        <div style={{ marginBottom: spacing.lg }}>
          <WaitlistStatus userEmail={user?.email} />
        </div>
      )}

      {/* Waitlist Status */}
      <div style={{ marginBottom: spacing.lg }}>
        <WaitlistStatus userEmail={user?.email} />
      </div>

{/* Chart Grid */}
       <div style={{
         display: 'grid',
         gridTemplateColumns: isMobile
           ? '1fr'
           : isTablet
             ? 'repeat(2, minmax(0, 1fr))'
             : 'repeat(auto-fit, minmax(300px, 1fr))', // Reduced min width for better mobile support
         gap: { xs: spacing.md, sm: spacing.lg, md: spacing.xl }[theme.breakpoints.up('sm') ? (theme.breakpoints.up('md') ? 'md' : 'sm') : 'xs'] as unknown as number,
       }}>
        <CreditScoreTrendChart
          data={mergedScoreTrend}
          loading={loading}
        />
        <TransactionVolumeChart
          data={data?.transactionVolume ?? []}
          loading={loading}
        />
        <div style={{ gridColumn: 'span 1' }}>
          <FraudRiskHeatmap
            data={mergedFraudHeatmap}
            loading={loading}
            onCellClick={handleCellClick}
          />
        </div>
        <RiskDistributionChart
          data={data?.riskDistribution ?? []}
          loading={loading}
        />
        <div style={{ gridColumn: '1 / -1' }}>
          <TradingBonusesChart
            data={mergedTradingBonuses}
            breakdown={mergedBonusBreakdown}
            loading={loading}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <AgentPerformanceChart
            data={data?.agentPerformance ?? []}
            loading={loading}
          />
        </div>

        {/* Live alert feed — full width, only shown when WS is active */}
        {(status === 'connected' || hasLiveData) && (
          <div style={{ gridColumn: '1 / -1' }}>
            <LiveAlertFeed maxVisible={12} />
          </div>
        )}
      </div>

      {/* Drill-down Modal */}
      {drillDownCell && (
        <DrillDownModal
          cell={drillDownCell}
          onClose={handleCloseModal}
        />
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;