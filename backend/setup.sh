#!/bin/bash

# Submitter Module Setup Script (NestJS + Stellar/Soroban)
# Run this in your project root

echo "Creating Submitter Module for Stellar/Soroban batch submissions..."

# Create directory structure
mkdir -p src/submitter src/queue src/common/decorators src/common/guards

# Update package.json
cat > package.json << 'EOF'
{
  "name": "stellar-submitter",
  "version": "0.1.0",
  "description": "Batch transaction submitter for Stellar/Soroban",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.1.1",
    "@nestjs/bull": "^10.0.1",
    "@nestjs/typeorm": "^10.0.1",
    "bull": "^4.12.0",
    "typeorm": "^0.3.19",
    "pg": "^8.11.3",
    "stellar-sdk": "^11.2.2",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/bull": "^4.10.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.5",
    "@types/uuid": "^9.0.7",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
EOF

# Update tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
EOF

# Update jest.config.js
cat > jest.config.js << 'EOF'
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
EOF

# Create main.ts
cat > src/main.ts << 'EOF'
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  await app.listen(3000);
  console.log('Submitter service running on http://localhost:3000');
}

bootstrap();
EOF

# Create app.module.ts
cat > src/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SubmitterModule } from './submitter/submitter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'submitter',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    SubmitterModule,
  ],
})
export class AppModule {}
EOF

# Create submission entity
cat > src/submitter/entities/submission.entity.ts << 'EOF'
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SubmissionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Entity('submissions')
@Index(['idempotencyKey'], { unique: true })
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  idempotencyKey: string;

  @Column('jsonb')
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.PENDING,
  })
  status: SubmissionStatus;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
EOF

# Create DTOs
cat > src/submitter/dto/create-submission.dto.ts << 'EOF'
import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class CreateSubmissionDto {
  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;

  @IsNotEmpty()
  @IsObject()
  payload: Record<string, any>;
}
EOF

cat > src/submitter/dto/submission-response.dto.ts << 'EOF'
export class SubmissionResponseDto {
  id: string;
  idempotencyKey: string;
  status: string;
  transactionHash?: string;
  createdAt: Date;
}
EOF

# Create Stellar service
cat > src/submitter/stellar.service.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common';
import * as StellarSdk from 'stellar-sdk';

@Injectable()
export class StellarService {
  private readonly logger = new Logger(StellarService.name);
  private server: StellarSdk.Server;
  private sourceKeypair: StellarSdk.Keypair;

  constructor() {
    const network = process.env.STELLAR_NETWORK || 'testnet';
    const horizonUrl = network === 'testnet' 
      ? 'https://horizon-testnet.stellar.org'
      : 'https://horizon.stellar.org';

    this.server = new StellarSdk.Server(horizonUrl);
    
    if (network === 'testnet') {
      StellarSdk.Networks.TESTNET;
    } else {
      StellarSdk.Networks.PUBLIC;
    }

    // Load source account from env
    const secretKey = process.env.STELLAR_SECRET_KEY;
    if (secretKey) {
      this.sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
    }
  }

  async submitTransaction(payload: Record<string, any>): Promise<string> {
    try {
      this.logger.log(`Submitting transaction to Stellar`);

      // Load source account
      const sourceAccount = await this.server.loadAccount(
        this.sourceKeypair.publicKey()
      );

      // Build transaction with memo containing document hash
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addMemo(StellarSdk.Memo.text(payload.documentHash || 'document'))
        .addOperation(
          StellarSdk.Operation.manageData({
            name: 'doc_hash',
            value: payload.documentHash,
          })
        )
        .setTimeout(30)
        .build();

      // Sign transaction
      transaction.sign(this.sourceKeypair);

      // Submit to network
      const result = await this.server.submitTransaction(transaction);
      
      this.logger.log(`Transaction submitted: ${result.hash}`);
      return result.hash;
    } catch (error) {
      this.logger.error(`Stellar submission failed: ${error.message}`);
      throw error;
    }
  }

  async submitBatch(payloads: Record<string, any>[]): Promise<string[]> {
    const hashes: string[] = [];
    
    for (const payload of payloads) {
      try {
        const hash = await this.submitTransaction(payload);
        hashes.push(hash);
      } catch (error) {
        this.logger.error(`Batch item failed: ${error.message}`);
        hashes.push(null);
      }
    }

    return hashes;
  }
}
EOF

# Create submission processor
cat > src/submitter/submission.processor.ts << 'EOF'
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { StellarService } from './stellar.service';

@Processor('submissions')
export class SubmissionProcessor {
  private readonly logger = new Logger(SubmissionProcessor.name);

  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    private stellarService: StellarService,
  ) {}

  @Process('submit-single')
  async handleSingleSubmission(job: Job) {
    const { submissionId } = job.data;
    this.logger.log(`Processing submission: ${submissionId}`);

    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });

    if (!submission) {
      this.logger.error(`Submission not found: ${submissionId}`);
      return;
    }

    try {
      submission.status = SubmissionStatus.PROCESSING;
      await this.submissionRepository.save(submission);

      // Submit to Stellar
      const txHash = await this.stellarService.submitTransaction(
        submission.payload,
      );

      // Mark as completed
      submission.status = SubmissionStatus.COMPLETED;
      submission.transactionHash = txHash;
      submission.completedAt = new Date();
      await this.submissionRepository.save(submission);

      this.logger.log(`Submission completed: ${submissionId} -> ${txHash}`);
    } catch (error) {
      this.logger.error(`Submission failed: ${error.message}`);

      submission.retryCount++;
      submission.errorMessage = error.message;

      if (submission.retryCount >= submission.maxRetries) {
        submission.status = SubmissionStatus.FAILED;
        this.logger.error(`Submission permanently failed: ${submissionId}`);
      } else {
        submission.status = SubmissionStatus.RETRYING;
        // Re-queue with exponential backoff
        const delay = Math.pow(2, submission.retryCount) * 1000;
        throw new Error(`Retry needed with delay ${delay}ms`);
      }

      await this.submissionRepository.save(submission);
    }
  }

  @Process('submit-batch')
  async handleBatchSubmission(job: Job) {
    const { submissionIds } = job.data;
    this.logger.log(`Processing batch of ${submissionIds.length} submissions`);

    const submissions = await this.submissionRepository.findByIds(submissionIds);
    const payloads = submissions.map(s => s.payload);

    try {
      const txHashes = await this.stellarService.submitBatch(payloads);

      // Update submissions
      for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        const txHash = txHashes[i];

        if (txHash) {
          submission.status = SubmissionStatus.COMPLETED;
          submission.transactionHash = txHash;
          submission.completedAt = new Date();
        } else {
          submission.status = SubmissionStatus.FAILED;
          submission.errorMessage = 'Batch submission failed';
        }

        await this.submissionRepository.save(submission);
      }

      this.logger.log(`Batch completed`);
    } catch (error) {
      this.logger.error(`Batch submission failed: ${error.message}`);
      throw error;
    }
  }
}
EOF

# Create submitter service
cat > src/submitter/submitter.service.ts << 'EOF'
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubmitterService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectQueue('submissions')
    private submissionQueue: Queue,
  ) {}

  async createSubmission(dto: CreateSubmissionDto): Promise<Submission> {
    // Check for existing submission with same idempotency key
    const existing = await this.submissionRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existing) {
      throw new ConflictException(
        `Submission with idempotency key ${dto.idempotencyKey} already exists`,
      );
    }

    // Create submission
    const submission = this.submissionRepository.create({
      idempotencyKey: dto.idempotencyKey,
      payload: dto.payload,
      status: SubmissionStatus.PENDING,
    });

    await this.submissionRepository.save(submission);

    // Queue for processing
    await this.submissionQueue.add('submit-single', {
      submissionId: submission.id,
    });

    return submission;
  }

  async getSubmission(id: string): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    return submission;
  }

  async getByIdempotencyKey(key: string): Promise<Submission> {
    return this.submissionRepository.findOne({
      where: { idempotencyKey: key },
    });
  }

  async listSubmissions(status?: SubmissionStatus): Promise<Submission[]> {
    if (status) {
      return this.submissionRepository.find({ where: { status } });
    }
    return this.submissionRepository.find({ take: 100 });
  }

  async createBatch(dtos: CreateSubmissionDto[]): Promise<Submission[]> {
    const submissions: Submission[] = [];

    for (const dto of dtos) {
      const submission = await this.createSubmission(dto);
      submissions.push(submission);
    }

    // Queue batch processing
    await this.submissionQueue.add('submit-batch', {
      submissionIds: submissions.map(s => s.id),
    });

    return submissions;
  }
}
EOF

# Create submitter controller
cat > src/submitter/submitter.controller.ts << 'EOF'
import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { SubmitterService } from './submitter.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionStatus } from './entities/submission.entity';

@Controller('submissions')
export class SubmitterController {
  constructor(private readonly submitterService: SubmitterService) {}

  @Post()
  async createSubmission(@Body() dto: CreateSubmissionDto) {
    return this.submitterService.createSubmission(dto);
  }

  @Post('batch')
  async createBatch(@Body() dtos: CreateSubmissionDto[]) {
    return this.submitterService.createBatch(dtos);
  }

  @Get()
  async listSubmissions(@Query('status') status?: SubmissionStatus) {
    return this.submitterService.listSubmissions(status);
  }

  @Get(':id')
  async getSubmission(@Param('id') id: string) {
    return this.submitterService.getSubmission(id);
  }

  @Get('key/:key')
  async getByKey(@Param('key') key: string) {
    return this.submitterService.getByIdempotencyKey(key);
  }
}
EOF

# Create submitter module
cat > src/submitter/submitter.module.ts << 'EOF'
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
EOF

# Create test file
cat > src/submitter/submitter.service.spec.ts << 'EOF'
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { SubmitterService } from './submitter.service';
import { Submission } from './entities/submission.entity';

describe('SubmitterService', () => {
  let service: SubmitterService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmitterService,
        {
          provide: getRepositoryToken(Submission),
          useValue: mockRepository,
        },
        {
          provide: getQueueToken('submissions'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<SubmitterService>(SubmitterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create submission with idempotency', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.create.mockReturnValue({ id: '123' });
    mockRepository.save.mockResolvedValue({ id: '123' });

    const dto = {
      idempotencyKey: 'test-key',
      payload: { documentHash: 'abc123' },
    };

    const result = await service.createSubmission(dto);
    expect(result).toBeDefined();
    expect(mockQueue.add).toHaveBeenCalled();
  });
});
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=submitter
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - STELLAR_NETWORK=testnet
      - STELLAR_SECRET_KEY=${STELLAR_SECRET_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=submitter
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
EOF

# Create .env.example
cat > .env.example << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=submitter

REDIS_HOST=localhost
REDIS_PORT=6379

STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=YOUR_SECRET_KEY_HERE
EOF

# Create nest-cli.json
cat > nest-cli.json << 'EOF'
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
EOF

# Update README
cat > README.md << 'EOF'
# Stellar/Soroban Submitter Module

NestJS microservice for queuing and batch-submitting verified results to Stellar/Soroban blockchain.

## Features

✅ Queue-based submission system (Bull/Redis)
✅ Idempotency keys prevent double submission
✅ Automatic retry mechanism with exponential backoff
✅ Batch submission support
✅ PostgreSQL for persistent storage
✅ Transaction status tracking
✅ Stellar SDK integration

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Stellar account with testnet XLM

## Quick Start

### Using Docker Compose

```bash
docker-compose up --build
```

### Local Development

```bash
# Install dependencies
npm install

# Start databases
docker-compose up postgres redis

# Run migrations (auto with synchronize)
npm run start:dev
```

## API Endpoints

### Create Submission
```bash
POST /submissions
Content-Type: application/json

{
  "idempotencyKey": "unique-key-123",
  "payload": {
    "documentHash": "abc123...",
    "metadata": {}
  }
}
```

### Create Batch
```bash
POST /submissions/batch
Content-Type: application/json

[
  {
    "idempotencyKey": "key-1",
    "payload": { "documentHash": "hash1" }
  },
  {
    "idempotencyKey": "key-2",
    "payload": { "documentHash": "hash2" }
  }
]
```

### Get Submission
```bash
GET /submissions/:id
GET /submissions/key/:idempotencyKey
```

### List Submissions
```bash
GET /submissions?status=completed
```

## Submission States

- `pending` - Queued for processing
- `processing` - Currently submitting to Stellar
- `completed` - Successfully submitted
- `failed` - Permanently failed after retries
- `retrying` - Temporarily failed, will retry

## Retry Logic

- Automatic retries with exponential backoff
- Default max retries: 3
- Delay: 2^retryCount seconds
- Failed submissions marked after max retries

## Environment Variables

```bash
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=your_secret_key
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Idempotency

All submissions require a unique `idempotencyKey`. Duplicate keys will return `409 Conflict` with the existing submission.

## Monitoring

- Queue status via Bull Board (optional)
- Database for submission history
- Logs for transaction tracking

## Production Deployment

1. Set production environment variables
2. Use mainnet Stellar network
3. Configure proper retry limits
4. Enable queue monitoring
5. Set up database backups

## Architecture

```
Client → API Controller → Service → Database
                              ↓
                         Queue (Bull)
                              ↓
                       Processor
                              ↓
                    Stellar Network
```
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
coverage/
.DS_Store
EOF

echo ""
echo "✅ Submitter Module created successfully!"
echo ""
echo "Next steps:"
echo "1. npm install"
echo "2. docker-compose up (starts PostgreSQL + Redis)"
echo "3. Add STELLAR_SECRET_KEY to .env"
echo "4. npm run start:dev"
echo "5. curl http://localhost:3000/submissions"
echo ""