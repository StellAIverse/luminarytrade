# Advanced Trading Indicators - Debugging Guide

## Issues Fixed ✅

### 1. **Edge Case Handling in Calculations**

**Issue:** Indicator calculations could crash with insufficient data  
**Fix:** Added length checks before calculations

```typescript
// Before
export const calculateSMA = (data: OHLCVData[], period: number) => {
  for (let i = period - 1; i < data.length; i++) {
    // Could fail if data.length < period
  }
}

// After
export const calculateSMA = (data: OHLCVData[], period: number) => {
  if (data.length < period) return [];  // ✅ Safe return
  // ... rest of calculation
}
```

**Affected Functions:**
- ✅ `calculateSMA` - Added length check
- ✅ `calculateEMA` - Added length check
- ✅ `calculateBollingerBands` - Added length check

---

### 2. **Empty Data Handling in Charts**

**Issue:** Chart could crash with empty data array  
**Fix:** Added validation before calculating price ranges

```typescript
// Before
const minPrice = Math.min(...data.map(d => d.low));  // ❌ Crashes on empty array
const maxPrice = Math.max(...data.map(d => d.high)); // ❌ Crashes on empty array

// After
const minPrice = data.length > 0 ? Math.min(...data.map(d => d.low)) : 0;  // ✅ Safe
const maxPrice = data.length > 0 ? Math.max(...data.map(d => d.high)) : 0; // ✅ Safe
const pricePadding = data.length > 0 ? (maxPrice - minPrice) * 0.1 : 10;   // ✅ Safe
```

---

### 3. **TypeScript Type Issues**

**Issue:** Missing ComposedChart import in IndicatorOscillators  
**Fix:** Added import

```typescript
import {
  // ... other imports
  ComposedChart,  // ✅ Added
} from 'recharts';
```

---

## Common Runtime Issues & Solutions

### Issue 1: "Cannot read property 'close' of undefined"

**Cause:** Insufficient data for indicator period  
**Solution:** ✅ Fixed with length checks

```typescript
// Ensure you have enough data
const minimumDataPoints = 52; // For Ichimoku (largest period)
if (data.length < minimumDataPoints) {
  console.warn(`Need at least ${minimumDataPoints} data points`);
}
```

---

### Issue 2: "Math.max called on empty array"

**Cause:** Empty data array passed to chart  
**Solution:** ✅ Fixed with conditional checks

```typescript
// Always validate data before rendering
if (!data || data.length === 0) {
  return <div>No data available</div>;
}
```

---

### Issue 3: Indicators Not Showing

**Possible Causes:**
1. Indicator not enabled in config
2. Insufficient data points
3. Incorrect date format

**Debugging Steps:**

```typescript
// 1. Check if indicator is enabled
console.log('Enabled indicators:', indicators.filter(i => i.enabled));

// 2. Check data length
console.log('Data points:', data.length);
console.log('Required:', Math.max(...indicators.map(i => i.parameters.period || 0)));

// 3. Check processed results
const processed = processIndicators(data, indicators);
console.log('Processed indicators:', processed);
```

---

### Issue 4: Chart Rendering Slowly

**Cause:** Too many data points or too many indicators  
**Solution:** Use memoization (already implemented)

```typescript
// Already optimized with useMemo
const processedIndicators = useMemo(
  () => processIndicators(data, indicators),
  [data, indicators]  // Only recalculates when these change
);
```

**Additional optimizations:**
```typescript
// Limit data points for better performance
const maxDataPoints = 500;
const displayData = data.slice(-maxDataPoints);
```

---

## Testing Guide

### Test 1: Minimum Data Requirements

```typescript
import { calculateSMA, calculateEMA, calculateRSI } from './indicatorCalculations';

describe('Indicator Calculations', () => {
  const minimalData = [
    { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
  ];

  it('handles insufficient data gracefully', () => {
    expect(calculateSMA(minimalData, 20)).toEqual([]);
    expect(calculateEMA(minimalData, 12)).toEqual([]);
    expect(calculateRSI(minimalData, 14)).toEqual([]);
  });
});
```

---

### Test 2: Empty Data Handling

```typescript
it('handles empty data arrays', () => {
  expect(calculateSMA([], 20)).toEqual([]);
  expect(calculateEMA([], 12)).toEqual([]);
  expect(calculateBollingerBands([], 20, 2)).toEqual([]);
});
```

---

### Test 3: Indicator Calculations Accuracy

```typescript
it('calculates SMA correctly', () => {
  const data = [
    { date: '1', open: 10, high: 12, low: 9, close: 11, volume: 100 },
    { date: '2', open: 11, high: 13, low: 10, close: 12, volume: 100 },
    { date: '3', open: 12, high: 14, low: 11, close: 13, volume: 100 },
    { date: '4', open: 13, high: 15, low: 12, close: 14, volume: 100 },
  ];

  const sma = calculateSMA(data, 2);
  
  expect(sma).toHaveLength(3);
  expect(sma[0].value).toBe(11.5); // (11 + 12) / 2
  expect(sma[1].value).toBe(12.5); // (12 + 13) / 2
  expect(sma[2].value).toBe(13.5); // (13 + 14) / 2
});
```

---

### Test 4: Component Rendering

```typescript
import { render } from '@testing-library/react';
import AdvancedTradingChart from './AdvancedTradingChart';

it('renders without crashing', () => {
  const { container } = render(
    <AdvancedTradingChart
      data={[]}
      indicators={DEFAULT_INDICATORS}
    />
  );
  
  expect(container).toBeTruthy();
});

it('shows loading state', () => {
  const { getByText } = render(
    <AdvancedTradingChart
      data={[]}
      indicators={DEFAULT_INDICATORS}
      loading={true}
    />
  );
  
  // Should show loading spinner
  expect(getByText(/loading/i)).toBeTruthy();
});
```

---

## Performance Testing

### Benchmark Indicator Calculations

```typescript
const benchmarkData = Array.from({ length: 1000 }, (_, i) => ({
  date: `2024-01-${String(i + 1).padStart(2, '0')}`,
  open: 100 + Math.random() * 10,
  high: 105 + Math.random() * 10,
  low: 95 + Math.random() * 10,
  close: 100 + Math.random() * 10,
  volume: Math.floor(Math.random() * 1000000),
}));

console.time('SMA Calculation');
calculateSMA(benchmarkData, 20);
console.timeEnd('SMA Calculation');

console.time('RSI Calculation');
calculateRSI(benchmarkData, 14);
console.timeEnd('RSI Calculation');

console.time('All Indicators');
processIndicators(benchmarkData, DEFAULT_INDICATORS);
console.timeEnd('All Indicators');
```

**Expected Performance:**
- 1000 data points: < 10ms
- 5000 data points: < 50ms
- 10000 data points: < 100ms

---

## Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
// Add to indicatorCalculations.ts
const DEBUG = process.env.NODE_ENV === 'development';

export const calculateSMA = (data: OHLCVData[], period: number): SMAData[] => {
  if (DEBUG) {
    console.log('SMA Calculation:', {
      dataLength: data.length,
      period,
      canCalculate: data.length >= period,
    });
  }
  
  if (data.length < period) return [];
  
  // ... rest of calculation
};
```

---

## Validation Checklist

Before deploying, verify:

- [ ] All indicators handle empty arrays
- [ ] All indicators handle insufficient data
- [ ] Chart renders with no data
- [ ] Chart renders with minimal data (1 point)
- [ ] Chart renders with full data (1000+ points)
- [ ] Toggle indicators on/off works
- [ ] Parameter changes update chart
- [ ] Tooltips display correctly
- [ ] No console errors
- [ ] Performance acceptable (< 100ms for 1000 points)

---

## Quick Fix Reference

### Problem: Indicator not appearing
```typescript
// Check 1: Is it enabled?
const indicator = indicators.find(i => i.type === 'RSI');
console.log('Enabled:', indicator?.enabled);

// Check 2: Enough data?
console.log('Data length:', data.length);
console.log('Required:', indicator?.parameters.period);

// Check 3: Calculation result
const rsi = calculateRSI(data, 14);
console.log('RSI points:', rsi.length);
```

### Problem: Chart looks wrong
```typescript
// Check data format
console.log('First data point:', data[0]);
console.log('Last data point:', data[data.length - 1]);

// Check price range
const prices = data.map(d => d.close);
console.log('Min price:', Math.min(...prices));
console.log('Max price:', Math.max(...prices));
```

### Problem: Performance slow
```typescript
// Limit data points
const displayData = data.slice(-500); // Last 500 points only

// Disable unused indicators
const activeIndicators = indicators.filter(i => i.enabled);
console.log('Active indicators:', activeIndicators.length);
```

---

## Error Handling Best Practices

```typescript
// Always wrap indicator calculations in try-catch
try {
  const processed = processIndicators(data, indicators);
  setProcessedIndicators(processed);
} catch (error) {
  console.error('Failed to process indicators:', error);
  setProcessedIndicators({ overlay: {}, oscillator: {} });
}

// Validate data before passing to chart
if (!Array.isArray(data)) {
  console.error('Invalid data type:', typeof data);
  return <div>Error: Invalid data format</div>;
}
```

---

**Last Updated:** April 24, 2026  
**Status:** All known issues fixed ✅  
**Next Steps:** Run test suite and validate with real data
