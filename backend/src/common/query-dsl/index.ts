/**
 * Query DSL - Type-safe query building for repositories
 * 
 * Provides fluent, type-safe API for constructing database queries with:
 * - Compile-time property validation
 * - IDE auto-complete support
 * - Type-safe operator selection
 * - Result type inference
 * - Query optimization hints
 * 
 * @example
 * ```typescript
 * const query = createQueryBuilder(agentRepository)
 *   .where(x => x.status, equals('active'))
 *   .where(x => x.score, greaterThan(80))
 *   .orderBy(x => x.score, 'DESC')
 *   .paginate(1, 10);
 * 
 * const results = await query.getMany();
 * ```
 */

export * from './types';
export * from './operators';
export * from './query-builder';
export * from './aggregate-builder';

import { Repository } from 'typeorm';
import { QueryBuilder } from './query-builder';
import { AggregateBuilder } from './aggregate-builder';

/**
 * Create a new type-safe query builder
 */
export function createQueryBuilder<T>(
  repository: Repository<T>,
  alias?: string,
): QueryBuilder<T> {
  return new QueryBuilder(repository, alias);
}

/**
 * Create a new type-safe aggregate builder
 */
export function createAggregateBuilder<T>(
  repository: Repository<T>,
  alias?: string,
): AggregateBuilder<T> {
  return new AggregateBuilder(repository, alias);
}

/**
 * Shorthand for creating query builder
 */
export const query = createQueryBuilder;

/**
 * Shorthand for creating aggregate builder
 */
export const aggregate = createAggregateBuilder;
