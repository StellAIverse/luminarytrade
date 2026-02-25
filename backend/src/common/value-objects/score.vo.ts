import { ValueObject } from './value-object.base';
import { ValidationError } from '../errors/validation.error';

/**
 * Score Value Object
 * Represents a numeric score with validation (typically 0-100 range)
 */
export class Score extends ValueObject<{ value: number }> {
  private static readonly MIN_SCORE = 0;
  private static readonly MAX_SCORE = 100;

  private constructor(value: number) {
    super({ value });
  }

  /**
   * Create a Score from a number
   * @param value Numeric value for the score
   * @returns Score instance
   * @throws ValidationError if score is out of range
   */
  public static create(value: number): Score {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError('Score must be a valid number');
    }

    if (value < this.MIN_SCORE || value > this.MAX_SCORE) {
      throw new ValidationError(
        `Score must be between ${this.MIN_SCORE} and ${this.MAX_SCORE}, got: ${value}`
      );
    }

    return new Score(value);
  }

  /**
   * Validate score range
   * @param value Number to validate
   * @returns True if valid, false otherwise
   */
  public static isValid(value: number): boolean {
    return (
      typeof value === 'number' &&
      !isNaN(value) &&
      value >= this.MIN_SCORE &&
      value <= this.MAX_SCORE
    );
  }

  /**
   * Get the raw numeric value
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

  public getNumericValue(): number {
    return this.props.value;
  }

  /**
   * Get the score as percentage (0-100)
   */
  public toPercentage(): number {
    return this.props.value;
  }

  /**
   * Get the score as decimal (0-1)
   */
  public toDecimal(): number {
    return this.props.value / 100;
  }

  /**
   * Get risk level based on score
   */
  public getRiskLevel(): 'very-low' | 'low' | 'medium' | 'high' | 'very-high' {
    const value = this.props.value;
    
    if (value >= 80) return 'very-low';
    if (value >= 60) return 'low';
    if (value >= 40) return 'medium';
    if (value >= 20) return 'high';
    return 'very-high';
  }

  /**
   * Get credit rating based on score
   */
  public getCreditRating(): 'excellent' | 'good' | 'fair' | 'poor' | 'very-poor' {
    const value = this.props.value;
    
    if (value >= 80) return 'excellent';
    if (value >= 65) return 'good';
    if (value >= 50) return 'fair';
    if (value >= 35) return 'poor';
    return 'very-poor';
  }

  /**
   * Compare scores
   */
  public compareTo(other: Score): -1 | 0 | 1 {
    const thisValue = this.props.value;
    const otherValue = other.getRawValue();
    
    if (thisValue < otherValue) return -1;
    if (thisValue > otherValue) return 1;
    return 0;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.props.value.toString();
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
  public static fromJSON(json: number): Score {
    return Score.create(json);
  }

  /**
   * Create from percentage string (e.g., "75%" or "75")
   */
  public static fromString(str: string): Score {
    if (!str) {
      throw new ValidationError('Score string cannot be empty');
    }

    // Remove % sign if present
    const cleanStr = str.replace('%', '').trim();
    const numValue = parseFloat(cleanStr);

    if (isNaN(numValue)) {
      throw new ValidationError(`Invalid score string format: ${str}`);
    }

    return Score.create(numValue);
  }
}