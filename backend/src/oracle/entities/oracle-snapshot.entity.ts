import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'oracle_snapshots' })
export class OracleSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'text' })
  signer: string;

  @Column({ type: 'text' })
  signature: string;

  @Column({ type: 'jsonb' })
  feeds: any; // array of { pair, price, decimals }

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}