/**
 * Type-safe Aggregation Builder
 * Provides fluent API for building aggregation queries
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AggregateFunction,
  AggregateSpec,
  GroupBySpec,
  QueryCondition,
  PropertySelector,
  AggregateResult,
} from './types';

/**
 * Aggregation Query Builder
 */
export class AggregateBuilder<T> {
  private aggregates: AggregateSpec<T>[] = [];
  private groupByFields?: GroupBySpec<T>;
  private havingConditions: QueryCondition<any>[] = [];
  private alias: string;

  constructor(
    private readonly repository: Repository<T>,
    alias?: string,
  ) {
    this.alias = alias || 'entity';
  }

  /**
   * Add COUNT aggregation
   */
  count<K extends keyof T>(
    selector?: PropertySelector<T, K>,
    alias: string = 'count',
  ): this {
    const property = selector ? this.extractProperty(selector) : undefined;
    
    this.aggregates.push({
      function: AggregateFunction.COUNT,
      property,
      alias,
    });
    
    return this;
  }

  /**
   * Add SUM aggregation
   */
  sum<K extends keyof T>(
    selector: PropertySelector<T, K>,
    alias: string = 'sum',
  ): this {
    const property = this.extractProperty(selector);
    
    this.aggregates.push({
      function: AggregateFunction.SUM,
      property,
      alias,
    });
    
    return this;
  }

  /**
   * Add AVG aggregation
   */
  avg<K extends keyof T>(
    selector: PropertySelector<T, K>,
    alias: string = 'avg',
  ): this {
    const property = this.extractProperty(selector);
    
    this.aggregates.push({
      function: AggregateFunction.AVG,
      property,
      alias,
    });
    
    return this;
  }

  /**
   * Add MIN aggregation
   */
  min<K extends keyof T>(
    selector: PropertySelector<T, K>,
    alias: string = 'min',
  ): this {
    const property = this.extractProperty(selector);
    
    this.aggregates.push({
      function: AggregateFunction.MIN,
      property,
      alias,
    });
    
    return this;
  }

  /**
   * Add MAX aggregation
   */
  max<K extends keyof T>(
    selector: PropertySelector<T, K>,
    alias: string = 'max',
  ): this {
    const property = this.extractProperty(selector);
    
    this.aggregates.push({
      function: AggregateFunction.MAX,
      property,
      alias,
    });
    
    return this;
  }

  /**
   * Add GROUP BY clause
   */
  groupBy<K extends keyof T>(...selectors: PropertySelector<T, K>[]): this {
    const properties = selectors.map(s => this.extractProperty(s));
    
    this.groupByFields = {
      properties: properties as Array<keyof T>,
    };
    
    return this;
  }

  /**
   * Add HAVING clause
   */
  having(condition: QueryCondition<any>): this {
    this.havingConditions.push(condition);
    return this;
  }

  /**
   * Build TypeORM QueryBuilder
   */
  toQuery(): SelectQueryBuilder<T> {
    let query = this.repository.createQueryBuilder(this.alias);

    // Add select with aggregations
    const selectExpressions: string[] = [];
    
    for (const agg of this.aggregates) {
      const field = agg.property 
        ? `${this.alias}.${String(agg.property)}`
        : '*';
      
      let expression: string;
      
      switch (agg.function) {
        case AggregateFunction.COUNT:
          expression = agg.property 
            ? `COUNT(${field})`
            : 'COUNT(*)';
          break;
        case AggregateFunction.SUM:
          expression = `SUM(${field})`;
          break;
        case AggregateFunction.AVG:
          expression = `AVG(${field})`;
          break;
        case AggregateFunction.MIN:
          expression = `MIN(${field})`;
          break;
        case AggregateFunction.MAX:
          expression = `MAX(${field})`;
          break;
        default:
          throw new Error(`Unsupported aggregate function: ${agg.function}`);
      }
      
      selectExpressions.push(`${expression} as ${agg.alias}`);
    }

    // Add group by fields to select
    if (this.groupByFields) {
      for (const property of this.groupByFields.properties) {
        selectExpressions.push(`${this.alias}.${String(property)}`);
      }
    }

    query = query.select(selectExpressions);

    // Apply group by
    if (this.groupByFields) {
      for (const property of this.groupByFields.properties) {
        query = query.addGroupBy(`${this.alias}.${String(property)}`);
      }
    }

    // Apply having conditions
    for (let i = 0; i < this.havingConditions.length; i++) {
      const condition = this.havingConditions[i];
      const havingString = this.buildHavingCondition(condition, `having_${i}`);
      const params = this.buildHavingParameters(condition, `having_${i}`);
      
      query = query.andHaving(havingString, params);
    }

    return query;
  }

  /**
   * Execute aggregation query
   */
  async execute<R = any>(): Promise<R[]> {
    const query = this.toQuery();
    return await query.getRawMany();
  }

  /**
   * Execute aggregation and return single result
   */
  async executeOne<R = any>(): Promise<R | null> {
    const query = this.toQuery();
    return await query.getRawOne();
  }

  /**
   * Extract property from selector
   */
  private extractProperty<K extends keyof T>(selector: PropertySelector<T, K>): K {
    const dummyEntity = {} as T;
    return selector(dummyEntity) as unknown as K;
  }

  /**
   * Build HAVING condition string
   */
  private buildHavingCondition(condition: QueryCondition<any>, paramName: string): string {
    const field = String(condition.property);
    
    switch (condition.operator) {
      case 'EQUALS':
        return `${field} = :${paramName}`;
      case 'NOT_EQUALS':
        return `${field} != :${paramName}`;
      case 'GREATER_THAN':
        return `${field} > :${paramName}`;
      case 'GREATER_THAN_OR_EQUAL':
        return `${field} >= :${paramName}`;
      case 'LESS_THAN':
        return `${field} < :${paramName}`;
      case 'LESS_THAN_OR_EQUAL':
        return `${field} <= :${paramName}`;
      default:
        throw new Error(`Unsupported HAVING operator: ${condition.operator}`);
    }
  }

  /**
   * Build HAVING parameters
   */
  private buildHavingParameters(condition: QueryCondition<any>, paramName: string): Record<string, any> {
    return {
      [paramName]: condition.value,
    };
  }
}

/**
 * Helper function to create aggregate builder
 */
export function createAggregateBuilder<T>(
  repository: Repository<T>,
  alias?: string,
): AggregateBuilder<T> {
  return new AggregateBuilder(repository, alias);
}
