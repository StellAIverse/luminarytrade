# Debugging Guide

This guide helps you debug the newly implemented features.

## Common Issues & Solutions

### 1. TypeScript Errors: "Cannot find module '@reduxjs/toolkit'"

**Issue:** TypeScript can't find Redux Toolkit module  
**Solution:** Install dependencies
```bash
cd frontend
npm install
```

---

### 2. Missing Slice Files

**Issue:** Store imports slices that don't exist (userSlice, agentsSlice, etc.)  
**Status:** ✅ Fixed - These imports are now commented out in `store/index.ts`

**To enable them later:**
1. Create the missing slice files
2. Uncomment the imports in `store/index.ts`
3. Uncomment the reducer registrations

---

### 3. API Connection Errors

**Issue:** Components fail to fetch data  
**Solution:** Ensure backend is running and API endpoints are implemented

**Check API connection:**
```javascript
// In browser console
fetch('/api/referral/stats')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('API Error:', err));
```

**Expected API endpoints:**
- `/api/referral/stats`
- `/api/affiliate/stats`
- `/api/bug-reports`
- `/api/notifications`

---

### 4. Authentication Issues

**Issue:** Protected routes redirect to login  
**Solution:** Ensure you're logged in

**Check auth state:**
```javascript
// In browser console (with Redux DevTools)
// Check if user is authenticated
store.getState().auth.user
```

---

### 5. Push Notification Issues

**Issue:** Push notifications not working  
**Checklist:**
- [ ] Site is served over HTTPS (required for push notifications)
- [ ] Browser supports Notification API
- [ ] User has granted notification permission

**Test push notification support:**
```javascript
// In browser console
if ('Notification' in window) {
  console.log('Push notifications supported');
  Notification.requestPermission().then(permission => {
    console.log('Permission:', permission);
  });
} else {
  console.log('Push notifications NOT supported');
}
```

---

### 6. Screenshot Upload Failures

**Issue:** Bug report screenshot uploads fail  
**Checklist:**
- [ ] File is an image (PNG, JPG, GIF)
- [ ] File size is within limits (typically < 5MB)
- [ ] Backend endpoint `/api/bug-reports/upload` exists
- [ ] Request uses multipart/form-data

**Test upload:**
```javascript
// Create a test file upload
const formData = new FormData();
formData.append('screenshot', yourImageFile);

fetch('/api/bug-reports/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => console.log('Upload success:', data))
.catch(err => console.error('Upload failed:', err));
```

---

### 7. Real-time Notifications Not Working

**Issue:** SSE connection fails  
**Check:**
```javascript
// Test SSE connection
const eventSource = new EventSource('/api/notifications/stream');

eventSource.onopen = () => {
  console.log('SSE connection opened');
};

eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

**Solutions:**
- Ensure backend supports Server-Sent Events
- Check network tab for connection status
- Verify endpoint `/api/notifications/stream` exists

---

## Debugging Tools

### 1. Redux DevTools

**Install:** Chrome Extension - Redux DevTools  
**Usage:**
- View state changes in real-time
- Dispatch actions manually
- Time-travel debugging

**Check state:**
```javascript
// In Redux DevTools console tab
// View referral state
store.getState().referral

// View notification state
store.getState().notification
```

---

### 2. Browser Developer Tools

**Network Tab:**
- Monitor API requests
- Check request/response headers
- View payload data
- Identify failed requests

**Console Tab:**
- View logs and errors
- Test JavaScript code
- Check component state

**Application Tab:**
- View localStorage
- Check cookies
- Inspect service workers

---

### 3. React Developer Tools

**Install:** Chrome Extension - React Developer Tools  
**Usage:**
- Inspect component tree
- View component props and state
- Profile component performance

---

## Component-Specific Debugging

### ReferralDashboard

**Check if component loads:**
```javascript
// In browser console
console.log('Referral stats:', window.__REDUX_DEVTOOLS_EXTENSION__?.getState().referral);
```

**Common issues:**
- No stats displayed → Check API response
- Copy button not working → Check clipboard permissions
- Loading indefinitely → Check for API errors in Network tab

---

### AffiliateDashboard

**Debug payout requests:**
```javascript
// Test payout validation
const amount = 50;
console.log('Valid amount:', !isNaN(amount) && amount >= 100); // Should be false
```

**Common issues:**
- Payout request fails → Check minimum amount ($100)
- Stats not loading → Verify API endpoint
- Payout history empty → Check if user has any payouts

---

### BugReportForm

**Debug form submission:**
```javascript
// Validate form data
const formData = {
  title: 'Test bug',
  description: 'Detailed description',
  priority: 'high'
};

console.log('Form valid:', 
  formData.title.trim() !== '' && 
  formData.description.trim() !== ''
);
```

**Common issues:**
- Submit button disabled → Check form validation
- Screenshot upload fails → Verify file type and size
- Reports not showing → Check API response

---

### NotificationCenter

**Debug notifications:**
```javascript
// Check notification count
const state = window.__REDUX_DEVTOOLS_EXTENSION__?.getState();
console.log('Unread count:', state.notification.unreadCount);
console.log('Notifications:', state.notification.notifications);
```

**Common issues:**
- Notifications not appearing → Check SSE connection
- Mark as read not working → Verify API endpoint
- Preferences not saving → Check PATCH request

---

## Testing Checklist

### Before Reporting Bugs

- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Clear browser cache and reload
- [ ] Check browser console for errors
- [ ] Verify backend is running
- [ ] Check Network tab for failed API requests
- [ ] Ensure you're logged in (for protected routes)
- [ ] Try in incognito/private mode
- [ ] Test in different browsers

---

## Error Logging

### Add Console Logging

**For debugging API calls:**
```typescript
// Add to any service method
async getStats() {
  console.log('Fetching stats...');
  try {
    const response = await apiClient.get('/referral/stats');
    console.log('Stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Stats error:', error);
    throw error;
  }
}
```

**For debugging Redux actions:**
```typescript
// Add to any component
useEffect(() => {
  console.log('Component mounted');
  console.log('Current state:', { stats, loading, error });
  
  return () => {
    console.log('Component unmounting');
  };
}, [stats, loading, error]);
```

---

## Performance Debugging

### Check Component Re-renders

```typescript
// Add to any component
const renderCount = React.useRef(0);
useEffect(() => {
  renderCount.current += 1;
  console.log('Render count:', renderCount.current);
});
```

### Monitor API Response Times

```typescript
// ApiClient already logs this
// Check in Console tab under "API Logs"
```

---

## Quick Fixes

### Fix: "Module not found" errors
```bash
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
```

### Fix: TypeScript errors persist
```bash
# Restart TypeScript server in VS Code
# Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
# Type: "TypeScript: Restart TS Server"
```

### Fix: Build errors
```bash
cd frontend
npm run build
# Check output for specific errors
```

---

## Getting Help

When reporting issues, include:

1. **Error message** (from console)
2. **Steps to reproduce**
3. **Browser and version**
4. **Network request details** (from DevTools)
5. **Redux state** (from Redux DevTools)
6. **Screenshot** of the issue

---

## Validation Scripts

### Test All Services

Create a test file `test-services.js`:
```javascript
// Test all API services
async function testServices() {
  const tests = [
    { name: 'Referral Stats', url: '/api/referral/stats' },
    { name: 'Affiliate Stats', url: '/api/affiliate/stats' },
    { name: 'Bug Reports', url: '/api/bug-reports' },
    { name: 'Notifications', url: '/api/notifications' },
  ];

  for (const test of tests) {
    try {
      const response = await fetch(test.url);
      console.log(`✅ ${test.name}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

testServices();
```

Run in browser console to test all endpoints.

---

**Last Updated:** April 24, 2026
