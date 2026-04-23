import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum WaitlistStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('waitlist')
export class Waitlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: WaitlistStatus,
    default: WaitlistStatus.PENDING,
  })
  status: WaitlistStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  notifiedAt: Date;
}
