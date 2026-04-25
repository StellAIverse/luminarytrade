import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchNotificationsStart,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  addNotification,
} from '../store/slices/notificationSlice';
import { notificationService } from '../services/notification.service';

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, preferences } = useAppSelector(
    (state) => state.notification
  );

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        dispatch(fetchNotificationsStart());
        const data = await notificationService.getNotifications();
        dispatch(fetchNotificationsSuccess(data.notifications));
      } catch (err: any) {
        dispatch(fetchNotificationsFailure(err.message));
      }
    };

    fetchNotifications();
  }, [dispatch]);

  useEffect(() => {
    // Set up WebSocket or Server-Sent Events listener for real-time notifications
    // This is a placeholder - implement based on your backend setup
    let eventSource: EventSource | null = null;
    
    try {
      eventSource = new EventSource('/api/notifications/stream');

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          dispatch(addNotification(notification));
          
          // Show browser notification if enabled
          if (preferences.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/notification-icon.png',
            });
          }
        } catch (err) {
          console.error('Failed to parse notification:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // EventSource will automatically attempt to reconnect
      };
    } catch (error) {
      console.error('Failed to initialize SSE connection:', error);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [dispatch, preferences, addNotification]);

  return {
    notifications,
    unreadCount,
    preferences,
  };
};
