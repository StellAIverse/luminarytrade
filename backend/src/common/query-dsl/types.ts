/**
 * Type-safe Query DSL Types
 * Provides compile-time type safety for query construction
 */

/**
 * Extract property keys of specific type from entity
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Property selector function type
 */
export type PropertySelector<T, K extends keyof T = keyof T> = (entity: T) => T[K];

/**
 * Comparison operators
 */
export enum ComparisonOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  LIKE = 'LIKE',
  ILIKE = 'ILIKE',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  CONTAINS = 'CONTAINS',
  BETWEEN = 'BETWEEN',
  IS_NULL = 'IS_NULL',
  IS_NOT_NULL = 'IS_NOT_NULL',
}

/**
 * Logical operators
 */
export enum LogicalOperator {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Aggregation functions
 */
export enum AggregateFunction {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
}

/**
 * Query condition interface
 */
export interface QueryCondition<T> {
  property: keyof T;
  operator: ComparisonOperator;
  value?: any;
  values?: any[];
  min?: any;
  max?: any;
}

/**
 * Logical condition group
 */
export interface LogicalCondition<T> {
  operator: LogicalOperator;
  conditions: Array<QueryCondition<T> | LogicalCondition<T>>;
}

/**
 * Sort specification
 */
export interface SortSpec<T> {
  property: keyof T;
  direction: SortDirection;
}

/**
 * Pagination specification
 */
export interface PaginationSpec {
  page: number;
  limit: number;
}

/**
 * Join specification
 */
export interface JoinSpec<T> {
  property: keyof T;
  alias: string;
  type: 'INNER' | 'LEFT' | 'RIGHT';
  conditions?: Array<QueryCondition<any>>;
}

/**
 * Aggregation specification
 */
export interface AggregateSpec<T> {
  function: AggregateFunction;
  property?: keyof T;
  alias: string;
}

/**
 * Group by specification
 */
export interface GroupBySpec<T> {
  properties: Array<keyof T>;
  having?: Array<QueryCondition<any>>;
}

/**
 * Select specification for partial loading
 */
export interface SelectSpec<T> {
  properties: Array<keyof T>;
}

/**
 * Query result type inference
 */
export type QueryResult<T, S extends SelectSpec<T> | undefined> = S extends SelectSpec<T>
  ? Pick<T, S['properties'][number]>
  : T;

/**
 * Aggregation result type
 */
export type AggregateResult<T extends Record<string, AggregateSpec<any>>> = {
  [K in keyof T]: number;
};

/**
 * Paginated result type
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
