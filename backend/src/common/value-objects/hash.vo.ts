import { ValueObject } from './value-object.base';
import { ValidationError } from '../errors/validation.error';

/**
 * Hash Value Object
 * Represents a cryptographic hash with validation
 */
export class Hash extends ValueObject<{ value: string }> {
  private static readonly HASH_REGEX = /^[A-Fa-f0-9]+$/; // Hexadecimal format
  private static readonly SHA256_LENGTH = 64; // Length of SHA256 hash in hex
  private static readonly SHA1_LENGTH = 40;   // Length of SHA1 hash in hex
  private static readonly MD5_LENGTH = 32;    // Length of MD5 hash in hex
  private static readonly MIN_LENGTH = 32;    // Minimum length for hashes
  private static readonly MAX_LENGTH = 128;   // Maximum reasonable length

  private constructor(value: string) {
    super({ value });
  }

  /**
   * Create a Hash from a string
   * @param value String representation of hash
   * @returns Hash instance
   * @throws ValidationError if hash format is invalid
   */
  public static create(value: string): Hash {
    if (!value) {
      throw new ValidationError('Hash cannot be empty');
    }

    if (typeof value !== 'string') {
      throw new ValidationError('Hash must be a string');
    }

    if (value.length < this.MIN_LENGTH || value.length > this.MAX_LENGTH) {
      throw new ValidationError(
        `Hash length must be between ${this.MIN_LENGTH} and ${this.MAX_LENGTH} characters, got: ${value.length}`
      );
    }

    if (!this.HASH_REGEX.test(value)) {
      throw new ValidationError(
        `Invalid hash format: ${value}. Must be hexadecimal string.`
      );
    }

    return new Hash(value.trim());
  }

  /**
   * Validate hash format
   * @param value String to validate
   * @returns True if valid, false otherwise
   */
  public static isValidFormat(value: string): boolean {
    if (!value) return false;
    
    return (
      typeof value === 'string' &&
      value.length >= this.MIN_LENGTH &&
      value.length <= this.MAX_LENGTH &&
      this.HASH_REGEX.test(value)
    );
  }

  /**
   * Get the raw string value
   */
  public getValue(): { value: string } {
    return this.props;
  }

  public getRawValue(): string {
    return this.props.value;
  }

  public getValueObject(): { value: string } {
    return this.props;
  }

  /**
   * Get hash length
   */
  public getLength(): number {
    return this.props.value.length;
  }

  /**
   * Check hash algorithm type based on length
   */
  public getAlgorithmType(): 'md5' | 'sha1' | 'sha256' | 'other' {
    const length = this.getLength();
    
    if (length === Hash.MD5_LENGTH) return 'md5';
    if (length === Hash.SHA1_LENGTH) return 'sha1';
    if (length === Hash.SHA256_LENGTH) return 'sha256';
    return 'other';
  }

  /**
   * Check if hash is valid hex format
   */
  public isValidHex(): boolean {
    return Hash.HASH_REGEX.test(this.props.value);
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.props.value;
  }

  /**
   * For JSON serialization
   */
  public toJSON(): string {
    return this.props.value;
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: string): Hash {
    return Hash.create(json);
  }

  /**
   * Create from buffer
   */
  public static fromBuffer(buffer: Buffer): Hash {
    return Hash.create(buffer.toString('hex'));
  }

  /**
   * Convert to buffer
   */
  public toBuffer(): Buffer {
    return Buffer.from(this.props.value, 'hex');
  }
}