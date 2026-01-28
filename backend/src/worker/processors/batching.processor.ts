import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('batching')
export class BatchingProcessor extends WorkerHost {
    private readonly logger = new Logger(BatchingProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing batching job ${job.id}`);

        // Simulate batch processing
        const batchSize = job.data.items?.length || 0;
        await new Promise(resolve => setTimeout(resolve, 100 * batchSize));

        this.logger.log(`Batching job ${job.id} completed. Processed ${batchSize} items.`);
        return { processed: batchSize };
    }
}
