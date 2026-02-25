/**
 * Example of how to integrate Value Objects into existing services
 * This demonstrates the type safety and validation benefits
 */

import { WalletAddress } from '../value-objects/wallet-address.vo';
import { Score } from '../value-objects/score.vo';
import { Timestamp } from '../value-objects/timestamp.vo';
import { Signature } from '../value-objects/signature.vo';
import { Hash } from '../value-objects/hash.vo';
import { Percentage } from '../value-objects/percentage.vo';

// Example: Improved AuthService using Value Objects
export class ImprovedAuthService {
  /**
   * Before: Primitive types everywhere
   * async transfer(from: string, to: string, amount: number) { }
   * 
   * After: Type-safe Value Objects
   */
  async transfer(
    from: WalletAddress,
    to: WalletAddress,
    amount: Score
  ): Promise<{ success: boolean; transactionId: Hash }> {
    // Type safety ensures correct types at compile time
    // Validation happens automatically when Value Objects are created
    
    // Business logic with domain semantics
    if (amount.getRawValue() <= 0) {
      throw new Error('Transfer amount must be positive');
    }
    
    // Create transaction record with proper types
    const transactionId = Hash.create(
      this.generateSecureHash(`${from.getValue()}-${to.getValue()}-${Timestamp.now().toUnix()}`)
    );
    
    return { success: true, transactionId };
  }
  
  /**
   * Enhanced authentication with Value Objects
   */
  async authenticateWithSignature(
    walletAddress: WalletAddress,
    message: string,
    signature: Signature
  ): Promise<boolean> {
    // All inputs are validated and properly typed
    if (!walletAddress.isStellar()) {
      throw new Error('Only Stellar addresses are supported');
    }
    
    // Signature validation logic here
    return this.verifyStellarSignature(
      walletAddress.getRawValue(),
      message,
      signature
    );
  }
  
  /**
   * Risk assessment with Score Value Objects
   */
  async assessRisk(
    userScore: Score,
    transactionAmount: Score
  ): Promise<{ riskLevel: 'low' | 'medium' | 'high'; riskScore: Score }> {
    // Leverage Value Object behaviors
    const riskFactor = userScore.compareTo(transactionAmount);
    
    let riskLevel: 'low' | 'medium' | 'high';
    let riskScore: Score;
    
    if (riskFactor === -1) { // userScore < transactionAmount
      riskLevel = 'high';
      riskScore = Score.create(85);
    } else if (riskFactor === 0) { // userScore === transactionAmount
      riskLevel = 'medium';
      riskScore = Score.create(60);
    } else { // userScore > transactionAmount
      riskLevel = 'low';
      riskScore = Score.create(25);
    }
    
    return { riskLevel, riskScore };
  }
  
  private generateSecureHash(input: string): string {
    // Simplified hash generation for example
    return 'a'.repeat(64); // In reality, use proper hashing
  }
  
  private verifyStellarSignature(
    walletAddress: string,
    message: string,
    signature: Signature
  ): boolean {
    // Implementation would verify the signature against the message
    return true; // Simplified for example
  }
}

// Example: Oracle Service with Value Objects
export class ImprovedOracleService {
  async validatePriceUpdate(
    priceHash: Hash,
    timestamp: Timestamp,
    signature: Signature
  ): Promise<boolean> {
    // Validate hash algorithm
    if (priceHash.getAlgorithmType() !== 'sha256') {
      throw new Error('Only SHA256 hashes are accepted');
    }
    
    // Check timestamp validity
    if (timestamp.isFuture()) {
      throw new Error('Timestamp cannot be in the future');
    }
    
    if (!timestamp.isWithinClockSkew(300000)) { // 5 minutes tolerance
      throw new Error('Timestamp is outside acceptable clock skew');
    }
    
    // Validate signature
    if (!signature.isValidHex()) {
      throw new Error('Invalid signature format');
    }
    
    // All validations passed
    return true;
  }
  
  async calculatePriceChange(
    oldPrice: Score,
    newPrice: Score
  ): Promise<{ change: Percentage; volatility: Score }> {
    const oldVal = oldPrice.getRawValue();
    const newVal = newPrice.getRawValue();
    
    // Calculate percentage change
    const changePercent = ((newVal - oldVal) / oldVal) * 100;
    const change = Percentage.create(Math.abs(changePercent));
    
    // Calculate volatility based on the change
    const volatilityScore = Math.min(Math.abs(changePercent) * 2, 100);
    const volatility = Score.create(volatilityScore);
    
    return { change, volatility };
  }
}

// Example: Entity with Value Objects
export class ImprovedUser {
  constructor(
    public readonly walletAddress: WalletAddress,
    public readonly creditScore: Score,
    public readonly createdAt: Timestamp,
    public readonly publicKeyHash: Hash
  ) {}
  
  // Methods leverage Value Object behaviors
  isHighValueCustomer(): boolean {
    return this.creditScore.getRiskLevel() === 'very-low';
  }
  
  getAccountAge(): number {
    return Timestamp.now().difference(this.createdAt);
  }
  
  getWalletType(): string {
    return this.walletAddress.getAddressType();
  }
}

// Usage example
export function demonstrateValueObjects() {
  // Creating Value Objects - validation happens at creation time
  const walletAddress = WalletAddress.create('GA7YNBWQD4J5JLPDB4ZNKCVXD4PWJJBSMNMKCPKHB5MJQVIB3NJQASBB');
  const creditScore = Score.create(85);
  const timestamp = Timestamp.now();
  const signature = Signature.create('a'.repeat(64));
  const hash = Hash.create('b'.repeat(64));
  const feePercentage = Percentage.create(2.5);
  
  // Type-safe usage
  const user = new ImprovedUser(walletAddress, creditScore, timestamp, hash);
  
  console.log(`Wallet type: ${user.getWalletType()}`);
  console.log(`Risk level: ${creditScore.getRiskLevel()}`);
  console.log(`Is high value customer: ${user.isHighValueCustomer()}`);
  
  return user;
}