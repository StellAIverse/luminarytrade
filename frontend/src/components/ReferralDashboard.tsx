import React, { useEffect, useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchReferralStatsStart,
  fetchReferralStatsSuccess,
  fetchReferralStatsFailure,
  fetchReferralsStart,
  fetchReferralsSuccess,
  fetchReferralsFailure,
} from '../store/slices/referralSlice';
import { referralService } from '../services/referral.service';
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

const ReferralDashboard: React.FC = () => {
  const { isMobile } = useResponsive();
  const dispatch = useAppDispatch();
  const { stats, referrals, loading, error } = useAppSelector((state) => state.referral);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(fetchReferralStatsStart());
        const statsData = await referralService.getStats();
        dispatch(fetchReferralStatsSuccess(statsData));
      } catch (err: any) {
        dispatch(fetchReferralStatsFailure(err.message || 'Failed to fetch referral stats'));
      }

      try {
        dispatch(fetchReferralsStart());
        const referralsData = await referralService.getReferrals();
        dispatch(fetchReferralsSuccess(referralsData.referrals));
      } catch (err: any) {
        dispatch(fetchReferralsFailure(err.message || 'Failed to fetch referrals'));
      }
    };

    fetchData();
  }, [dispatch]);

  const handleCopyCode = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopyFeedback('Referral code copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 3000);
    } catch {
      setCopyFeedback('Failed to copy. Please copy manually.');
    }
  };

  const handleCopyLink = async () => {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.referralLink);
      setCopyFeedback('Referral link copied to clipboard!');
      setTimeout(() => setCopyFeedback(''), 3000);
    } catch {
      setCopyFeedback('Failed to copy. Please copy manually.');
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <p>Loading referral dashboard...</p>
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
        background: 'linear-gradient(135deg, #eef6ff 0%, #f8fafc 50%, #fff7ed 100%)',
        padding: isMobile ? spacing.md : spacing.xl,
      }}
    >
      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: spacing.lg, background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 28 : 36 }}>
          Referral Program
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Share your code and earn rewards for every successful referral
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
        <div style={statCardStyle('#2563eb')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Total Referrals</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{stats.totalReferrals}</div>
        </div>
        <div style={statCardStyle('#059669')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Active Referrals</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{stats.activeReferrals}</div>
        </div>
        <div style={statCardStyle('#ea580c')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Total Earnings</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ea580c' }}>${stats.totalEarnings}</div>
        </div>
        <div style={statCardStyle('#7c3aed')}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Conversion Rate</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>{stats.conversionRate}%</div>
        </div>
      </div>

      {/* Referral Code & Link */}
      <div style={{ ...cardStyle, marginBottom: spacing.lg }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 22 }}>Your Referral Code</h2>
        
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>
              Referral Code
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={stats.referralCode}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: '#f8fafc',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              />
              <button
                onClick={handleCopyCode}
                style={{
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6, display: 'block' }}>
              Referral Link
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={stats.referralLink}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  background: '#f8fafc',
                  fontSize: 14,
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '12px 20px',
                  borderRadius: 10,
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>
            </div>
          </div>

          {copyFeedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#dcfce7',
                color: '#166534',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {copyFeedback}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ ...cardStyle }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: activeTab === 'overview' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'overview' ? '#fff' : '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Earnings Overview
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: activeTab === 'referrals' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'referrals' ? '#fff' : '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Referral List
          </button>
        </div>

        {activeTab === 'overview' && (
          <div>
            <h3 style={{ margin: '0 0 16px' }}>Earnings Breakdown</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>Total Earnings</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>${stats.totalEarnings}</div>
              </div>
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>Pending Earnings</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#ea580c' }}>${stats.pendingEarnings}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div>
            <h3 style={{ margin: '0 0 16px' }}>Your Referrals</h3>
            {referrals.length === 0 ? (
              <p style={{ color: '#64748b' }}>No referrals yet. Share your code to get started!</p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    style={{
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{referral.email}</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        Joined {new Date(referral.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          background:
                            referral.status === 'active'
                              ? '#dcfce7'
                              : referral.status === 'converted'
                              ? '#dbeafe'
                              : '#fef3c7',
                          color:
                            referral.status === 'active'
                              ? '#166534'
                              : referral.status === 'converted'
                              ? '#1e40af'
                              : '#92400e',
                          fontWeight: 600,
                          fontSize: 12,
                          textTransform: 'capitalize',
                        }}
                      >
                        {referral.status}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6 }}>
                        ${referral.earnings}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralDashboard;
