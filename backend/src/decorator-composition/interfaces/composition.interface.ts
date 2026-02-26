import { DecoratorType } from '../constants';

// ─── Core Composition Types ───────────────────────────────────────────────────

/** One entry in the per-method decoration stack */
export interface DecoratorEntry {
  type: DecoratorType;
  priority: number;
  options: Record<string, any>;
}

/** What @Composable stores on the class or method */
export interface ComposableMetadata {
  composable: true;
  className?: string;
  methodName?: string;
}

/** Full composed snapshot for a single method, returned by MetadataRegistryService */
export interface ComposedMethodMetadata {
  /** Entries sorted ascending by priority */
  stack: DecoratorEntry[];
  hasAuth: boolean;
  hasRateLimit: boolean;
  hasValidation: boolean;
  hasCache: boolean;
  hasLog: boolean;
  hasCompress: boolean;
  hasTransform: boolean;
}

// ─── Merge Strategies ─────────────────────────────────────────────────────────

/**
 * How to resolve conflicts when the same decorator type appears more than once
 * on the same method.
 *
 * - first-wins  : keep the first-applied decorator's options
 * - last-wins   : keep the last-applied decorator's options (innermost wins in TS)
 * - merge       : shallow-merge all options objects (last key wins within merge)
 * - override    : alias for last-wins
 */
export type MergeStrategy = 'override' | 'merge' | 'first-wins' | 'last-wins';

export interface MergePolicy {
  [decoratorType: string]: MergeStrategy;
}

/**
 * Default precedence rules:
 *  - AUTH, RATE_LIMIT, VALIDATE, CACHE, TRANSFORM, COMPRESS → last-wins
 *    (the innermost / most-specific decorator's config takes effect)
 *  - LOG → merge (combine log options so multiple @Log levels are aggregated)
 */
export const DEFAULT_MERGE_POLICY: MergePolicy = {
  AUTH: 'last-wins',
  RATE_LIMIT: 'last-wins',
  VALIDATE: 'last-wins',
  CACHE: 'last-wins',
  LOG: 'merge',
  TRANSFORM: 'last-wins',
  COMPRESS: 'last-wins',
};
