import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class WorkerService {
    // Service to handle worker queue scheduling
    private readonly logger = new Logger(WorkerService.name);

    constructor(
        @InjectQueue('ai-scoring') private aiScoringQueue: Queue,
        @InjectQueue('oracle-updates') private oracleUpdateQueue: Queue,
        @InjectQueue('batching') private batchingQueue: Queue,
    ) { }

    async scheduleAiScoring(data: any) {
        this.logger.log(`Scheduling AI scoring task`);
        return this.aiScoringQueue.add('score', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
        });
    }

    async scheduleOracleUpdate(data: any) {
        this.logger.log(`Scheduling Oracle update task`);
        return this.oracleUpdateQueue.add('update', data, {
            attempts: 5,
            backoff: {
                type: 'fixed',
                delay: 5000,
            },
        });
    }

    async scheduleBatch(data: any) {
        this.logger.log(`Scheduling batch task`);
        return this.batchingQueue.add('process-batch', data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });
    }

    // Metrics helper
    async getQueueMetrics(queueName: 'ai-scoring' | 'oracle-updates' | 'batching') {
        let queue: Queue;
        switch (queueName) {
            case 'ai-scoring':
                queue = this.aiScoringQueue;
                break;
            case 'oracle-updates':
                queue = this.oracleUpdateQueue;
                break;
            case 'batching':
                queue = this.batchingQueue;
                break;
        }

        return {
            waiting: await queue.getWaitingCount(),
            active: await queue.getActiveCount(),
            completed: await queue.getCompletedCount(),
            failed: await queue.getFailedCount(),
        };
    }
}
