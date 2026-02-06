import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('oracle-updates')
export class OracleUpdateProcessor extends WorkerHost {
    private readonly logger = new Logger(OracleUpdateProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing Oracle update job ${job.id}`);

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simulate failure
        if (Math.random() < 0.1) {
            throw new Error('Oracle connection failed');
        }

        this.logger.log(`Oracle update job ${job.id} completed`);
        return { updated: true, timestamp: Date.now() };
    }
}
