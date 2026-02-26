/**
 * Query Builder Tests
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryBuilder } from './query-builder';
import {
  equals,
  notEquals,
  greaterThan,
  lessThan,
  inArray,
  contains,
  between,
  isNull,
  isNotNull,
} from './operators';
import { SortDirection } from './types';

// Test entity
interface TestEntity {
  id: string;
  name: string;
  age: number;
  email: string;
  status: string;
  score: number;
  tags: string[];
  createdAt: Date;
}

describe('QueryBuilder', () => {
  let mockRepository: jest.Mocked<Repository<TestEntity>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<TestEntity>>;

  beforeEach(() => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      rightJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    } as any;

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;
  });

  describe('where conditions', () => {
    it('should build equals condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.status, equals('active'));
      const query = builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.status = :0',
        { '0': 'active' }
      );
    });

    it('should build not equals condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.status, notEquals('inactive'));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.status != :0',
        { '0': 'inactive' }
      );
    });

    it('should build greater than condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.age, greaterThan(18));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.age > :0',
        { '0': 18 }
      );
    });

    it('should build less than condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.score, lessThan(100));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.score < :0',
        { '0': 100 }
      );
    });

    it('should build IN condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.status, inArray(['active', 'pending']));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.status IN (:...0)',
        { '0': ['active', 'pending'] }
      );
    });

    it('should build CONTAINS condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.name, contains('john'));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.name ILIKE :0',
        { '0': '%john%' }
      );
    });

    it('should build BETWEEN condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.age, between(18, 65));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.age BETWEEN :0_min AND :0_max',
        { '0_min': 18, '0_max': 65 }
      );
    });

    it('should build IS NULL condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.email, isNull());
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.email IS NULL',
        {}
      );
    });

    it('should build IS NOT NULL condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.where(x => x.email, isNotNull());
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'test.email IS NOT NULL',
        {}
      );
    });

    it('should chain multiple where conditions', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder
        .where(x => x.status, equals('active'))
        .where(x => x.age, greaterThan(18))
        .where(x => x.score, lessThan(100));
      
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  describe('OR conditions', () => {
    it('should build OR condition group', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.orWhere(qb => 
        qb.where(x => x.status, equals('active'))
          .where(x => x.status, equals('pending'))
      );
      
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('NOT conditions', () => {
    it('should build NOT condition', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.not(qb => qb.where(x => x.status, equals('deleted')));
      builder.toQuery();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('sorting', () => {
    it('should add ORDER BY clause', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.orderBy(x => x.createdAt, SortDirection.DESC);
      builder.toQuery();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'test.createdAt',
        SortDirection.DESC
      );
    });

    it('should add multiple ORDER BY clauses', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder
        .orderBy(x => x.score, SortDirection.DESC)
        .orderBy(x => x.name, SortDirection.ASC);
      
      builder.toQuery();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'test.score',
        SortDirection.DESC
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'test.name',
        SortDirection.ASC
      );
    });

    it('should support string sort direction', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.orderBy(x => x.name, 'ASC');
      builder.toQuery();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'test.name',
        SortDirection.ASC
      );
    });
  });

  describe('pagination', () => {
    it('should add pagination', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.paginate(2, 10);
      builder.toQuery();

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should support skip and take', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder.skip(20).take(10);
      builder.toQuery();

      expect(mockQueryBuilder.skip).toHaveBeenCalled();
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('query execution', () => {
    it('should execute getMany', async () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      const mockData = [{ id: '1', name: 'Test' }] as any;
      
      mockQueryBuilder.getMany.mockResolvedValue(mockData);
      
      const result = await builder.getMany();
      
      expect(result).toEqual(mockData);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should execute getOne', async () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      const mockData = { id: '1', name: 'Test' } as any;
      
      mockQueryBuilder.getOne.mockResolvedValue(mockData);
      
      const result = await builder.getOne();
      
      expect(result).toEqual(mockData);
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should execute getCount', async () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      mockQueryBuilder.getCount.mockResolvedValue(42);
      
      const result = await builder.getCount();
      
      expect(result).toBe(42);
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });

    it('should execute getManyAndCount with pagination', async () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      const mockData = [{ id: '1' }, { id: '2' }] as any;
      
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockData, 20]);
      
      builder.paginate(1, 10);
      const result = await builder.getManyAndCount();
      
      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(20);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('complex queries', () => {
    it('should build complex query with multiple conditions', () => {
      const builder = new QueryBuilder(mockRepository, 'test');
      
      builder
        .where(x => x.status, equals('active'))
        .where(x => x.age, greaterThan(18))
        .where(x => x.score, between(50, 100))
        .orderBy(x => x.score, 'DESC')
        .paginate(1, 10);
      
      const query = builder.toQuery();
      
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
      expect(mockQueryBuilder.skip).toHaveBeenCalled();
      expect(mockQueryBuilder.take).toHaveBeenCalled();
    });
  });
});
