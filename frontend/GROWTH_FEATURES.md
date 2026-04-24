# Growth Features Documentation

This document provides detailed documentation for the referral, affiliate, bug bounty, and notification features.

## Table of Contents

1. [Referral Program](#referral-program)
2. [Affiliate Program](#affiliate-program)
3. [Bug Bounty Program](#bug-bounty-program)
4. [Notification System](#notification-system)
5. [Redux Integration](#redux-integration)
6. [API Integration](#api-integration)

---

## Referral Program

### Overview
The referral program allows users to share their unique referral code and earn rewards when others sign up and become active users.

### Components

#### ReferralDashboard
**Location:** `src/components/ReferralDashboard.tsx`  
**Route:** `/referrals` (Protected)

**Features:**
- Display referral code and link
- Copy to clipboard functionality
- View referral statistics
- Track earnings (total and pending)
- View list of referrals with status

**Usage:**
```tsx
import ReferralDashboard from './components/ReferralDashboard';

// Used in App.tsx routing
<Route path="/referrals" element={<ReferralDashboard />} />
```

### Redux State

```typescript
interface ReferralState {
  stats: ReferralStats | null;
  referrals: ReferralEntry[];
  loading: boolean;
  error: string | null;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  conversionRate: number;
  referralCode: string;
  referralLink: string;
}
```

### Service Methods

```typescript
import { referralService } from './services/referral.service';

// Get referral statistics
const stats = await referralService.getStats();

// Get referral list
const { referrals, total } = await referralService.getReferrals(page, limit);

// Generate new referral code
const { referralCode, referralLink } = await referralService.generateCode();

// Track click on referral link
await referralService.trackClick(referralCode);

// Track signup from referral
await referralService.trackSignup(referralCode);
```

---

## Affiliate Program

### Overview
The affiliate program provides advanced commission tracking and payout management for partners.

### Components

#### AffiliateDashboard
**Location:** `src/components/AffiliateDashboard.tsx`  
**Route:** `/affiliate` (Protected)

**Features:**
- Commission tracking (total, pending, paid)
- Payout request form
- Payout history
- Performance metrics
- Partner tier display
- Analytics reports

**Usage:**
```tsx
import AffiliateDashboard from './components/AffiliateDashboard';

<Route path="/affiliate" element={<AffiliateDashboard />} />
```

### Redux State

```typescript
interface AffiliateState {
  stats: AffiliateStats | null;
  payouts: AffiliatePayout[];
  reports: AffiliateReport[];
  loading: boolean;
  error: string | null;
}

interface AffiliateStats {
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  conversionRate: number;
  partnerTier: 'Starter' | 'Growth' | 'Scale' | 'Gold';
  totalClicks: number;
  totalSignups: number;
}
```

### Service Methods

```typescript
import { affiliateService } from './services/affiliate.service';

// Get affiliate statistics
const stats = await affiliateService.getStats();

// Get payout history
const { payouts, total } = await affiliateService.getPayouts(page, limit);

// Request payout
const payout = await affiliateService.requestPayout({
  amount: 500,
  method: 'USDC wallet'
});

// Get performance reports
const reports = await affiliateService.getReports(startDate, endDate);

// Get affiliate referral link
const { referralLink } = await affiliateService.getReferralLink();
```

### Payout Methods
- USDC wallet
- Bank transfer
- PayPal

Minimum payout: $100

---

## Bug Bounty Program

### Overview
Users can report bugs and vulnerabilities, potentially earning rewards based on severity and impact.

### Components

#### BugReportForm
**Location:** `src/components/BugReportForm.tsx`  
**Route:** `/bug-reports` (Protected)

**Features:**
- Submit bug reports with details
- Upload screenshots
- Set priority levels
- Track report status
- View reward information
- Bug report history

**Usage:**
```tsx
import BugReportForm from './components/BugReportForm';

<Route path="/bug-reports" element={<BugReportForm />} />
```

### Priority Levels

| Priority | Color | Description |
|----------|-------|-------------|
| Low | Green | Minor issues, typos, UI glitches |
| Medium | Yellow | Functional issues, workarounds available |
| High | Orange | Major functionality broken |
| Critical | Red | Security vulnerabilities, data loss |

### Redux State

```typescript
interface BugReportState {
  reports: BugReport[];
  totalRewards: number;
  loading: boolean;
  error: string | null;
}

interface BugReport {
  id: string;
  title: string;
  description: string;
  priority: BugPriority;
  status: BugStatus;
  screenshots: string[];
  submittedAt: string;
  rewardAmount?: number;
  rewardStatus?: 'pending' | 'approved' | 'paid';
}
```

### Service Methods

```typescript
import { bugReportService } from './services/bugReport.service';

// Submit a bug report
const report = await bugReportService.submitBugReport({
  title: 'Login page error',
  description: 'Detailed description...',
  priority: 'high',
  screenshots: ['url1', 'url2'],
  browserInfo: navigator.userAgent,
  osInfo: navigator.platform
});

// Get bug reports
const { reports, total } = await bugReportService.getBugReports(page, limit);

// Get single bug report
const report = await bugReportService.getBugReport(id);

// Upload screenshot
const url = await bugReportService.uploadScreenshot(file);

// Get total rewards
const { totalRewards } = await bugReportService.getTotalRewards();
```

### Screenshot Upload
- Accepts image files only (PNG, JPG, GIF)
- Multiple screenshots supported
- Files uploaded via multipart/form-data
- Returns URL for each uploaded screenshot

---

## Notification System

### Overview
A comprehensive notification system supporting push notifications, email, and in-app notifications with customizable preferences.

### Components

#### NotificationCenter
**Location:** `src/components/NotificationCenter.tsx`  
**Route:** `/notifications` (Protected)

**Features:**
- View all notifications
- Mark as read/unread
- Customize notification preferences
- Enable/disable push notifications
- Control notification channels
- Filter by notification type

#### NotificationBadge
**Location:** `src/components/NotificationBadge.tsx`

**Features:**
- Display unread count
- Red badge indicator
- Auto-hide when no unread notifications

**Usage:**
```tsx
import NotificationBadge from './components/NotificationBadge';

// In navigation
<div style={{ position: 'relative' }}>
  <Link to="/notifications">Notifications</Link>
  <NotificationBadge />
</div>
```

### Notification Types

| Type | Icon | Description |
|------|------|-------------|
| waitlist | 📋 | Waitlist position updates |
| referral | 👥 | New referral signups |
| affiliate | 💰 | Commission and payout updates |
| bug_report | 🐛 | Bug report status changes |
| system | ⚙️ | System announcements |

### Redux State

```typescript
interface NotificationState {
  notifications: Notification[];
  preferences: NotificationPreferences;
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: 'push' | 'email' | 'both';
  read: boolean;
  createdAt: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  referralNotifications: boolean;
  affiliateNotifications: boolean;
  waitlistNotifications: boolean;
  bugReportNotifications: boolean;
}
```

### Custom Hook

```typescript
import { useNotifications } from './hooks/useNotifications';

function MyComponent() {
  const { notifications, unreadCount, preferences } = useNotifications();
  
  // Use notifications in your component
  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
    </div>
  );
}
```

### Service Methods

```typescript
import { notificationService } from './services/notification.service';

// Get notifications
const { notifications, total } = await notificationService.getNotifications(page, limit);

// Mark as read
await notificationService.markAsRead(notificationId);

// Mark all as read
await notificationService.markAllAsRead();

// Get preferences
const preferences = await notificationService.getPreferences();

// Update preferences
await notificationService.updatePreferences({
  pushEnabled: true,
  emailEnabled: false
});

// Register push token
await notificationService.registerPushToken(token);

// Unregister push token
await notificationService.unregisterPushToken(token);

// Get unread count
const { count } = await notificationService.getUnreadCount();
```

### Push Notifications

**Browser Support Check:**
```typescript
if ('Notification' in window) {
  // Push notifications supported
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Register token with backend
  }
}
```

**Real-time Updates:**
The notification system uses Server-Sent Events (SSE) for real-time updates:
```typescript
const eventSource = new EventSource('/api/notifications/stream');

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Handle new notification
};
```

---

## Redux Integration

### Store Configuration

All slices are registered in `src/store/index.ts`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import referralReducer from './slices/referralSlice';
import affiliateReducer from './slices/affiliateSlice';
import bugReportReducer from './slices/bugReportSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    referral: referralReducer,
    affiliate: affiliateReducer,
    bugReport: bugReportReducer,
    notification: notificationReducer,
    // ... other reducers
  },
});
```

### Using Redux in Components

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';

function MyComponent() {
  const dispatch = useAppDispatch();
  const { stats, loading, error } = useAppSelector((state) => state.referral);
  
  // Dispatch actions
  const fetchData = async () => {
    dispatch(fetchReferralStatsStart());
    try {
      const data = await referralService.getStats();
      dispatch(fetchReferralStatsSuccess(data));
    } catch (err) {
      dispatch(fetchReferralStatsFailure(err.message));
    }
  };
  
  return <div>{/* Your component */}</div>;
}
```

---

## API Integration

### Authentication

All API calls include authentication tokens automatically via the ApiClient interceptor:

```typescript
// Token is added to headers automatically
Authorization: `Bearer ${token}`
```

### Error Handling

The API client provides comprehensive error handling:

```typescript
try {
  const data = await referralService.getStats();
} catch (error) {
  // error is an ApiError with:
  // - message: User-friendly message
  // - statusCode: HTTP status code
  // - requestId: Unique request ID for tracking
}
```

### Request Deduplication

Identical requests are automatically deduplicated to prevent redundant API calls.

### Retry Logic

Failed requests are automatically retried (configurable, default: 3 retries).

---

## Best Practices

### 1. Loading States
Always show loading indicators during API calls:
```typescript
if (loading && !stats) {
  return <LoadingSpinner />;
}
```

### 2. Error Handling
Display user-friendly error messages:
```typescript
if (error) {
  return <ErrorMessage message={error} />;
}
```

### 3. Form Validation
Validate inputs before submission:
```typescript
if (!title.trim() || !description.trim()) {
  setFeedback('Please fill in all required fields');
  return;
}
```

### 4. Success Feedback
Provide confirmation for user actions:
```typescript
setFeedback('Report submitted successfully!');
setTimeout(() => setFeedback(''), 3000);
```

---

## Testing

### Unit Tests
Test Redux slices:
```typescript
import reducer, { fetchReferralStatsSuccess } from './referralSlice';

it('should handle fetchReferralStatsSuccess', () => {
  const state = reducer(initialState, fetchReferralStatsSuccess(mockStats));
  expect(state.stats).toEqual(mockStats);
  expect(state.loading).toBe(false);
});
```

### Integration Tests
Test components with Redux:
```typescript
import { Provider } from 'react-redux';
import { store } from './store';

render(
  <Provider store={store}>
    <ReferralDashboard />
  </Provider>
);
```

---

## Troubleshooting

### Issue: Push notifications not working
**Solution:** 
- Ensure site is served over HTTPS
- Check browser notification permissions
- Verify service worker is registered

### Issue: Screenshots not uploading
**Solution:**
- Check file size limits
- Verify file type is image
- Ensure API endpoint supports multipart/form-data

### Issue: Notifications not appearing in real-time
**Solution:**
- Verify SSE endpoint is accessible
- Check network connection
- Ensure EventSource is properly initialized

---

## Support

For questions or issues:
1. Check this documentation
2. Review implementation in `IMPLEMENTATION_SUMMARY.md`
3. Check Redux DevTools for state issues
4. Check Network tab for API issues
