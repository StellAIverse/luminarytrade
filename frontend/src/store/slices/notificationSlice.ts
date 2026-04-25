import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotificationState, Notification, NotificationPreferences } from '../../types/growth';

const defaultPreferences: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  referralNotifications: true,
  affiliateNotifications: true,
  waitlistNotifications: true,
  bugReportNotifications: true,
};

const initialState: NotificationState = {
  notifications: [],
  preferences: defaultPreferences,
  unreadCount: 0,
  loading: false,
  error: null,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    fetchNotificationsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchNotificationsSuccess(state, action: PayloadAction<Notification[]>) {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
      state.loading = false;
      state.error = null;
    },
    fetchNotificationsFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    markAsRead(state, action: PayloadAction<string>) {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead(state) {
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    updatePreferences(state, action: PayloadAction<Partial<NotificationPreferences>>) {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    fetchPreferencesStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPreferencesSuccess(state, action: PayloadAction<NotificationPreferences>) {
      state.preferences = action.payload;
      state.loading = false;
      state.error = null;
    },
    fetchPreferencesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    clearNotificationError(state) {
      state.error = null;
    },
  },
});

export const {
  fetchNotificationsStart,
  fetchNotificationsSuccess,
  fetchNotificationsFailure,
  markAsRead,
  markAllAsRead,
  addNotification,
  updatePreferences,
  fetchPreferencesStart,
  fetchPreferencesSuccess,
  fetchPreferencesFailure,
  clearNotificationError,
} = notificationSlice.actions;

export default notificationSlice.reducer;
