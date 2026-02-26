/**
 * Type-safe Query Builder
 * Provides fluent API for constructing type-safe queries
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  QueryCondition,
  LogicalCondition,
  LogicalOperator,
  SortSpec,
  SortDirection,
  PaginationSpec,
  JoinSpec,
  AggregateSpec,
  GroupBySpec,
  SelectSpec,
  PaginatedResult,
  PropertySelector,
} from './types';
import { OperatorBuilder } from './operators';

/**
 * Type-safe Query Builder
 */
export class QueryBuilder<T> {
  private conditions: Array<QueryCondition<T> | LogicalCondition<T>> = [];
  private sorts: SortSpec<T>[] = [];
  private pagination?: PaginationSpec;
  private joins: JoinSpec<T>[] = [];
  private aggregates: AggregateSpec<T>[] = [];
  private groupBy?: GroupBySpec<T>;
  private selectFields?: SelectSpec<T>;
  private alias: string;

  constructor(
    private readonly repository: Repository<T>,
    alias?: string,
  ) {
    this.alias = alias || 'entity';
  }

  /**
   * Add WHERE condition (AND logic)
   */
  where<K extends keyof T>(
    selector: PropertySelector<T, K>,
    operatorBuilder: (property: K) => OperatorBuilder<T, K>,
  ): this {
    const dummyEntity = {} as T;
    const property = selector(dummyEntity) as unknown as K;
    const operator = operatorBuilder(property);
    
    this.conditions.push(operator.toCondition());
    return this;
  }

  /**
   * Add OR condition group
   */
  orWhere(builder: (qb: QueryBuilder<T>) => QueryBuilder<T>): this {
    const subBuilder = new QueryBuilder<T>(this.repository, this.alias);
    builder(subBuilder);
    
    if (subBuilder.conditions.length > 0) {
      this.conditions.push({
        operator: LogicalOperator.OR,
        conditions: subBuilder.conditions,
      });
    }
    
    return this;
  }

  /**
   * Add NOT condition
   */
  not(builder: (qb: QueryBuilder<T>) => QueryBuilder<T>): this {
    const subBuilder = new QueryBuilder<T>(this.repository, this.alias);
    builder(subBuilder);
    
    if (subBuilder.conditions.length > 0) {
      this.conditions.push({
        operator: LogicalOperator.NOT,
        conditions: subBuilder.conditions,
      });
    }
    
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy<K extends keyof T>(
    selector: PropertySelector<T, K>,
    direction: SortDirection | 'ASC' | 'DESC' = SortDirection.ASC,
  ): this {
    const dummyEntity = {} as T;
    const property = selector(dummyEntity) as unknown as K;
    
    this.sorts.push({
      property,
      direction: typeof direction === 'string' 
        ? (direction === 'ASC' ? SortDirection.ASC : SortDirection.DESC)
        : direction,
    });
    
    return this;
  }

  /**
   * Add pagination
   */
  paginate(page: number, limit: number): this {
    this.pagination = { page, limit };
    return this;
  }

  /**
   * Skip records
   */
  skip(count: number): this {
    if (!this.pagination) {
      this.pagination = { page: 1, limit: 10 };
    }
    this.pagination.page = Math.floor(count / this.pagination.limit) + 1;
    return this;
  }

  /**
   * Take/limit records
   */
  take(count: number): this {
    if (!this.pagination) {
      this.pagination = { page: 1, limit: count };
    } else {
      this.pagination.limit = count;
    }
    return this;
  }

  /**
   * Add JOIN
   */
  join<K extends keyof T>(
    selector: PropertySelector<T, K>,
    alias: string,
    type: 'INNER' | 'LEFT' | 'RIGHT' = 'INNER',
  ): this {
    const dummyEntity = {} as T;
    const property = selector(dummyEntity) as unknown as K;
    
    this.joins.push({
      property,
      alias,
      type,
    });
    
    return this;
  }

  /**
   * Select specific fields (partial loading)
   */
  select<K extends keyof T>(...selectors: PropertySelector<T, K>[]): this {
    const dummyEntity = {} as T;
    const properties = selectors.map(s => s(dummyEntity) as unknown as K);
    
    this.selectFields = {
      properties: properties as Array<keyof T>,
    };
    
    return this;
  }

  /**
   * Add GROUP BY
   */
  groupBy<K extends keyof T>(...selectors: PropertySelector<T, K>[]): this {
    const dummyEntity = {} as T;
    const properties = selectors.map(s => s(dummyEntity) as unknown as K);
    
    this.groupBy = {
      properties: properties as Array<keyof T>,
    };
    
    return this;
  }

  /**
   * Build TypeORM QueryBuilder
   */
  toQuery(): SelectQueryBuilder<T> {
    let query = this.repository.createQueryBuilder(this.alias);

    // Apply conditions
    query = this.applyConditions(query, this.conditions);

    // Apply joins
    for (const join of this.joins) {
      const relation = `${this.alias}.${String(join.property)}`;
      
      switch (join.type) {
        case 'INNER':
          query = query.innerJoinAndSelect(relation, join.alias);
          break;
        case 'LEFT':
          query = query.leftJoinAndSelect(relation, join.alias);
          break;
        case 'RIGHT':
          query = query.rightJoinAndSelect(relation, join.alias);
          break;
      }
    }

    // Apply select fields
    if (this.selectFields) {
      const fields = this.selectFields.properties.map(
        p => `${this.alias}.${String(p)}`
      );
      query = query.select(fields);
    }

    // Apply sorting
    for (let i = 0; i < this.sorts.length; i++) {
      const sort = this.sorts[i];
      const field = `${this.alias}.${String(sort.property)}`;
      
      if (i === 0) {
        query = query.orderBy(field, sort.direction);
      } else {
        query = query.addOrderBy(field, sort.direction);
      }
    }

    // Apply group by
    if (this.groupBy) {
      for (const property of this.groupBy.properties) {
        query = query.addGroupBy(`${this.alias}.${String(property)}`);
      }
    }

    // Apply pagination
    if (this.pagination) {
      const skip = (this.pagination.page - 1) * this.pagination.limit;
      query = query.skip(skip).take(this.pagination.limit);
    }

    return query;
  }

  /**
   * Execute query and return results
   */
  async getMany(): Promise<T[]> {
    const query = this.toQuery();
    return await query.getMany();
  }

  /**
   * Execute query and return single result
   */
  async getOne(): Promise<T | null> {
    const query = this.toQuery();
    return await query.getOne();
  }

  /**
   * Execute query and return count
   */
  async getCount(): Promise<number> {
    const query = this.toQuery();
    return await query.getCount();
  }

  /**
   * Execute query with pagination
   */
  async getManyAndCount(): Promise<PaginatedResult<T>> {
    const query = this.toQuery();
    const [data, total] = await query.getManyAndCount();

    const page = this.pagination?.page || 1;
    const limit = this.pagination?.limit || data.length;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Apply conditions to query builder
   */
  private applyConditions(
    query: SelectQueryBuilder<T>,
    conditions: Array<QueryCondition<T> | LogicalCondition<T>>,
    paramPrefix = '',
  ): SelectQueryBuilder<T> {
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      
      if (this.isLogicalCondition(condition)) {
        query = this.applyLogicalCondition(query, condition, `${paramPrefix}${i}_`);
      } else {
        query = this.applyQueryCondition(query, condition, `${paramPrefix}${i}`);
      }
    }

    return query;
  }

  /**
   * Apply logical condition (AND/OR/NOT)
   */
  private applyLogicalCondition(
    query: SelectQueryBuilder<T>,
    condition: LogicalCondition<T>,
    paramPrefix: string,
  ): SelectQueryBuilder<T> {
    const subConditions = condition.conditions.map((c, i) => {
      if (this.isLogicalCondition(c)) {
        return this.buildLogicalConditionString(c, `${paramPrefix}${i}_`);
      } else {
        return this.buildQueryConditionString(c, `${paramPrefix}${i}`);
      }
    });

    let conditionString: string;
    
    switch (condition.operator) {
      case LogicalOperator.OR:
        conditionString = `(${subConditions.join(' OR ')})`;
        break;
      case LogicalOperator.NOT:
        conditionString = `NOT (${subConditions.join(' AND ')})`;
        break;
      default:
        conditionString = `(${subConditions.join(' AND ')})`;
    }

    query = query.andWhere(conditionString, this.buildParameters(condition.conditions, paramPrefix));
    
    return query;
  }

  /**
   * Apply single query condition
   */
  private applyQueryCondition(
    query: SelectQueryBuilder<T>,
    condition: QueryCondition<T>,
    paramName: string,
  ): SelectQueryBuilder<T> {
    const conditionString = this.buildQueryConditionString(condition, paramName);
    const parameters = this.buildConditionParameters(condition, paramName);
    
    query = query.andWhere(conditionString, parameters);
    
    return query;
  }

  /**
   * Build condition string for query
   */
  private buildQueryConditionString(condition: QueryCondition<T>, paramName: string): string {
    const field = `${this.alias}.${String(condition.property)}`;
    
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
      case 'IN':
        return `${field} IN (:...${paramName})`;
      case 'NOT_IN':
        return `${field} NOT IN (:...${paramName})`;
      case 'LIKE':
        return `${field} LIKE :${paramName}`;
      case 'ILIKE':
        return `${field} ILIKE :${paramName}`;
      case 'CONTAINS':
        return `${field} ILIKE :${paramName}`;
      case 'STARTS_WITH':
        return `${field} ILIKE :${paramName}`;
      case 'ENDS_WITH':
        return `${field} ILIKE :${paramName}`;
      case 'BETWEEN':
        return `${field} BETWEEN :${paramName}_min AND :${paramName}_max`;
      case 'IS_NULL':
        return `${field} IS NULL`;
      case 'IS_NOT_NULL':
        return `${field} IS NOT NULL`;
      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }
  }

  /**
   * Build logical condition string recursively
   */
  private buildLogicalConditionString(condition: LogicalCondition<T>, paramPrefix: string): string {
    const subConditions = condition.conditions.map((c, i) => {
      if (this.isLogicalCondition(c)) {
        return this.buildLogicalConditionString(c, `${paramPrefix}${i}_`);
      } else {
        return this.buildQueryConditionString(c, `${paramPrefix}${i}`);
      }
    });

    switch (condition.operator) {
      case LogicalOperator.OR:
        return `(${subConditions.join(' OR ')})`;
      case LogicalOperator.NOT:
        return `NOT (${subConditions.join(' AND ')})`;
      default:
        return `(${subConditions.join(' AND ')})`;
    }
  }

  /**
   * Build parameters for condition
   */
  private buildConditionParameters(condition: QueryCondition<T>, paramName: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    switch (condition.operator) {
      case 'IN':
      case 'NOT_IN':
        params[paramName] = condition.values;
        break;
      case 'BETWEEN':
        params[`${paramName}_min`] = condition.min;
        params[`${paramName}_max`] = condition.max;
        break;
      case 'CONTAINS':
        params[paramName] = `%${condition.value}%`;
        break;
      case 'STARTS_WITH':
        params[paramName] = `${condition.value}%`;
        break;
      case 'ENDS_WITH':
        params[paramName] = `%${condition.value}`;
        break;
      case 'IS_NULL':
      case 'IS_NOT_NULL':
        // No parameters needed
        break;
      default:
        params[paramName] = condition.value;
    }
    
    return params;
  }

  /**
   * Build parameters for multiple conditions
   */
  private buildParameters(
    conditions: Array<QueryCondition<T> | LogicalCondition<T>>,
    paramPrefix: string,
  ): Record<string, any> {
    const params: Record<string, any> = {};
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      
      if (this.isLogicalCondition(condition)) {
        Object.assign(params, this.buildParameters(condition.conditions, `${paramPrefix}${i}_`));
      } else {
        Object.assign(params, this.buildConditionParameters(condition, `${paramPrefix}${i}`));
      }
    }
    
    return params;
  }

  /**
   * Type guard for logical conditions
   */
  private isLogicalCondition(
    condition: QueryCondition<T> | LogicalCondition<T>,
  ): condition is LogicalCondition<T> {
    return 'operator' in condition && 
           (condition.operator === LogicalOperator.AND || 
            condition.operator === LogicalOperator.OR || 
            condition.operator === LogicalOperator.NOT);
  }
}
