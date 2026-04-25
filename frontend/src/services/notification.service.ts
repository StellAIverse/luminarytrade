import { apiClient } from './api/ApiClient';
import { Notification, NotificationPreferences } from '../types/growth';

export const notificationService = {
  async getNotifications(page = 1, limit = 50): Promise<{ notifications: Notification[]; total: number }> {
    const response = await apiClient.get<{ notifications: Notification[]; total: number }>(
      `/notifications?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await apiClient.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  },

  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await apiClient.patch<NotificationPreferences>(
      '/notifications/preferences',
      preferences
    );
    return response.data;
  },

  async registerPushToken(token: string): Promise<void> {
    await apiClient.post('/notifications/push/register', { token });
  },

  async unregisterPushToken(token: string): Promise<void> {
    await apiClient.post('/notifications/push/unregister', { token });
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },
};
