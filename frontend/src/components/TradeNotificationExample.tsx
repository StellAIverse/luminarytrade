/**
 * TradeNotificationExample.tsx
 * 
 * Example component showing how to integrate trade notifications
 */

import React from 'react';
import { useTradeNotifications } from '../hooks/useTradeNotifications';
import TradeNotificationSettings from '../components/TradeNotificationSettings';

const TradeNotificationExample: React.FC = () => {
  const {
    enablePushNotifications,
    disablePushNotifications,
    isPushSupported,
    permissionState,
  } = useTradeNotifications();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Trade Notifications</h1>

      {/* Push Support Warning */}
      {!isPushSupported && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Push notifications are not supported in your browser.
            Please use Chrome, Firefox, or Edge for the best experience.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <button
            onClick={enablePushNotifications}
            disabled={!isPushSupported || permissionState === 'granted'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enable Push Notifications
          </button>
          <button
            onClick={disablePushNotifications}
            disabled={permissionState !== 'granted'}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disable Push Notifications
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Current permission: <strong>{permissionState}</strong>
        </p>
      </div>

      {/* Detailed Settings */}
      <TradeNotificationSettings />

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">How It Works</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Enable push notifications to receive trade alerts even when the app is closed</li>
          <li>• Customize which trade events trigger notifications</li>
          <li>• Click on notifications to view trade details</li>
          <li>• You can disable notifications at any time from settings or your browser</li>
        </ul>
      </div>
    </div>
  );
};

export default TradeNotificationExample;
