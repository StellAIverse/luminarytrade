import React, { useEffect, useState } from 'react';
import { useResponsive } from '../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchNotificationsStart,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  markAsRead,
  markAllAsRead,
  updatePreferences,
  fetchPreferencesStart,
  fetchPreferencesSuccess,
  fetchPreferencesFailure,
} from '../store/slices/notificationSlice';
import { notificationService } from '../services/notification.service';
import { spacing } from '../styles/theme';

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(255,255,255,0.9)',
  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
  padding: 24,
  backdropFilter: 'blur(12px)',
};

const NotificationCenter: React.FC = () => {
  const { isMobile } = useResponsive();
  const dispatch = useAppDispatch();
  const { notifications, preferences, unreadCount, loading, error } = useAppSelector(
    (state) => state.notification
  );
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    setPushSupported('Notification' in window);

    const fetchData = async () => {
      try {
        dispatch(fetchNotificationsStart());
        const notificationsData = await notificationService.getNotifications();
        dispatch(fetchNotificationsSuccess(notificationsData.notifications));
      } catch (err: any) {
        dispatch(fetchNotificationsFailure(err.message || 'Failed to fetch notifications'));
      }

      try {
        dispatch(fetchPreferencesStart());
        const prefsData = await notificationService.getPreferences();
        dispatch(fetchPreferencesSuccess(prefsData));
      } catch (err: any) {
        dispatch(fetchPreferencesFailure(err.message || 'Failed to fetch preferences'));
      }
    };

    fetchData();
  }, [dispatch]);

  const handleRequestPushPermission = async () => {
    if (!pushSupported) {
      alert('Push notifications are not supported in your browser');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // In a real app, you would get the push token from your service worker
        // and register it with the backend
        alert('Push notifications enabled successfully!');
      }
    } catch (err) {
      console.error('Failed to request push permission:', err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      dispatch(markAsRead(notificationId));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      dispatch(markAllAsRead());
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handlePreferenceChange = async (key: string, value: boolean) => {
    try {
      const updatedPrefs = { [key]: value };
      await notificationService.updatePreferences(updatedPrefs);
      dispatch(updatePreferences(updatedPrefs));
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'waitlist':
        return '📋';
      case 'referral':
        return '👥';
      case 'affiliate':
        return '💰';
      case 'bug_report':
        return '🐛';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'waitlist':
        return '#2563eb';
      case 'referral':
        return '#059669';
      case 'affiliate':
        return '#7c3aed';
      case 'bug_report':
        return '#ea580c';
      case 'system':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center' }}>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #dbeafe 0%, #f8fafc 50%, #faf5ff 100%)',
        padding: isMobile ? spacing.md : spacing.xl,
      }}
    >
      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: spacing.lg, background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: isMobile ? 28 : 36 }}>
              Notification Center
            </h1>
            <p style={{ margin: 0, opacity: 0.9 }}>
              Stay updated with waitlist advances, referrals, and rewards
            </p>
          </div>
          {unreadCount > 0 && (
            <div
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.2)',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {unreadCount} unread
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setActiveTab('notifications')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: activeTab === 'notifications' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'notifications' ? '#fff' : '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              background: activeTab === 'preferences' ? '#2563eb' : '#f1f5f9',
              color: activeTab === 'preferences' ? '#fff' : '#64748b',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Preferences
          </button>
        </div>

        {activeTab === 'notifications' && (
          <div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  marginBottom: 16,
                  padding: '10px 20px',
                  borderRadius: 10,
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Mark All as Read
              </button>
            )}

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
                <p style={{ fontSize: 16 }}>No notifications yet</p>
                <p style={{ fontSize: 14 }}>You'll be notified when there are updates</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    style={{
                      padding: 20,
                      background: notification.read ? '#f8fafc' : '#eff6ff',
                      borderRadius: 12,
                      border: notification.read ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #2563eb',
                      cursor: notification.read ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'start' }}>
                      <div
                        style={{
                          fontSize: 28,
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          background: `${getNotificationColor(notification.type)}15`,
                          flexShrink: 0,
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                            {notification.title}
                          </h3>
                          <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px', color: '#475569', lineHeight: 1.6 }}>
                          {notification.message}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: `${getNotificationColor(notification.type)}20`,
                              color: getNotificationColor(notification.type),
                              fontWeight: 600,
                              fontSize: 12,
                              textTransform: 'capitalize',
                            }}
                          >
                            {notification.type.replace('_', ' ')}
                          </span>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: '#f1f5f9',
                              color: '#64748b',
                              fontWeight: 600,
                              fontSize: 12,
                              textTransform: 'capitalize',
                            }}
                          >
                            {notification.channel}
                          </span>
                          {!notification.read && (
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: 8,
                                background: '#dbeafe',
                                color: '#2563eb',
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div style={{ display: 'grid', gap: 24 }}>
            {/* Push Notifications */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Push Notifications</h3>
              {pushSupported ? (
                <button
                  onClick={handleRequestPushPermission}
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
                  Enable Push Notifications
                </button>
              ) : (
                <p style={{ color: '#64748b', fontSize: 14 }}>
                  Push notifications are not supported in your browser
                </p>
              )}
            </div>

            {/* Notification Channels */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Notification Channels</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.emailEnabled}
                    onChange={(e) => handlePreferenceChange('emailEnabled', e.target.checked)}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.pushEnabled}
                    onChange={(e) => handlePreferenceChange('pushEnabled', e.target.checked)}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>

            {/* Notification Types */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Notification Types</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { key: 'waitlistNotifications', label: 'Waitlist Updates', icon: '📋' },
                  { key: 'referralNotifications', label: 'Referral Activity', icon: '👥' },
                  { key: 'affiliateNotifications', label: 'Affiliate Commissions', icon: '💰' },
                  { key: 'bugReportNotifications', label: 'Bug Report Status', icon: '🐛' },
                ].map(({ key, label, icon }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {icon} {label}
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences[key as keyof typeof preferences] as boolean}
                      onChange={(e) => handlePreferenceChange(key, e.target.checked)}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
