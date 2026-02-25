import { ValueObject } from './value-object.base';
import { ValidationError } from '../errors/validation.error';

/**
 * Timestamp Value Object
 * Represents a timestamp with validation for clock skew
 */
export class Timestamp extends ValueObject<{ value: Date }> {
  private static readonly MAX_CLOCK_SKEW_MS = 300000; // 5 minutes

  private constructor(value: Date) {
    super({ value: new Date(value) }); // Ensure immutable date
  }

  /**
   * Create a Timestamp from a Date or ISO string
   * @param value Date or string representation
   * @returns Timestamp instance
   * @throws ValidationError if date is invalid
   */
  public static create(value: Date | string): Timestamp {
    let date: Date;

    if (typeof value === 'string') {
      date = new Date(value);
    } else if (value instanceof Date) {
      date = new Date(value);
    } else {
      throw new ValidationError('Timestamp must be a Date or ISO string');
    }

    if (isNaN(date.getTime())) {
      throw new ValidationError(`Invalid date: ${value}`);
    }

    // Check for reasonable date range
    const now = new Date();
    const minDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // 10 years ago
    const maxDate = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years in future

    if (date < minDate || date > maxDate) {
      throw new ValidationError(
        `Date out of reasonable range: ${date.toISOString()}. Must be within 10 years of current time.`
      );
    }

    return new Timestamp(date);
  }

  /**
   * Create a Timestamp for the current moment
   */
  public static now(): Timestamp {
    return new Timestamp(new Date());
  }

  /**
   * Create a Timestamp from a Unix timestamp (milliseconds)
   */
  public static fromUnix(unix: number): Timestamp {
    return Timestamp.create(new Date(unix));
  }

  /**
   * Check if timestamp is within clock skew tolerance
   */
  public isWithinClockSkew(toleranceMs: number = Timestamp.MAX_CLOCK_SKEW_MS): boolean {
    const now = new Date();
    const diff = Math.abs(this.props.value.getTime() - now.getTime());
    return diff <= toleranceMs;
  }

  /**
   * Check if timestamp is in the past
   */
  public isPast(): boolean {
    return this.getDateValue() < new Date();
  }

  /**
   * Check if timestamp is in the future
   */
  public isFuture(): boolean {
    return this.getDateValue() > new Date();
  }

  /**
   * Check if timestamp is the same as another
   */
  public isSame(other: Timestamp): boolean {
    return this.getDateValue().getTime() === other.getDateValue().getTime();
  }

  /**
   * Check if this timestamp is before another
   */
  public isBefore(other: Timestamp): boolean {
    return this.getDateValue() < other.getDateValue();
  }

  /**
   * Check if this timestamp is after another
   */
  public isAfter(other: Timestamp): boolean {
    return this.getDateValue() > other.getDateValue();
  }

  /**
   * Get the raw Date value
   */
  public getValue(): { value: Date } {
    return this.props;
  }

  public getDateValue(): Date {
    return new Date(this.props.value); // Return copy to maintain immutability
  }

  public getRawValue(): Date {
    return new Date(this.props.value); // Return copy to maintain immutability
  }

  public getValueObject(): { value: Date } {
    return { value: new Date(this.props.value) };
  }

  /**
   * Get Unix timestamp (milliseconds)
   */
  public toUnix(): number {
    return this.getDateValue().getTime();
  }

  /**
   * Get ISO string representation
   */
  public toISOString(): string {
    return this.getDateValue().toISOString();
  }

  /**
   * Get formatted string representation
   */
  public format(format: 'iso' | 'locale' = 'iso'): string {
    switch (format) {
      case 'iso':
        return this.toISOString();
      case 'locale':
        return this.getDateValue().toLocaleString();
      default:
        return this.toISOString();
    }
  }

  /**
   * Add time units to the timestamp
   */
  public add(milliseconds: number): Timestamp {
    const newDate = new Date(this.getDateValue().getTime() + milliseconds);
    return new Timestamp(newDate);
  }

  /**
   * Subtract time units from the timestamp
   */
  public subtract(milliseconds: number): Timestamp {
    return this.add(-milliseconds);
  }

  /**
   * Calculate difference with another timestamp
   */
  public difference(other: Timestamp): number {
    return this.getDateValue().getTime() - other.getDateValue().getTime();
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.toISOString();
  }

  /**
   * For JSON serialization
   */
  public toJSON(): string {
    return this.toISOString();
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: string): Timestamp {
    return Timestamp.create(json);
  }
}