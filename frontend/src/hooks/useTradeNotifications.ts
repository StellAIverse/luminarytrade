/**
 * useTradeNotifications.ts
 * 
 * Custom hook to integrate push notifications with trade WebSocket events.
 * Listens for trade events and displays push notifications based on user preferences.
 */

import { useEffect, useRef } from 'react';
import { useWebSocket, useWsSubscription } from '../context/WebSocketContext';
import { useNotification } from '../contexts/NotificationContext';
import { usePreferences } from '../contexts/hooks';
import { pushNotificationService } from '../services/pushNotificationService';
import {
  TradeExecutedPayload,
  TradeStatusPayload,
  TradeNotificationPayload,
} from '../services/WebSocketManager';

export function useTradeNotifications() {
  const { subscribe } = useWebSocket();
  const { addNotification } = useNotification();
  const { preferences } = usePreferences();
  const preferencesRef = useRef(preferences);

  // Keep ref updated with latest preferences
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Check if user wants trade notifications
  const shouldShowTradeNotification = (): boolean => {
    const prefs = preferencesRef.current;
    return (
      prefs?.notifications?.push === true &&
      prefs?.notifications?.tradeNotifications !== undefined
    );
  };

  // Check if user wants specific trade notification type
  const shouldShowTradeType = (type: 'tradeExecuted' | 'tradeStatus' | 'tradeFailed' | 'tradeCompleted'): boolean => {
    const prefs = preferencesRef.current;
    if (!prefs?.notifications?.tradeNotifications) {
      return true; // Default to showing if not configured
    }

    switch (type) {
      case 'tradeExecuted':
        return prefs.notifications.tradeNotifications.tradeExecuted !== false;
      case 'tradeStatus':
        return prefs.notifications.tradeNotifications.tradeStatus !== false;
      case 'tradeFailed':
        return prefs.notifications.tradeNotifications.tradeFailed !== false;
      case 'tradeCompleted':
        return prefs.notifications.tradeNotifications.tradeCompleted !== false;
      default:
        return true;
    }
  };

  // Handle trade executed event
  const handleTradeExecuted = (payload: TradeExecutedPayload) => {
    if (!shouldShowTradeNotification() || !shouldShowTradeType('tradeExecuted')) {
      return;
    }

    const { tradeId, asset, type, amount, price, total, status } = payload;

    // Show in-app notification
    addNotification({
      type: status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'info',
      title: `${type === 'buy' ? 'Buy' : 'Sell'} Order ${status}`,
      message: `${amount} ${asset} @ ${price}`,
      duration: 5000,
      metadata: { tradeId, asset, type, amount, price, total },
    });

    // Show push notification
    pushNotificationService.showTradeExecutedNotification(
      tradeId,
      asset,
      type,
      amount,
      price,
      total
    );
  };

  // Handle trade status update event
  const handleTradeStatus = (payload: TradeStatusPayload) => {
    if (!shouldShowTradeNotification() || !shouldShowTradeType('tradeStatus')) {
      return;
    }

    const { tradeId, status, message } = payload;

    // Determine notification type based on status
    let notificationType: 'success' | 'error' | 'warning' | 'info' = 'info';
    if (status === 'completed') {
      notificationType = 'success';
      if (!shouldShowTradeType('tradeCompleted')) return;
    } else if (status === 'failed') {
      notificationType = 'error';
      if (!shouldShowTradeType('tradeFailed')) return;
    } else if (status === 'cancelled') {
      notificationType = 'warning';
    }

    // Show in-app notification
    addNotification({
      type: notificationType,
      title: `Trade ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: message || `Your trade status has been updated to ${status}`,
      duration: status === 'failed' ? 8000 : 5000,
      metadata: { tradeId, status },
    });

    // Show push notification
    pushNotificationService.showTradeStatusNotification(tradeId, status, message);
  };

  // Handle general trade notification event
  const handleTradeNotification = (payload: TradeNotificationPayload) => {
    if (!shouldShowTradeNotification()) {
      return;
    }

    const { title, message, type, tradeId, data } = payload;

    // Show in-app notification
    addNotification({
      type,
      title,
      message,
      duration: 5000,
      metadata: { tradeId, ...data },
    });

    // Show push notification if it has trade data
    if (tradeId || data?.url) {
      pushNotificationService.showNotification({
        title,
        body: message,
        tag: `trade-notification-${tradeId || Date.now()}`,
        data: { tradeId, ...data },
        actions: [
          {
            action: 'view_trade',
            title: 'View',
          },
        ],
      });
    }
  };

  // Subscribe to trade events
  useWsSubscription<TradeExecutedPayload>('trade_executed', (event) => {
    handleTradeExecuted(event.payload);
  });

  useWsSubscription<TradeStatusPayload>('trade_status', (event) => {
    handleTradeStatus(event.payload);
  });

  useWsSubscription<TradeNotificationPayload>('trade_notification', (event) => {
    handleTradeNotification(event.payload);
  });

  // Initialize push notification service
  useEffect(() => {
    const initPushNotifications = async () => {
      if (shouldShowTradeNotification()) {
        await pushNotificationService.initialize();
      }
    };

    initPushNotifications();
  }, []);

  // Enable/disable push notifications based on preferences
  useEffect(() => {
    const updatePushSubscription = async () => {
      if (shouldShowTradeNotification()) {
        const isSubscribed = await pushNotificationService.isSubscribed();
        if (!isSubscribed) {
          await pushNotificationService.subscribe();
        }
      } else {
        await pushNotificationService.unsubscribe();
      }
    };

    updatePushSubscription();
  }, [preferences?.notifications?.push]);

  // Return utility functions
  return {
    enablePushNotifications: async () => {
      await pushNotificationService.subscribe();
    },
    disablePushNotifications: async () => {
      await pushNotificationService.unsubscribe();
    },
    isPushSupported: pushNotificationService.isSupported(),
    permissionState: pushNotificationService.getPermissionState(),
  };
}
