import { ValueObject } from './value-object.base';
import { ValidationError } from '../errors/validation.error';

/**
 * Signature Value Object
 * Represents a cryptographic signature with validation
 */
export class Signature extends ValueObject<{ value: string }> {
  private static readonly SIGNATURE_REGEX = /^[A-Fa-f0-9]+$/; // Hexadecimal format
  private static readonly MIN_LENGTH = 64; // Minimum length for signatures
  private static readonly MAX_LENGTH = 256; // Maximum reasonable length

  private constructor(value: string) {
    super({ value });
  }

  /**
   * Create a Signature from a string
   * @param value String representation of signature
   * @returns Signature instance
   * @throws ValidationError if signature format is invalid
   */
  public static create(value: string): Signature {
    if (!value) {
      throw new ValidationError('Signature cannot be empty');
    }

    if (typeof value !== 'string') {
      throw new ValidationError('Signature must be a string');
    }

    if (value.length < this.MIN_LENGTH || value.length > this.MAX_LENGTH) {
      throw new ValidationError(
        `Signature length must be between ${this.MIN_LENGTH} and ${this.MAX_LENGTH} characters, got: ${value.length}`
      );
    }

    if (!this.SIGNATURE_REGEX.test(value)) {
      throw new ValidationError(
        `Invalid signature format: ${value}. Must be hexadecimal string.`
      );
    }

    return new Signature(value.trim());
  }

  /**
   * Validate signature format
   * @param value String to validate
   * @returns True if valid, false otherwise
   */
  public static isValidFormat(value: string): boolean {
    if (!value) return false;
    
    return (
      typeof value === 'string' &&
      value.length >= this.MIN_LENGTH &&
      value.length <= this.MAX_LENGTH &&
      this.SIGNATURE_REGEX.test(value)
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
   * Get signature length
   */
  public getLength(): number {
    return this.props.value.length;
  }

  /**
   * Check if signature is valid hex format
   */
  public isValidHex(): boolean {
    return Signature.SIGNATURE_REGEX.test(this.props.value);
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
  public static fromJSON(json: string): Signature {
    return Signature.create(json);
  }

  /**
   * Create from buffer
   */
  public static fromBuffer(buffer: Buffer): Signature {
    return Signature.create(buffer.toString('hex'));
  }

  /**
   * Convert to buffer
   */
  public toBuffer(): Buffer {
    return Buffer.from(this.props.value, 'hex');
  }
}