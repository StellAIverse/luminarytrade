# Push Notifications for Trades - Testing Guide

## Overview
This guide covers browser testing and notification delivery verification for the trade push notification feature.

## Implementation Summary

### Files Created/Modified:
1. **Service Worker**: `frontend/public/sw.js`
2. **Push Notification Service**: `frontend/src/services/pushNotificationService.ts`
3. **WebSocket Event Types**: `frontend/src/services/WebSocketManager.ts` (added trade events)
4. **User Preferences Types**: `frontend/src/contexts/types.ts` (added trade notification preferences)
5. **Custom Hook**: `frontend/src/hooks/useTradeNotifications.ts`
6. **UI Component**: `frontend/src/components/TradeNotificationSettings.tsx`
7. **Tests**: `frontend/src/__tests__/pushNotificationService.test.ts`

## Features Implemented

### ✅ Acceptance Criteria Met:
- **Notifications sent**: Push notifications are sent for trade events (executed, status updates, completed, failed)
- **User can disable**: Users can disable push notifications through the settings UI or browser settings
- **Customizable**: Users can choose which trade events trigger notifications
- **Secure**: Uses standard Web Push Protocol with VAPID support

### Rules Implemented:
- ✅ **Use service workers**: Service worker registered at `/sw.js` handles push events
- ✅ **Permission handling**: Proper permission request and state management
- ✅ **Customizable**: Granular control over notification types
- ✅ **Secure**: Follows browser security best practices

## Browser Compatibility

### Supported Browsers:
- ✅ Chrome 50+
- ✅ Firefox 44+
- ✅ Edge 17+
- ✅ Safari 16+ (partial support)
- ✅ Opera 37+
- ✅ Android Browser 50+
- ✅ Chrome for Android 50+

### Not Supported:
- ❌ Internet Explorer (any version)
- ❌ Older mobile browsers

### Feature Detection:
The service automatically detects support using:
```typescript
'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
```

## Testing Instructions

### 1. Manual Testing

#### Test Push Notification Permission Flow:
1. Navigate to the app in a supported browser
2. Go to Settings → Notifications
3. Toggle "Push Notifications" on
4. Verify browser permission prompt appears
5. Click "Allow"
6. Verify toggle shows as enabled

#### Test Trade Notifications:
1. Ensure push notifications are enabled
2. Execute a test trade
3. Verify notification appears:
   - **In-app notification**: Shows in the notification center
   - **Push notification**: Shows even if browser tab is not active
4. Click notification to verify it navigates to trade details

#### Test Notification Preferences:
1. Go to Settings → Notifications
2. Disable specific trade notification types
3. Execute trades of different types
4. Verify only enabled notifications appear

#### Test Disable Flow:
1. Toggle "Push Notifications" off in settings
2. Verify subscription is removed
3. Execute a trade
4. Verify no push notification appears (in-app should still work if enabled)

### 2. Automated Testing

Run the test suite:
```bash
cd frontend
npm test pushNotificationService.test.ts
```

### 3. Browser DevTools Testing

#### Chrome DevTools:
1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Verify service worker is registered and active
4. Go to Application → Push Messaging
5. Test push notifications manually

#### Firefox DevTools:
1. Open DevTools (F12)
2. Go to Storage → Service Workers
3. Verify service worker status
4. Use Console to test notifications

### 4. Testing Different Scenarios

#### Scenario 1: App Open and Active
- **Expected**: Both in-app and push notifications appear
- **Test**: Execute trade with app in foreground

#### Scenario 2: App Open but Tab Not Active
- **Expected**: Push notification appears in system tray
- **Test**: Execute trade while on different tab

#### Scenario 3: Browser Closed
- **Expected**: Push notification appears (if browser supports background sync)
- **Test**: Close browser, execute trade, check system notifications

#### Scenario 4: Permission Denied
- **Expected**: Graceful degradation, in-app notifications still work
- **Test**: Block notifications in browser settings, execute trade

#### Scenario 5: Service Worker Update
- **Expected**: New service worker activates smoothly
- **Test**: Update sw.js, verify new version activates

## Notification Types

### 1. Trade Executed
```typescript
{
  title: "Trade Executed - Buy/Sell",
  body: "BUY 0.5 BTC @ 50000\nTotal: 25000",
  actions: [
    { action: "view_trade", title: "View Trade" },
    { action: "dismiss", title: "Dismiss" }
  ]
}
```

### 2. Trade Status Update
```typescript
{
  title: "Trade Processing/Completed/Failed",
  body: "Status message",
  actions: [
    { action: "view_trade", title: "View Details" }
  ]
}
```

### 3. Custom Trade Notification
```typescript
{
  title: "Custom notification title",
  body: "Custom message",
  actions: [...]
}
```

## Troubleshooting

### Issue: Notifications Not Appearing

**Check 1: Browser Support**
```javascript
console.log('Service Worker:', 'serviceWorker' in navigator);
console.log('Push Manager:', 'PushManager' in window);
console.log('Notification:', 'Notification' in window);
```

**Check 2: Permission State**
```javascript
console.log('Permission:', Notification.permission);
```

**Check 3: Service Worker Status**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Registered' : 'Not registered');
});
```

**Check 4: Subscription Status**
```javascript
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub ? 'Active' : 'Not active');
  });
});
```

### Issue: Permission Prompt Not Showing

**Solutions:**
1. Check if permission is already granted or denied
2. Ensure user has interacted with the page first
3. Check browser settings for notification permissions
4. Try in incognito/private mode to reset permissions

### Issue: Service Worker Not Registering

**Solutions:**
1. Verify `sw.js` is accessible at `/sw.js`
2. Check browser console for registration errors
3. Ensure HTTPS or localhost (required for service workers)
4. Clear service worker cache and re-register

### Issue: Push Notifications Not Received

**Backend Checklist:**
1. Verify push subscription is saved to backend
2. Check VAPID keys are configured correctly
3. Verify push message format is correct
4. Check backend logs for push delivery errors

**Frontend Checklist:**
1. Verify subscription is active
2. Check service worker is running
3. Verify notification permission is granted
4. Check browser notification settings

## Security Considerations

### 1. VAPID Keys
- Use VAPID keys for authenticated push messages
- Keep private key secure on backend
- Rotate keys periodically

### 2. Subscription Data
- Store subscriptions securely on backend
- Associate with authenticated users only
- Allow users to delete subscriptions

### 3. Content Security
- Validate all notification content
- Sanitize user-generated content
- Use HTTPS for all push communication

## Performance Optimization

### 1. Service Worker Caching
- Cache only necessary assets
- Implement cache versioning
- Clean up old caches on activation

### 2. Notification Batching
- Batch rapid notifications
- Use notification tags to replace duplicates
- Implement rate limiting

### 3. Payload Size
- Keep push payloads small (< 4KB)
- Use IDs and fetch full data on click
- Compress data when possible

## Monitoring and Analytics

### Track These Metrics:
1. **Permission Grant Rate**: % of users who grant permission
2. **Subscription Rate**: % of users who subscribe
3. **Notification Delivery Rate**: % of notifications successfully delivered
4. **Click-Through Rate**: % of notifications clicked
5. **Unsubscribe Rate**: % of users who disable notifications

### Example Tracking:
```typescript
// Track permission granted
if (permission === 'granted') {
  analytics.track('push_notification_permission_granted');
}

// Track notification delivered
pushNotificationService.showNotification({...});
analytics.track('push_notification_delivered', { type: 'trade_executed' });

// Track notification clicked
pushNotificationService.setNotificationClickHandler((action, data) => {
  analytics.track('push_notification_clicked', { action, ...data });
});
```

## Production Checklist

Before deploying to production:

- [ ] Test on all major browsers
- [ ] Test on mobile devices
- [ ] Test with different permission states
- [ ] Test service worker updates
- [ ] Test notification click handling
- [ ] Test unsubscribe flow
- [ ] Verify VAPID keys are configured
- [ ] Test backend push delivery
- [ ] Monitor error rates
- [ ] Set up analytics tracking
- [ ] Document known issues
- [ ] Create rollback plan

## Support

For issues or questions:
1. Check browser console for errors
2. Verify browser compatibility
3. Review troubleshooting section
4. Check backend push delivery logs
5. Test in different browsers/devices

## Definition of Done ✅

- [x] Notifications sent for trade events
- [x] Users can disable notifications
- [x] Service worker implemented
- [x] Permission handling complete
- [x] Customizable notification preferences
- [x] Secure implementation
- [x] Browser tested (Chrome, Firefox, Edge)
- [x] Tests written
- [x] Documentation complete
