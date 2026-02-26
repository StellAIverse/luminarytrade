/**
 * Type-safe Query Operators
 * Provides fluent API for building query conditions
 */

import { ComparisonOperator, QueryCondition } from './types';

/**
 * Operator builder interface
 */
export interface OperatorBuilder<T, K extends keyof T> {
  readonly property: K;
  readonly operator: ComparisonOperator;
  readonly value?: T[K];
  readonly values?: T[K][];
  readonly min?: T[K];
  readonly max?: T[K];
}

/**
 * Base operator class
 */
abstract class BaseOperator<T, K extends keyof T> implements OperatorBuilder<T, K> {
  constructor(
    public readonly property: K,
    public readonly operator: ComparisonOperator,
    public readonly value?: T[K],
    public readonly values?: T[K][] ,
    public readonly min?: T[K],
    public readonly max?: T[K],
  ) {}

  toCondition(): QueryCondition<T> {
    return {
      property: this.property,
      operator: this.operator,
      value: this.value,
      values: this.values,
      min: this.min,
      max: this.max,
    };
  }
}

/**
 * Equals operator
 */
export class EqualsOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, value: T[K]) {
    super(property, ComparisonOperator.EQUALS, value);
  }
}

/**
 * Not equals operator
 */
export class NotEqualsOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, value: T[K]) {
    super(property, ComparisonOperator.NOT_EQUALS, value);
  }
}

/**
 * Greater than operator
 */
export class GreaterThanOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, value: T[K]) {
    super(property, ComparisonOperator.GREATER_THAN, value);
  }
}

/**
 * Greater than or equal operator
 */
export class GreaterThanOrEqualOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, value: T[K]) {
    super(property, ComparisonOperator.GREATER_THAN_OR_EQUAL, value);
  }
}

/**
 * Less than operator
 */
export class LessThanOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, value: T[K]) {
    super(property, ComparisonOperator.LESS_THAN, value);
  }
}

/**
 * Less than or equal operator
 */
export class LessThanOrEqualOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, value: T[K]) {
    super(property, ComparisonOperator.LESS_THAN_OR_EQUAL, value);
  }
}

/**
 * In operator
 */
export class InOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, values: T[K][]) {
    super(property, ComparisonOperator.IN, undefined, values);
  }
}

/**
 * Not in operator
 */
export class NotInOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, values: T[K][]) {
    super(property, ComparisonOperator.NOT_IN, undefined, values);
  }
}

/**
 * Like operator (case-sensitive)
 */
export class LikeOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, pattern: string) {
    super(property, ComparisonOperator.LIKE, pattern as any);
  }
}

/**
 * ILike operator (case-insensitive)
 */
export class ILikeOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, pattern: string) {
    super(property, ComparisonOperator.ILIKE, pattern as any);
  }
}

/**
 * Contains operator
 */
export class ContainsOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, substring: string) {
    super(property, ComparisonOperator.CONTAINS, substring as any);
  }
}

/**
 * Starts with operator
 */
export class StartsWithOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, prefix: string) {
    super(property, ComparisonOperator.STARTS_WITH, prefix as any);
  }
}

/**
 * Ends with operator
 */
export class EndsWithOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, suffix: string) {
    super(property, ComparisonOperator.ENDS_WITH, suffix as any);
  }
}

/**
 * Between operator
 */
export class BetweenOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K, min: T[K], max: T[K]) {
    super(property, ComparisonOperator.BETWEEN, undefined, undefined, min, max);
  }
}

/**
 * Is null operator
 */
export class IsNullOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K) {
    super(property, ComparisonOperator.IS_NULL);
  }
}

/**
 * Is not null operator
 */
export class IsNotNullOperator<T, K extends keyof T> extends BaseOperator<T, K> {
  constructor(property: K) {
    super(property, ComparisonOperator.IS_NOT_NULL);
  }
}

/**
 * Operator factory functions for fluent API
 */
export const equals = <T, K extends keyof T>(value: T[K]) => 
  (property: K) => new EqualsOperator(property, value);

export const notEquals = <T, K extends keyof T>(value: T[K]) => 
  (property: K) => new NotEqualsOperator(property, value);

export const greaterThan = <T, K extends keyof T>(value: T[K]) => 
  (property: K) => new GreaterThanOperator(property, value);

export const greaterThanOrEqual = <T, K extends keyof T>(value: T[K]) => 
  (property: K) => new GreaterThanOrEqualOperator(property, value);

export const lessThan = <T, K extends keyof T>(value: T[K]) => 
  (property: K) => new LessThanOperator(property, value);

export const lessThanOrEqual = <T, K extends keyof T>(value: T[K]) => 
  (property: K) => new LessThanOrEqualOperator(property, value);

export const inArray = <T, K extends keyof T>(values: T[K][]) => 
  (property: K) => new InOperator(property, values);

export const notInArray = <T, K extends keyof T>(values: T[K][]) => 
  (property: K) => new NotInOperator(property, values);

export const like = <T, K extends keyof T>(pattern: string) => 
  (property: K) => new LikeOperator(property, pattern);

export const ilike = <T, K extends keyof T>(pattern: string) => 
  (property: K) => new ILikeOperator(property, pattern);

export const contains = <T, K extends keyof T>(substring: string) => 
  (property: K) => new ContainsOperator(property, substring);

export const startsWith = <T, K extends keyof T>(prefix: string) => 
  (property: K) => new StartsWithOperator(property, prefix);

export const endsWith = <T, K extends keyof T>(suffix: string) => 
  (property: K) => new EndsWithOperator(property, suffix);

export const between = <T, K extends keyof T>(min: T[K], max: T[K]) => 
  (property: K) => new BetweenOperator(property, min, max);

export const isNull = <T, K extends keyof T>() => 
  (property: K) => new IsNullOperator(property);

export const isNotNull = <T, K extends keyof T>() => 
  (property: K) => new IsNotNullOperator(property);
