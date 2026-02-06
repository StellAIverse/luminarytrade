import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('ai-scoring')
export class AiScoringProcessor extends WorkerHost {
    private readonly logger = new Logger(AiScoringProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing AI scoring job ${job.id}`);

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (Math.random() < 0.1) {
            this.logger.error(`AI scoring job ${job.id} failed`);
            throw new Error('Random failure simulation for retry testing');
        }

        this.logger.log(`AI scoring job ${job.id} completed`);
        return { score: Math.random() * 100 };
    }
}
