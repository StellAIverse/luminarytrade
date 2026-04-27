import React, { useEffect, useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchAffiliateStatsStart,
  fetchAffiliateStatsSuccess,
  fetchAffiliateStatsFailure,
  fetchPayoutsStart,
  fetchPayoutsSuccess,
  fetchPayoutsFailure,
  requestPayoutStart,
  requestPayoutSuccess,
  requestPayoutFailure,
} from '../store/slices/affiliateSlice';
import { affiliateService } from '../services/affiliate.service';
import { spacing } from '../styles/theme';

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(255,255,255,0.9)',
  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
  padding: 24,
  backdropFilter: 'blur(12px)',
};

const statCardStyle = (accent: string): React.CSSProperties => ({
  borderRadius: 14,
  padding: '18px 20px',
  background: `${accent}12`,
  border: `1px solid ${accent}22`,
});

const AffiliateDashboard: React.FC = () => {
  const { isMobile } = useResponsive();
  const dispatch = useAppDispatch();
  const { stats, payouts, loading, error } = useAppSelector((state) => state.affiliate);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('USDC wallet');
  const [payoutFeedback, setPayoutFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'reports'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(fetchAffiliateStatsStart());
        const statsData = await affiliateService.getStats();
        dispatch(fetchAffiliateStatsSuccess(statsData));
      } catch (err: any) {
        dispatch(fetchAffiliateStatsFailure(err.message || 'Failed to fetch affiliate stats'));
      }

      try {
        dispatch(fetchPayoutsStart());
        const payoutsData = await affiliateService.getPayouts();
        dispatch(fetchPayoutsSuccess(payoutsData.payouts));
      } catch (err: any) {
        dispatch(fetchPayoutsFailure(err.message || 'Failed to fetch payouts'));
      }
    };

    fetchData();
  }, [dispatch]);

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);

    if (isNaN(amount) || amount < 100) {
      setPayoutFeedback('Minimum payout amount is $100');
      return;
    }

    if (!stats || amount > stats.pendingCommission) {
      setPayoutFeedback('Insufficient pending commission balance');
      return;
    }

    try {
      dispatch(requestPayoutStart());
      const payout = await affiliateService.requestPayout({
        amount,
        method: payoutMethod,
      });
      dispatch(requestPayoutSuccess(payout));
      setPayoutFeedback(`Payout request for $${amount} submitted successfully!`);
      setPayoutAmount('');
    } catch (err: any) {
      dispatch(requestPayoutFailure(err.message || 'Failed to request payout'));
      setPayoutFeedback(err.message || 'Failed to request payout');
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <p>Loading affiliate dashboard...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center', color: '#ef4444' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #faf5ff 0%, #f8fafc 50%, #eff6ff 100%)',
        padding: isMobile ? spacing.md : spacing.xl,
      }}
    >
      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: spacing.lg, background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', color: '#fff' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 28 : 36 }}>
          Affiliate Program
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Track your commissions, manage payouts, and monitor performance
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <div style={statCardStyle('#7c3aed')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Total Commission</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>${stats.totalCommission}</div>
        </div>
        <div style={statCardStyle('#ea580c')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Pending</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ea580c' }}>${stats.pendingCommission}</div>
        </div>
        <div style={statCardStyle('#059669')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Conversion Rate</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{stats.conversionRate}%</div>
        </div>
        <div style={statCardStyle('#2563eb')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Partner Tier</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{stats.partnerTier}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {(['overview', 'payouts', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: activeTab === tab ? '#7c3aed' : '#f1f5f9',
                color: activeTab === tab ? '#fff' : '#64748b',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 16px' }}>Performance Summary</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Total Clicks</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#2563eb' }}>{stats.totalClicks}</div>
              </div>
              <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Total Signups</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{stats.totalSignups}</div>
              </div>
              <div style={{ padding: 20, background: '#f8fafc', borderRadius: 12 }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Paid Commission</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#7c3aed' }}>${stats.paidCommission}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div>
            <h3 style={{ margin: '0 0 16px' }}>Request Payout</h3>
            <form onSubmit={handlePayoutRequest} style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr auto', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Enter amount"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      fontSize: 16,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>
                    Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      fontSize: 14,
                    }}
                  >
                    <option>USDC wallet</option>
                    <option>Bank transfer</option>
                    <option>PayPal</option>
                  </select>
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    borderRadius: 10,
                    background: '#7c3aed',
                    color: '#fff',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    alignSelf: 'end',
                  }}
                >
                  Request
                </button>
              </div>
              {payoutFeedback && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: payoutFeedback.includes('success') ? '#dcfce7' : '#fef3c7',
                    color: payoutFeedback.includes('success') ? '#166534' : '#92400e',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {payoutFeedback}
                </div>
              )}
            </form>

            <h3 style={{ margin: '0 0 16px' }}>Payout History</h3>
            {payouts.length === 0 ? (
              <p style={{ color: '#64748b' }}>No payout requests yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    style={{
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 10,
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr 1fr',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{payout.id}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        {new Date(payout.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>${payout.amount}</div>
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        background:
                          payout.status === 'paid'
                            ? '#dcfce7'
                            : payout.status === 'processing'
                            ? '#dbeafe'
                            : payout.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          payout.status === 'paid'
                            ? '#166534'
                            : payout.status === 'processing'
                            ? '#1e40af'
                            : payout.status === 'rejected'
                            ? '#991b1b'
                            : '#92400e',
                        fontWeight: 600,
                        fontSize: 13,
                        textTransform: 'capitalize',
                      }}
                    >
                      {payout.status}
                    </div>
                    <div style={{ fontSize: 14, color: '#64748b' }}>{payout.method}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h3 style={{ margin: '0 0 16px' }}>Performance Reports</h3>
            <p style={{ color: '#64748b' }}>Detailed analytics and reports will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateDashboard;
