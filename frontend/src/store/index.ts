import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
// Note: These slices are referenced but may not exist yet
// Uncomment when the files are created:
// import userReducer from './slices/userSlice';
// import agentsReducer from './slices/agentsSlice';
// import scoresReducer from './slices/scoresSlice';
// import realtimeReducer from './slices/realtimeSlice';
// import uiReducer from './slices/uiSlice';
import referralReducer from './slices/referralSlice';
import affiliateReducer from './slices/affiliateSlice';
import bugReportReducer from './slices/bugReportSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add these when slices are created:
    // user: userReducer,
    // agents: agentsReducer,
    // scores: scoresReducer,
    // realtime: realtimeReducer,
    // ui: uiReducer,
    referral: referralReducer,
    affiliate: affiliateReducer,
    bugReport: bugReportReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['realtime/socketConnected', 'realtime/socketDisconnected'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.socket'],
        // Ignore these paths in the state
        ignoredPaths: ['realtime.socket'],
      },
    }),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
