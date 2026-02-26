/**
 * Aggregate Builder Tests
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import { AggregateBuilder } from './aggregate-builder';

interface TestEntity {
  id: string;
  name: string;
  category: string;
  amount: number;
  quantity: number;
}

describe('AggregateBuilder', () => {
  let mockRepository: jest.Mocked<Repository<TestEntity>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<TestEntity>>;

  beforeEach(() => {
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      andHaving: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
    } as any;

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;
  });

  describe('aggregation functions', () => {
    it('should build COUNT aggregation', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder.count(x => x.id, 'total');
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('COUNT')])
      );
    });

    it('should build COUNT(*) aggregation', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder.count(undefined, 'total');
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('COUNT(*)')])
      );
    });

    it('should build SUM aggregation', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder.sum(x => x.amount, 'totalAmount');
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SUM')])
      );
    });

    it('should build AVG aggregation', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder.avg(x => x.amount, 'avgAmount');
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('AVG')])
      );
    });

    it('should build MIN aggregation', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder.min(x => x.amount, 'minAmount');
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('MIN')])
      );
    });

    it('should build MAX aggregation', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder.max(x => x.amount, 'maxAmount');
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('MAX')])
      );
    });

    it('should build multiple aggregations', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder
        .count(x => x.id, 'total')
        .sum(x => x.amount, 'totalAmount')
        .avg(x => x.amount, 'avgAmount');
      
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('COUNT'),
          expect.stringContaining('SUM'),
          expect.stringContaining('AVG'),
        ])
      );
    });
  });

  describe('GROUP BY', () => {
    it('should add GROUP BY clause', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder
        .count(x => x.id, 'total')
        .groupBy(x => x.category);
      
      builder.toQuery();

      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalledWith('test.category');
    });

    it('should add multiple GROUP BY fields', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder
        .count(x => x.id, 'total')
        .groupBy(x => x.category, x => x.name);
      
      builder.toQuery();

      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalledWith('test.category');
      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalledWith('test.name');
    });

    it('should include GROUP BY fields in SELECT', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder
        .count(x => x.id, 'total')
        .groupBy(x => x.category);
      
      builder.toQuery();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('COUNT'),
          'test.category',
        ])
      );
    });
  });

  describe('HAVING clause', () => {
    it('should add HAVING condition', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder
        .count(x => x.id, 'total')
        .groupBy(x => x.category)
        .having({
          property: 'total' as any,
          operator: 'GREATER_THAN' as any,
          value: 10,
        });
      
      builder.toQuery();

      expect(mockQueryBuilder.andHaving).toHaveBeenCalledWith(
        'total > :having_0',
        { having_0: 10 }
      );
    });
  });

  describe('query execution', () => {
    it('should execute aggregation query', async () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      const mockResult = [
        { category: 'A', total: 10 },
        { category: 'B', total: 20 },
      ];
      
      mockQueryBuilder.getRawMany.mockResolvedValue(mockResult);
      
      builder
        .count(x => x.id, 'total')
        .groupBy(x => x.category);
      
      const result = await builder.execute();
      
      expect(result).toEqual(mockResult);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalled();
    });

    it('should execute single aggregation result', async () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      const mockResult = { total: 100, avgAmount: 50.5 };
      
      mockQueryBuilder.getRawOne.mockResolvedValue(mockResult);
      
      builder
        .count(x => x.id, 'total')
        .avg(x => x.amount, 'avgAmount');
      
      const result = await builder.executeOne();
      
      expect(result).toEqual(mockResult);
      expect(mockQueryBuilder.getRawOne).toHaveBeenCalled();
    });
  });

  describe('complex aggregations', () => {
    it('should build complex aggregation with GROUP BY and HAVING', () => {
      const builder = new AggregateBuilder(mockRepository, 'test');
      
      builder
        .count(x => x.id, 'total')
        .sum(x => x.amount, 'totalAmount')
        .avg(x => x.amount, 'avgAmount')
        .groupBy(x => x.category)
        .having({
          property: 'total' as any,
          operator: 'GREATER_THAN' as any,
          value: 5,
        });
      
      const query = builder.toQuery();
      
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.addGroupBy).toHaveBeenCalled();
      expect(mockQueryBuilder.andHaving).toHaveBeenCalled();
    });
  });
});
