import { ValueObject } from './value-object.base';
import { ValidationError } from '../errors/validation.error';

/**
 * Percentage Value Object
 * Represents a percentage with validation (0-100 range)
 */
export class Percentage extends ValueObject<{ value: number }> {
  private static readonly MIN_PERCENTAGE = 0;
  private static readonly MAX_PERCENTAGE = 100;

  private constructor(value: number) {
    super({ value });
  }

  /**
   * Create a Percentage from a number
   * @param value Numeric value for the percentage
   * @returns Percentage instance
   * @throws ValidationError if percentage is out of range
   */
  public static create(value: number): Percentage {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError('Percentage must be a valid number');
    }

    if (value < this.MIN_PERCENTAGE || value > this.MAX_PERCENTAGE) {
      throw new ValidationError(
        `Percentage must be between ${this.MIN_PERCENTAGE} and ${this.MAX_PERCENTAGE}, got: ${value}`
      );
    }

    return new Percentage(value);
  }

  /**
   * Validate percentage range
   * @param value Number to validate
   * @returns True if valid, false otherwise
   */
  public static isValid(value: number): boolean {
    return (
      typeof value === 'number' &&
      !isNaN(value) &&
      value >= this.MIN_PERCENTAGE &&
      value <= this.MAX_PERCENTAGE
    );
  }

  /**
   * Get the value object
   */
  public getValue(): { value: number } {
    return this.props;
  }

  public getRawValue(): number {
    return this.props.value;
  }

  public getValueObject(): { value: number } {
    return this.props;
  }

  /**
   * Get the percentage as a decimal (0-1)
   */
  public toDecimal(): number {
    return this.props.value / 100;
  }

  /**
   * Get the percentage as a fraction of 100
   */
  public toFraction(): { numerator: number; denominator: number } {
    const value = this.props.value;
    const gcd = this.greatestCommonDivisor(Math.round(value), 100);
    return {
      numerator: Math.round(value) / gcd,
      denominator: 100 / gcd
    };
  }

  /**
   * Calculate a portion of a given value based on this percentage
   */
  public calculatePortion(total: number): number {
    if (typeof total !== 'number' || isNaN(total)) {
      throw new ValidationError('Total must be a valid number');
    }
    return (this.props.value / 100) * total;
  }

  /**
   * Compare percentages
   */
  public compareTo(other: Percentage): -1 | 0 | 1 {
    const thisValue = this.props.value;
    const otherValue = other.getRawValue();
    
    if (thisValue < otherValue) return -1;
    if (thisValue > otherValue) return 1;
    return 0;
  }

  /**
   * Add another percentage to this one
   */
  public add(other: Percentage): Percentage {
    const newValue = this.props.value + other.getRawValue();
    if (newValue > Percentage.MAX_PERCENTAGE) {
      throw new ValidationError(
        `Resulting percentage (${newValue}) exceeds maximum of ${Percentage.MAX_PERCENTAGE}`
      );
    }
    return Percentage.create(newValue);
  }

  /**
   * Subtract another percentage from this one
   */
  public subtract(other: Percentage): Percentage {
    const newValue = this.props.value - other.getRawValue();
    if (newValue < Percentage.MIN_PERCENTAGE) {
      throw new ValidationError(
        `Resulting percentage (${newValue}) is below minimum of ${Percentage.MIN_PERCENTAGE}`
      );
    }
    return Percentage.create(newValue);
  }

  /**
   * String representation
   */
  public toString(): string {
    return `${this.props.value}%`;
  }

  /**
   * For JSON serialization
   */
  public toJSON(): number {
    return this.props.value;
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: number): Percentage {
    return Percentage.create(json);
  }

  /**
   * Create from percentage string (e.g., "75%" or "75")
   */
  public static fromString(str: string): Percentage {
    if (!str) {
      throw new ValidationError('Percentage string cannot be empty');
    }

    // Remove % sign if present
    const cleanStr = str.replace('%', '').trim();
    const numValue = parseFloat(cleanStr);

    if (isNaN(numValue)) {
      throw new ValidationError(`Invalid percentage string format: ${str}`);
    }

    return Percentage.create(numValue);
  }

  /**
   * Helper method to calculate greatest common divisor
   */
  private greatestCommonDivisor(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}