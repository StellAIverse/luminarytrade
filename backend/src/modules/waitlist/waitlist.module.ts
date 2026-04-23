import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Waitlist } from './entities/waitlist.entity';
import { WaitlistService } from './waitlist.service';
import { WaitlistController } from './waitlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Waitlist])],
  providers: [WaitlistService],
  controllers: [WaitlistController],
  exports: [WaitlistService],
})
export class WaitlistModule {}
