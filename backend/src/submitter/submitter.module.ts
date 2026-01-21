import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SubmitterController } from './submitter.controller';
import { SubmitterService } from './submitter.service';
import { SubmissionProcessor } from './submission.processor';
import { StellarService } from './stellar.service';
import { Submission } from './entities/submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission]),
    BullModule.registerQueue({
      name: 'submissions',
    }),
  ],
  controllers: [SubmitterController],
  providers: [SubmitterService, SubmissionProcessor, StellarService],
  exports: [SubmitterService],
})
export class SubmitterModule {}
