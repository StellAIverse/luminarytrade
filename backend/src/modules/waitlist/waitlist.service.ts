import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Waitlist, WaitlistStatus } from './entities/waitlist.entity';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(Waitlist)
    private readonly waitlistRepo: Repository<Waitlist>,
  ) {}

  async join(email: string, name?: string): Promise<Waitlist> {
    const existing = await this.waitlistRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already on waitlist');
    }

    const entry = this.waitlistRepo.create({
      email,
      name,
      status: WaitlistStatus.PENDING,
    });

    const saved = await this.waitlistRepo.save(entry);
    this.logger.log(`New user joined waitlist: ${email}`);
    
    // Simulate sending welcome notification
    await this.sendNotification(saved, 'Welcome to LuminaryTrade Waitlist!');
    
    return saved;
  }

  async findAll(): Promise<Waitlist[]> {
    return this.waitlistRepo.find({ order: { createdAt: 'DESC' } });
  }

  async notifyUser(id: string): Promise<Waitlist> {
    const entry = await this.waitlistRepo.findOne({ where: { id } });
    if (!entry) {
      throw new Error('Waitlist entry not found');
    }

    await this.sendNotification(entry, 'You have been invited to join LuminaryTrade!');
    
    entry.status = WaitlistStatus.NOTIFIED;
    entry.notifiedAt = new Date();
    
    return this.waitlistRepo.save(entry);
  }

  private async sendNotification(entry: Waitlist, message: string): Promise<void> {
    // In a real implementation, this would call an EmailService
    this.logger.log(`[NOTIFICATION] Sending to ${entry.email}: ${message}`);
    
    // Patterned after AlertingService executeEmailAction
    console.log(`WAITLIST NOTIFICATION: ${entry.email} - ${message}`);
  }
}
