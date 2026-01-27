import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OracleController } from './oracle.controller';
import { OracleService } from './oracle.service';
import { OracleSnapshot } from './entities/oracle-snapshot.entity';
import { OracleLatestPrice } from './entities/oracle-latest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OracleSnapshot, OracleLatestPrice])],
  controllers: [OracleController],
  providers: [OracleService],
})
export class OracleModule {}