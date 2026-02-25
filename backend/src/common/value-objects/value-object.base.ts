/**
 * Base class for Value Objects in Domain Driven Design
 * Provides equality comparison, immutability, and serialization support
 */
export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Compare two value objects for equality
   * @param vo Value object to compare with
   * @returns True if equal, false otherwise
   */
  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }

  /**
   * Get the raw value of the value object
   * @returns Raw value
   */
  public getValue(): T {
    return this.props;
  }

  /**
   * Get a copy of the value object's properties
   * @returns Copy of properties
   */
  public getPropsCopy(): T {
    return { ...this.props };
  }

  /**
   * Get the value object as a string representation
   */
  public toString(): string {
    return JSON.stringify(this.props);
  }

  /**
   * Create a new instance with updated properties
   * @param newProps New properties to update
   * @returns New instance with updated properties
   */
  protected copyWith(newProps: Partial<T>): this {
    const mergedProps = { ...this.props, ...newProps };
    return new (this.constructor as any)(mergedProps);
  }
}