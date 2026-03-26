import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as os from "os";
import {
  RateLimitStrategy,
  RateLimitResult,
  TokenBucketStrategy,
  SlidingWindowStrategy,
  AdaptiveStrategy,
} from "../strategies/index";

export interface ThrottleCheck {
  key: string;
  limit: number;
  windowSecs: number;
  strategy: RateLimitStrategy;
}

export interface MetricsEntry {
  key: string;
  allowed: number;
  denied: number;
  lastSeen: Date;
}

@Injectable()
export class AdaptiveThrottleService implements OnModuleInit {
  private readonly logger = new Logger(AdaptiveThrottleService.name);

  private readonly tokenBucket = new TokenBucketStrategy();
  private readonly slidingWindow = new SlidingWindowStrategy();
  private readonly adaptive: AdaptiveStrategy;

  /** Lists of explicitly whitelisted / blacklisted keys */
  private readonly whitelist = new Set<string>();
  private readonly blacklist = new Set<string>();

  /** Per-key usage counters for GET /rate-limit/metrics */
  private readonly metrics = new Map<string, MetricsEntry>();

  /** Cached CPU load fraction [0, 1] refreshed every 2 s */
  private cpuLoad = 0;
  private cpuInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.adaptive = new AdaptiveStrategy(() => this.cpuLoad, 0.8, 0.5);
  }

  onModuleInit(): void {
    this.cpuInterval = setInterval(() => this.refreshCpu(), 2_000);
  }

  private refreshCpu(): void {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type of Object.values(cpu.times)) total += type;
      idle += cpu.times.idle;
    }
    this.cpuLoad = 1 - idle / total;
  }

  // ── Core check ────────────────────────────────────────────────────────────

  check(params: ThrottleCheck): RateLimitResult {
    // Whitelist bypasses all limits
    if (this.whitelist.has(params.key)) {
      return {
        allowed: true,
        limit: params.limit,
        remaining: params.limit,
        resetAt: new Date(Date.now() + params.windowSecs * 1000),
      };
    }

    // Blacklist always denies
    if (this.blacklist.has(params.key)) {
      return {
        allowed: false,
        limit: params.limit,
        remaining: 0,
        resetAt: new Date(Date.now() + params.windowSecs * 1000),
        retryAfter: params.windowSecs,
      };
    }

    let result: RateLimitResult;
    switch (params.strategy) {
      case RateLimitStrategy.TOKEN_BUCKET:
        result = this.tokenBucket.check(
          params.key,
          params.limit,
          params.windowSecs,
        );
        break;
      case RateLimitStrategy.ADAPTIVE:
        result = this.adaptive.check(
          params.key,
          params.limit,
          params.windowSecs,
        );
        break;
      case RateLimitStrategy.SLIDING_WINDOW:
      default:
        result = this.slidingWindow.check(
          params.key,
          params.limit,
          params.windowSecs,
        );
    }

    this.updateMetrics(params.key, result.allowed);
    return result;
  }

  // ── Admin controls ────────────────────────────────────────────────────────

  whitelist_key(key: string): void {
    this.blacklist.delete(key);
    this.whitelist.add(key);
    this.logger.log(`Rate-limit whitelist: ${key}`);
  }

  blacklist_key(key: string): void {
    this.whitelist.delete(key);
    this.blacklist.add(key);
    this.logger.warn(`Rate-limit blacklist: ${key}`);
  }

  removeFromLists(key: string): void {
    this.whitelist.delete(key);
    this.blacklist.delete(key);
  }

  resetKey(key: string): void {
    this.tokenBucket.reset(key);
    this.slidingWindow.reset(key);
    this.adaptive.reset(key);
    this.metrics.delete(key);
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  private updateMetrics(key: string, allowed: boolean): void {
    const entry = this.metrics.get(key) ?? {
      key,
      allowed: 0,
      denied: 0,
      lastSeen: new Date(),
    };
    if (allowed) entry.allowed++;
    else entry.denied++;
    entry.lastSeen = new Date();
    this.metrics.set(key, entry);
  }

  getMetrics(): MetricsEntry[] {
    return Array.from(this.metrics.values());
  }

  getCurrentLoad(): number {
    return parseFloat(this.cpuLoad.toFixed(4));
  }
}
