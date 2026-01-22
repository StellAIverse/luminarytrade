import { Test, TestingModule } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

describe('WorkerService', () => {
    let service: WorkerService;
    let aiQueue: Queue;
    let oracleQueue: Queue;
    let batchQueue: Queue;

    beforeEach(async () => {
        const queueMock = {
            add: jest.fn(),
            getWaitingCount: jest.fn().mockResolvedValue(0),
            getActiveCount: jest.fn().mockResolvedValue(0),
            getCompletedCount: jest.fn().mockResolvedValue(0),
            getFailedCount: jest.fn().mockResolvedValue(0),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkerService,
                {
                    provide: getQueueToken('ai-scoring'),
                    useValue: queueMock,
                },
                {
                    provide: getQueueToken('oracle-updates'),
                    useValue: queueMock,
                },
                {
                    provide: getQueueToken('batching'),
                    useValue: queueMock,
                },
            ],
        }).compile();

        service = module.get<WorkerService>(WorkerService);
        aiQueue = module.get<Queue>(getQueueToken('ai-scoring'));
        oracleQueue = module.get<Queue>(getQueueToken('oracle-updates'));
        batchQueue = module.get<Queue>(getQueueToken('batching'));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should schedule AI scoring task', async () => {
        await service.scheduleAiScoring({ data: 'test' });
        expect(aiQueue.add).toHaveBeenCalledWith('score', { data: 'test' }, expect.any(Object));
    });

    it('should schedule Oracle update task', async () => {
        await service.scheduleOracleUpdate({ price: 100 });
        expect(oracleQueue.add).toHaveBeenCalledWith('update', { price: 100 }, expect.any(Object));
    });

    it('should schedule batch task', async () => {
        await service.scheduleBatch({ items: [] });
        expect(batchQueue.add).toHaveBeenCalledWith('process-batch', { items: [] }, expect.any(Object));
    });
});
