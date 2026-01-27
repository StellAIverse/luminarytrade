import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WorkerService } from './worker.service';
import { AiScoringProcessor } from './processors/ai-scoring.processor';
import { OracleUpdateProcessor } from './processors/oracle-update.processor';
import { BatchingProcessor } from './processors/batching.processor';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'ai-scoring' },
      { name: 'oracle-updates' },
      { name: 'batching' },
    ),
  ],
  providers: [
    WorkerService,
    AiScoringProcessor,
    OracleUpdateProcessor,
    BatchingProcessor,
  ],
  exports: [WorkerService],
})
export class WorkerModule {}
