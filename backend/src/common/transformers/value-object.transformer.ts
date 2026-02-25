import { ValueTransformer } from 'typeorm';
import { WalletAddress } from '../value-objects/wallet-address.vo';
import { Score } from '../value-objects/score.vo';
import { Timestamp } from '../value-objects/timestamp.vo';
import { Signature } from '../value-objects/signature.vo';
import { Hash } from '../value-objects/hash.vo';
import { Percentage } from '../value-objects/percentage.vo';

/**
 * TypeORM transformer for Value Objects
 * Enables seamless persistence of value objects in database
 */
export class ValueObjectTransformer<T> implements ValueTransformer {
  constructor(
    private readonly valueObjectType: 
      | typeof WalletAddress 
      | typeof Score 
      | typeof Timestamp 
      | typeof Signature 
      | typeof Hash 
      | typeof Percentage
  ) {}

  /**
   * Transform value object to database column value
   */
  to(value: T | null | undefined): any {
    if (value === null || value === undefined) {
      return null;
    }

    // If it's already a value object, serialize it
    if (value instanceof this.valueObjectType) {
      return (value as any).toJSON();
    }

    // If it's a primitive, try to create the value object
    try {
      const voInstance = (this.valueObjectType as any).fromJSON(value);
      return voInstance.toJSON();
    } catch (error) {
      // If conversion fails, return as-is
      return value;
    }
  }

  /**
   * Transform database column value to value object
   */
  from(value: any): T | null {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      // Try to create value object from JSON
      const voInstance = (this.valueObjectType as any).fromJSON(value);
      return voInstance as T;
    } catch (error) {
      // If conversion fails, return raw value
      return value as T;
    }
  }
}

/**
 * Predefined transformers for common value objects
 */
export const WalletAddressTransformer = new ValueObjectTransformer<WalletAddress>(WalletAddress);
export const ScoreTransformer = new ValueObjectTransformer<Score>(Score);
export const TimestampTransformer = new ValueObjectTransformer<Timestamp>(Timestamp);
export const SignatureTransformer = new ValueObjectTransformer<Signature>(Signature);
export const HashTransformer = new ValueObjectTransformer<Hash>(Hash);
export const PercentageTransformer = new ValueObjectTransformer<Percentage>(Percentage);