# React Chart Performance Profiling Guide

## Overview
This guide provides instructions for profiling and verifying the performance optimizations applied to trading charts in the LuminaryTrade dashboard.

## Performance Optimizations Applied

### 1. Component Memoization
All chart components now use `React.memo()` to prevent unnecessary re-renders:
- `CreditScoreTrendChart`
- `TransactionVolumeChart`
- `AgentPerformanceChart`
- `RiskDistributionChart`
- `FraudRiskHeatmap`
- `StatCard`
- `DrillDownModal`

### 2. Computation Memoization
Expensive calculations are cached using `useMemo()`:
- Radar data transformation in AgentPerformanceChart
- Total calculations in RiskDistributionChart
- Max count calculations in FraudRiskHeatmap
- Merged data arrays in Dashboard

### 3. Handler Stabilization
Event handlers use `useCallback()` to maintain stable references:
- Toggle agent handlers
- Cell mouse event handlers
- Modal close handlers

### 4. Debounced Updates
WebSocket updates are batched at 80ms intervals via `useRealtimeDashboard` hook.

---

## Profiling with React DevTools

### Installation
1. Install React Developer Tools browser extension:
   - Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools

### Profiling Steps

#### Step 1: Open React DevTools
1. Open your application in the browser
2. Open DevTools (F12)
3. Navigate to the "⚛️ Components" tab
4. Click on the "⚛️ Profiler" tab

#### Step 2: Record a Profile
1. Click the blue "Record" button (●) in the Profiler tab
2. Interact with the dashboard:
   - Switch time windows (1D → 7D → 30D → YTD)
   - Hover over chart tooltips
   - Click heatmap cells
   - Toggle agent visibility in radar chart
   - Wait for real-time WebSocket updates
3. Click "Stop" to end recording

#### Step 3: Analyze Results
Look for the following metrics:

**Render Count**
- Each component should show minimal renders
- Chart components should only render when their `data` prop changes
- `StatCard` should not re-render on every WebSocket update

**Render Duration**
- Individual renders should be < 10ms
- Total commit time should be < 16ms (for 60 FPS)
- Look for components highlighted in yellow/orange (slow renders)

**Why Did This Render?**
- Right-click any component → "Why did this render?"
- Verify memoized components show "Same props" when parent re-renders
- Check that only data changes trigger chart re-renders

---

## Performance Verification Checklist

### ✅ FPS Testing
**Target: >60 FPS during all interactions**

1. Open Chrome DevTools → Performance tab
2. Click "Record" (●)
3. Perform these actions:
   - Rapid time window switching (5+ times)
   - Continuous mouse hover over charts (10+ seconds)
   - WebSocket data updates (observe live alerts)
4. Stop recording and check FPS meter
5. **Pass Criteria**: No frames drop below 50 FPS, average >60 FPS

### ✅ Chart Responsiveness
**Target: No visible lag during interactions**

Test these scenarios:
- [ ] Tooltip appears instantly on hover (<100ms)
- [ ] Time window switch completes in <300ms
- [ ] Heatmap cells respond immediately to mouse movement
- [ ] Agent toggle updates chart without flicker
- [ ] Live data updates smoothly without jank

### ✅ Memory Usage
**Target: Stable memory consumption**

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot before interactions
3. Perform intensive interactions (2-3 minutes)
4. Take another heap snapshot
5. Compare snapshots for memory leaks
6. **Pass Criteria**: <5MB increase after 3 minutes of use

### ✅ Re-render Count
**Target: Minimal unnecessary renders**

Using React DevTools Profiler:
1. Trigger parent component update (e.g., window resize)
2. Check chart component render counts
3. **Pass Criteria**: 
   - Charts with unchanged data: 0 re-renders
   - Charts with changed data: 1 re-render
   - StatCards: 0 re-renders on WebSocket updates

---

## Common Performance Issues & Solutions

### Issue 1: Charts Re-render on Every Parent Update
**Symptom**: React DevTools shows chart components rendering frequently
**Solution**: Verify `React.memo()` wrapper is applied correctly
```typescript
const MyChart = memo(({ data }) => { ... });
MyChart.displayName = 'MyChart';
```

### Issue 2: Tooltip Lag on Mouse Movement
**Symptom**: Tooltip appears delayed when hovering over data points
**Solution**: Ensure CustomTooltip is memoized
```typescript
const CustomTooltip = memo(({ active, payload, label }) => { ... });
```

### Issue 3: WebSocket Updates Cause Jank
**Symptom**: UI stutters when live data arrives
**Solution**: Verify debouncing is active (80ms in `useRealtimeDashboard`)
```typescript
const DEBOUNCE_MS = 80; // Adjust if needed
```

### Issue 4: Memory Growth Over Time
**Symptom**: App gets slower after extended use
**Solution**: Check for:
- Unbounded array growth (capped at 100 for score trend)
- Event listener leaks (cleanup in useEffect)
- Stale closures in callbacks

---

## Benchmarking Script

Run this in browser console to measure render performance:

```javascript
// Measure chart render time
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`Render: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
  }
});
observer.observe({ entryTypes: ['measure'] });

// Trigger renders and observe output
performance.mark('start');
// ... interact with charts ...
performance.mark('end');
performance.measure('chart-interaction', 'start', 'end');
```

---

## Production Monitoring

### Key Metrics to Track
1. **Time to Interactive (TTI)**: Target <3s
2. **First Contentful Paint (FCP)**: Target <1.5s
3. **Cumulative Layout Shift (CLS)**: Target <0.1
4. **Input Latency**: Target <100ms

### Tools
- **Lighthouse**: Run via Chrome DevTools → Lighthouse tab
- **Web Vitals**: Add `web-vitals` library to track in production
- **Sentry**: Monitor real user performance metrics

---

## Testing Commands

```bash
# Run all tests
npm test

# Run specific dashboard tests
npm test -- --testPathPattern=Dashboard.test

# Build for production (includes optimizations)
npm run build

# Analyze bundle size
npm run analyze
```

---

## Next Steps for Further Optimization

1. **Virtualization**: If data sets exceed 1000 points, implement windowing:
   - Use `react-window` or `@tanstack/react-virtual`
   - Only render visible data points

2. **Web Workers**: Move heavy computations off main thread:
   - Data aggregation
   - Statistical calculations
   - Chart data preprocessing

3. **Canvas Rendering**: For extremely large datasets:
   - Replace SVG-based charts with Canvas
   - Use libraries like `chartjs` or custom Canvas implementation

4. **Selective Updates**: Implement granular subscriptions:
   - Only update changed chart segments
   - Use immutable data structures for efficient diffing

---

## Support

For questions or issues related to chart performance:
1. Check React DevTools Profiler for render bottlenecks
2. Review component memoization implementation
3. Verify dependency arrays in `useMemo` and `useCallback`
4. Test with React.StrictMode disabled (double-renders in dev only)

---

**Last Updated**: April 24, 2026
**Optimizations Applied**: React.memo, useMemo, useCallback, debounced WebSocket updates
