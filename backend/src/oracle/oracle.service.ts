import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UpdateOracleDto } from './dto/update-oracle.dto';
// import { OracleSnapshot } from './entities/oracle-snapshot.entity';
// import { OracleLatestPrice } from './entities/oracle-latest.entity';
// import { verifySignature, canonicalizePayload } from './utils/signature.util';
import * as process from 'process';
import { OracleSnapshot } from './entities/oracle-snapshot.entity';
import { OracleLatestPrice } from './entities/oracle-latest.entity';
import { verifySignature } from './utils/signature.utils';

@Injectable()
export class OracleService {
  private readonly oracleSignerAddress: string;
  private readonly maxClockSkewMs: number;

  constructor(
    @InjectRepository(OracleSnapshot) private readonly snapshotRepo: Repository<OracleSnapshot>,
    @InjectRepository(OracleLatestPrice) private readonly latestRepo: Repository<OracleLatestPrice>,
    private readonly dataSource: DataSource,
  ) {
    this.oracleSignerAddress = process.env.ORACLE_SIGNER_ADDRESS; // e.g. 0x...
    this.maxClockSkewMs = parseInt(process.env.ORACLE_MAX_CLOCK_SKEW_MS || '120000', 10); // default 2min
  }

  private validateTimestamp(ts: number) {
    const tMs = ts > 1e12 ? ts : ts * 1000; // accept seconds or ms
    const now = Date.now();
    if (Math.abs(now - tMs) > this.maxClockSkewMs) {
      throw new BadRequestException('timestamp out of allowed skew');
    }
    return new Date(tMs);
  }

  async updateSnapshot(dto: UpdateOracleDto) {
    // verify signature
    const recovered = await verifySignature(dto.signature, dto.timestamp, dto.feeds);
    if (this.oracleSignerAddress && recovered.toLowerCase() !== this.oracleSignerAddress.toLowerCase()) {
      throw new UnauthorizedException('invalid signature signer');
    }

    const timestampDate = this.validateTimestamp(dto.timestamp);

    // Transaction: insert snapshot and upsert latest
    return this.dataSource.transaction(async (manager) => {
      const snapshot = manager.create(OracleSnapshot, {
        timestamp: timestampDate,
        signer: recovered,
        signature: dto.signature,
        feeds: dto.feeds,
      });
      const savedSnapshot = await manager.save(snapshot);

      // Upsert latest prices (Postgres ON CONFLICT)
      for (const f of dto.feeds) {
        // Use query builder to perform upsert
        await manager
          .createQueryBuilder()
          .insert()
          .into(OracleLatestPrice)
          .values({
            pair: f.pair,
            price: f.price,
            decimals: f.decimals,
            timestamp: timestampDate,
            snapshotId: savedSnapshot.id,
          })
          .orUpdate(
            {
              conflict_target: ['pair'],
              overwrite: ['price', 'decimals', 'timestamp', 'snapshotId', 'updatedAt'],
            },
            ['pair'],
          )
          .execute();
      }

      return { snapshotId: savedSnapshot.id };
    });
  }

  async getLatest() {
    const latest = await this.latestRepo.find();
    return latest.map((l) => ({
      pair: l.pair,
      price: l.price,
      decimals: l.decimals,
      timestamp: l.timestamp,
    }));
  }
}