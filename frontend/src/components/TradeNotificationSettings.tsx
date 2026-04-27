/**
 * TradeNotificationSettings.tsx
 * 
 * UI component for managing trade notification preferences.
 * Allows users to enable/disable push notifications and customize
 * which trade events trigger notifications.
 */

import React, { useState, useEffect } from 'react';
import { usePreferences } from '../contexts/hooks';
import { pushNotificationService, PermissionState } from '../services/pushNotificationService';

interface TradeNotificationSettingsProps {
  className?: string;
}

const TradeNotificationSettings: React.FC<TradeNotificationSettingsProps> = ({ className }) => {
  const { preferences, updatePreferences } = usePreferences();
  const [permissionState, setPermissionState] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check current permission state
    setPermissionState(pushNotificationService.getPermissionState());
    
    // Check subscription status
    pushNotificationService.isSubscribed().then(setIsSubscribed);
  }, []);

  const handleEnablePushNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationService.subscribe();
      if (result) {
        setIsSubscribed(true);
        setPermissionState('granted');
        updatePreferences({
          notifications: {
            ...preferences.notifications,
            push: true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisablePushNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await pushNotificationService.unsubscribe();
      if (result) {
        setIsSubscribed(false);
        updatePreferences({
          notifications: {
            ...preferences.notifications,
            push: false,
          },
        });
      }
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTradeNotificationToggle = (key: string, value: boolean) => {
    updatePreferences({
      notifications: {
        ...preferences.notifications,
        tradeNotifications: {
          ...preferences.notifications?.tradeNotifications,
          [key]: value,
        },
      },
    });
  };

  const isPushSupported = pushNotificationService.isSupported();

  if (!isPushSupported) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <p className="text-yellow-800 text-sm">
          Push notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Push Notification Main Toggle */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-500 mt-1">
              Receive trade notifications even when the app is closed
            </p>
          </div>
          <div className="flex items-center gap-3">
            {permissionState === 'denied' ? (
              <div className="text-sm text-red-600">
                <p>Blocked</p>
                <p className="text-xs text-gray-500">Enable in browser settings</p>
              </div>
            ) : (
              <button
                onClick={isSubscribed ? handleDisablePushNotifications : handleEnablePushNotifications}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isSubscribed ? 'bg-blue-600' : 'bg-gray-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSubscribed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {permissionState === 'default' && !isSubscribed && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Click the toggle to enable push notifications. You'll be asked for permission.
            </p>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Push notifications are blocked. Please enable them in your browser settings:
            </p>
            <ul className="text-xs text-red-700 mt-2 ml-4 list-disc">
              <li>Chrome: Settings → Privacy and security → Site settings → Notifications</li>
              <li>Firefox: Settings → Privacy & Security → Permissions → Notifications</li>
              <li>Edge: Settings → Cookies and site permissions → Notifications</li>
            </ul>
          </div>
        )}
      </div>

      {/* Trade Notification Types */}
      {isSubscribed && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Notifications</h3>
          <p className="text-sm text-gray-500 mb-4">
            Choose which trade events should trigger notifications
          </p>

          <div className="space-y-4">
            {/* Trade Executed */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Trade Executed</p>
                <p className="text-sm text-gray-500">When a trade is successfully executed</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications?.tradeNotifications?.tradeExecuted !== false}
                  onChange={(e) => handleTradeNotificationToggle('tradeExecuted', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Trade Status Updates */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Trade Status Updates</p>
                <p className="text-sm text-gray-500">When trade status changes (processing, etc.)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications?.tradeNotifications?.tradeStatus !== false}
                  onChange={(e) => handleTradeNotificationToggle('tradeStatus', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Trade Completed */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">Trade Completed</p>
                <p className="text-sm text-gray-500">When a trade is fully completed</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications?.tradeNotifications?.tradeCompleted !== false}
                  onChange={(e) => handleTradeNotificationToggle('tradeCompleted', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Trade Failed */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">Trade Failed</p>
                <p className="text-sm text-gray-500">When a trade fails (always recommended)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications?.tradeNotifications?.tradeFailed !== false}
                  onChange={(e) => handleTradeNotificationToggle('tradeFailed', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Test Notification Button */}
      {isSubscribed && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Notifications</h3>
          <button
            onClick={async () => {
              await pushNotificationService.showNotification({
                title: 'Test Notification',
                body: 'This is a test trade notification from Luminary Trade!',
                tag: 'test-notification',
                actions: [
                  {
                    action: 'view_trade',
                    title: 'View',
                  },
                ],
              });
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md text-sm font-medium transition-colors"
          >
            Send Test Notification
          </button>
        </div>
      )}
    </div>
  );
};

export default TradeNotificationSettings;
