# Value Objects Implementation

This directory contains Value Objects implementations following Domain-Driven Design principles. Value Objects provide type safety and encapsulation for domain values, replacing primitive obsession with meaningful domain types.

## Implemented Value Objects

### 1. WalletAddress
Represents a wallet address with validation for various blockchain formats (Stellar, Ethereum, Solana).

```typescript
import { WalletAddress } from '../common/value-objects';

// Create a wallet address
const walletAddress = WalletAddress.create('GA7YNBWQD4J5JLPDB4ZNKCVXD4PWJJBSMNMKCPKHB5MJQVIB3NJQASBB');

// Validate address type
if (walletAddress.isStellar()) {
  console.log('This is a Stellar address');
}
```

### 2. Score
Represents a numeric score with validation (0-100 range).

```typescript
import { Score } from '../common/value-objects';

// Create a score
const creditScore = Score.create(75);

// Get risk level
const riskLevel = creditScore.getRiskLevel(); // 'medium'

// Compare scores
const score1 = Score.create(80);
const score2 = Score.create(75);
const comparison = score1.compareTo(score2); // 1 (score1 > score2)
```

### 3. Timestamp
Represents a timestamp with validation for clock skew.

```typescript
import { Timestamp } from '../common/value-objects';

// Create a timestamp
const timestamp = Timestamp.create(new Date());

// Check if timestamp is in the past
if (timestamp.isPast()) {
  console.log('This timestamp is in the past');
}
```

### 4. Signature
Represents a cryptographic signature with validation.

```typescript
import { Signature } from '../common/value-objects';

// Create a signature
const signature = Signature.create('a'.repeat(64)); // Valid hex string

// Convert to buffer
const buffer = signature.toBuffer();
```

### 5. Hash
Represents a cryptographic hash with validation.

```typescript
import { Hash } from '../common/value-objects';

// Create a hash
const hash = Hash.create('a'.repeat(64)); // SHA256 hash

// Detect algorithm type
const algorithmType = hash.getAlgorithmType(); // 'sha256'
```

### 6. Percentage
Represents a percentage with validation (0-100 range).

```typescript
import { Percentage } from '../common/value-objects';

// Create a percentage
const taxRate = Percentage.create(15);

// Calculate portion
const taxAmount = taxRate.calculatePortion(100); // 15
```

## TypeORM Integration

The value objects can be used with TypeORM using the provided transformers:

```typescript
import { Entity, Column } from 'typeorm';
import { WalletAddressTransformer } from '../common/transformers/value-object.transformer';
import { WalletAddress } from '../common/value-objects';

@Entity()
export class User {
  @Column({ 
    type: 'varchar',
    transformer: WalletAddressTransformer 
  })
  walletAddress: WalletAddress;
}
```

## Benefits

- **Type Safety**: Compile-time checking of domain types
- **Validation**: Automatic validation on creation
- **Immutability**: Value objects cannot be modified after creation
- **Domain Semantics**: Clear, meaningful types instead of primitives
- **Encapsulation**: Behavior and validation encapsulated with data