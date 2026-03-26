export { FixedWindowLimiter } from "./fixed-window.limiter";
export { SlidingWindowLimiter } from "./sliding-window.limiter";
export { TokenBucketLimiter } from "./token-bucket.limiter";
export type { TokenBucketOptions } from "./token-bucket.limiter";
// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export enum RateLimitStrategy {
  TOKEN_BUCKET = "TOKEN_BUCKET",
  SLIDING_WINDOW = "SLIDING_WINDOW",
  ADAPTIVE = "ADAPTIVE",
}

export interface RateLimitMetadata {
  requests: number;
  window: number; // seconds
  strategy: RateLimitStrategy;
  perUser?: boolean;
  perIp?: boolean;
  perApiKey?: boolean;
  perOrg?: boolean;
  skipFailed?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}

export interface RateLimitBucket {
  tokens: number;
  lastRefill: number; // epoch ms
}

export interface SlidingWindowEntry {
  timestamps: number[]; // epoch ms array
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Bucket Strategy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classic token-bucket: starts at capacity `limit`, refills at
 * `limit / window` tokens per second.  Stored in-process; swap for
 * a Redis-backed variant for multi-instance deployments.
 */
export class TokenBucketStrategy {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(key: string, limit: number, windowSecs: number): RateLimitResult {
    const now = Date.now();
    const refillRate = limit / windowSecs; // tokens/ms
    const refillRateMs = refillRate / 1000;

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: limit, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRateMs);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;

    const timeToRefillOne = allowed
      ? 0
      : Math.ceil((1 - bucket.tokens) / refillRateMs);

    return {
      allowed,
      limit,
      remaining: Math.floor(bucket.tokens),
      resetAt: new Date(now + windowSecs * 1000),
      retryAfter: allowed ? undefined : Math.ceil(timeToRefillOne / 1000),
    };
  }

  /** Expose for testing/whitelist override */
  reset(key: string): void {
    this.buckets.delete(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sliding Window Strategy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sliding-window counter: keeps a list of request timestamps within
 * the last `window` seconds.  O(n) per check but accurate.
 * For very high throughput, replace with a Redis sorted-set.
 */
export class SlidingWindowStrategy {
  private readonly windows = new Map<string, SlidingWindowEntry>();

  check(key: string, limit: number, windowSecs: number): RateLimitResult {
    const now = Date.now();
    const cutoff = now - windowSecs * 1000;

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.windows.set(key, entry);
    }

    // Evict timestamps outside the window
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

    const allowed = entry.timestamps.length < limit;
    if (allowed) entry.timestamps.push(now);

    const remaining = Math.max(0, limit - entry.timestamps.length);
    const oldest = entry.timestamps[0];
    const resetAt = oldest
      ? new Date(oldest + windowSecs * 1000)
      : new Date(now + windowSecs * 1000);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((resetAt.getTime() - now) / 1000);

    return { allowed, limit, remaining, resetAt, retryAfter };
  }

  reset(key: string): void {
    this.windows.delete(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Adaptive Strategy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Adaptive throttle: wraps the sliding-window strategy and halves the
 * effective limit when system CPU load exceeds the configured threshold.
 */
export class AdaptiveStrategy {
  private readonly inner: SlidingWindowStrategy;

  constructor(
    private readonly loadProvider: () => number, // 0–1 CPU fraction
    private readonly threshold: number = 0.8,
    private readonly reductionFactor: number = 0.5,
  ) {
    this.inner = new SlidingWindowStrategy();
  }

  check(key: string, limit: number, windowSecs: number): RateLimitResult {
    const load = this.loadProvider();
    const effectiveLimit =
      load > this.threshold
        ? Math.max(1, Math.floor(limit * this.reductionFactor))
        : limit;

    return this.inner.check(key, effectiveLimit, windowSecs);
  }

  reset(key: string): void {
    this.inner.reset(key);
  }
}
