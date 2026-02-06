import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'oracle_latest_prices' })
@Unique(['pair'])
export class OracleLatestPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  pair: string;

  @Column({ type: 'numeric' })
  price: string;

  @Column({ type: 'int' })
  decimals: number;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'uuid' })
  snapshotId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}