import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WaitlistService } from './waitlist.service';
import { Waitlist, WaitlistStatus } from './entities/waitlist.entity';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: getRepositoryToken(Waitlist),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('join', () => {
    it('should add a new user to the waitlist', async () => {
      const email = 'test@example.com';
      const name = 'Test User';
      
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ email, name, status: WaitlistStatus.PENDING });
      repo.save.mockResolvedValue({ id: '1', email, name, status: WaitlistStatus.PENDING });

      const result = await service.join(email, name);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.email).toBe(email);
    });

    it('should throw ConflictException if email already exists', async () => {
      const email = 'existing@example.com';
      repo.findOne.mockResolvedValue({ email });

      await expect(service.join(email)).rejects.toThrow('Email already on waitlist');
    });
  });

  describe('notifyUser', () => {
    it('should notify a user and update status', async () => {
      const id = '1';
      const entry = { id, email: 'test@example.com', status: WaitlistStatus.PENDING };
      
      repo.findOne.mockResolvedValue(entry);
      repo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.notifyUser(id);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result.status).toBe(WaitlistStatus.NOTIFIED);
      expect(result.notifiedAt).toBeDefined();
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
        id,
        status: WaitlistStatus.NOTIFIED
      }));
    });

    it('should throw error if waitlist entry not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.notifyUser('non-existent')).rejects.toThrow('Waitlist entry not found');
    });
  });
});
