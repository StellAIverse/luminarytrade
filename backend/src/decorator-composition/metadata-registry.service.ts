import { Injectable } from '@nestjs/common';
import {
  DecoratorEntry,
  ComposedMethodMetadata,
  DEFAULT_MERGE_POLICY,
  MergeStrategy,
} from './interfaces/composition.interface';
import { DecoratorType } from './constants';

// ─── Pre-Init Buffer ──────────────────────────────────────────────────────────
//
// TypeScript decorator factories execute at class-definition time, which is
// before the NestJS DI container exists. To bridge this gap we maintain a
// module-level buffer that accumulates entries during the class-definition
// phase. MetadataRegistryService drains the buffer in its constructor.

interface BufferItem {
  className: string;
  methodName: string;
  entry: DecoratorEntry;
}

const PRE_INIT_BUFFER: BufferItem[] = [];

/**
 * Called by every decorator factory to register a DecoratorEntry before the
 * DI container has been initialised. MetadataRegistryService drains this
 * buffer on construction.
 */
export function bufferDecoratorEntry(
  className: string,
  methodName: string,
  entry: DecoratorEntry,
): void {
  PRE_INIT_BUFFER.push({ className, methodName, entry });
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MetadataRegistryService {
  /**
   * Central store: "ClassName.methodName" → ordered list of DecoratorEntry.
   * Entries are inserted in decoration order; getComposedMetadata() sorts them.
   */
  private readonly store = new Map<string, DecoratorEntry[]>();

  constructor() {
    // Drain the pre-init buffer populated by decorator factories.
    for (const item of PRE_INIT_BUFFER) {
      this.push(item.className, item.methodName, item.entry);
    }
  }

  /**
   * Register a single decorator entry for a method.
   * Called by decorator factories (via bufferDecoratorEntry at definition time)
   * and again directly from the constructor (drain phase).
   */
  push(className: string, methodName: string, entry: DecoratorEntry): void {
    const key = this.buildKey(className, methodName);
    const existing = this.store.get(key) ?? [];
    existing.push(entry);
    this.store.set(key, existing);
  }

  /**
   * Return the fully composed, merged, and priority-sorted metadata for a method.
   *
   * Merge rules (see DEFAULT_MERGE_POLICY):
   *  - last-wins  : only the last-registered entry for that type survives
   *  - merge      : all entries for that type are shallow-merged (LOG)
   */
  getComposedMetadata(
    className: string,
    methodName: string,
  ): ComposedMethodMetadata {
    const key = this.buildKey(className, methodName);
    const raw = this.store.get(key) ?? [];
    const merged = this.mergeStack(raw);
    const sorted = [...merged].sort((a, b) => a.priority - b.priority);

    return {
      stack: sorted,
      hasAuth: sorted.some(e => e.type === 'AUTH'),
      hasRateLimit: sorted.some(e => e.type === 'RATE_LIMIT'),
      hasValidation: sorted.some(e => e.type === 'VALIDATE'),
      hasCache: sorted.some(e => e.type === 'CACHE'),
      hasLog: sorted.some(e => e.type === 'LOG'),
      hasCompress: sorted.some(e => e.type === 'COMPRESS'),
      hasTransform: sorted.some(e => e.type === 'TRANSFORM'),
    };
  }

  /**
   * Return a plain-object snapshot of the full registry.
   * Useful for debugging and diagnostic endpoints.
   */
  listAll(): Record<string, DecoratorEntry[]> {
    return Object.fromEntries(this.store.entries());
  }

  /**
   * Clear the registry. Intended for use between test cases.
   */
  clear(): void {
    this.store.clear();
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildKey(className: string, methodName: string): string {
    return `${className}.${methodName}`;
  }

  /**
   * Group entries by type and apply the merge strategy for each type.
   * Returns one representative entry per type.
   */
  private mergeStack(entries: DecoratorEntry[]): DecoratorEntry[] {
    const byType = new Map<DecoratorType, DecoratorEntry[]>();

    for (const entry of entries) {
      const group = byType.get(entry.type) ?? [];
      group.push(entry);
      byType.set(entry.type, group);
    }

    const result: DecoratorEntry[] = [];
    for (const [type, group] of byType.entries()) {
      const strategy: MergeStrategy = DEFAULT_MERGE_POLICY[type] ?? 'last-wins';
      result.push(this.applyMergeStrategy(group, strategy));
    }
    return result;
  }

  private applyMergeStrategy(
    group: DecoratorEntry[],
    strategy: MergeStrategy,
  ): DecoratorEntry {
    switch (strategy) {
      case 'first-wins':
        return group[0];

      case 'merge': {
        const merged = group.reduce(
          (acc, e) => ({ ...acc, ...e.options }),
          {} as Record<string, any>,
        );
        return { ...group[0], options: merged };
      }

      case 'override':
      case 'last-wins':
      default:
        return group[group.length - 1];
    }
  }
}
