import { Test, TestingModule } from '@nestjs/testing';
import { AiScoringProcessor } from './ai-scoring.processor';
import { Job } from 'bullmq';

describe('AiScoringProcessor', () => {
    let processor: AiScoringProcessor;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AiScoringProcessor],
        }).compile();

        processor = module.get<AiScoringProcessor>(AiScoringProcessor);
    });

    it('should be defined', () => {
        expect(processor).toBeDefined();
    });

    it('should process a job successfully', async () => {
        const job = {
            id: '1',
            data: { some: 'data' },
        } as Job;

        // We mock Math.random to ensure it doesn't fail during this test
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const result = await processor.process(job);
        expect(result).toHaveProperty('score');
    });

    it('should throw error when random failure occurs', async () => {
        const job = {
            id: '2',
            data: { some: 'data' },
        } as Job;

        // We mock Math.random to trigger the failure condition (< 0.1)
        jest.spyOn(Math, 'random').mockReturnValue(0.05);

        await expect(processor.process(job)).rejects.toThrow('Random failure simulation');
    });
});
