import { ValueObject } from './value-object.base';
import { ValidationError } from '../errors/validation.error';

/**
 * Wallet Address Value Object
 * Represents a wallet address with validation for various blockchain formats
 */
export class WalletAddress extends ValueObject<{ value: string }> {
  private static readonly STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
  private static readonly ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
  private static readonly SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  private constructor(value: string) {
    super({ value });
  }

  /**
   * Create a WalletAddress from a string
   * @param value String representation of wallet address
   * @returns WalletAddress instance
   * @throws ValidationError if address format is invalid
   */
  public static create(value: string): WalletAddress {
    if (!value) {
      throw new ValidationError('Wallet address cannot be empty');
    }

    if (typeof value !== 'string') {
      throw new ValidationError('Wallet address must be a string');
    }

    if (!this.isValidFormat(value)) {
      throw new ValidationError(
        `Invalid wallet address format: ${value}. Supported formats: Stellar, Ethereum, Solana`
      );
    }

    return new WalletAddress(value.trim());
  }

  /**
   * Validate wallet address format
   * @param value String to validate
   * @returns True if valid, false otherwise
   */
  public static isValidFormat(value: string): boolean {
    if (!value) return false;
    
    return (
      this.STELLAR_PUBLIC_KEY_REGEX.test(value) ||
      this.ETHEREUM_ADDRESS_REGEX.test(value) ||
      this.SOLANA_ADDRESS_REGEX.test(value)
    );
  }

  /**
   * Get the raw string value
   */
  public getValue(): string {
    return this.props.value;
  }

  public getRawValue(): string {
    return this.props.value;
  }

  public getValueObject(): { value: string } {
    return this.props;
  }

  /**
   * Get the address type (Stellar, Ethereum, Solana)
   */
  public getAddressType(): 'stellar' | 'ethereum' | 'solana' | 'unknown' {
    const value = this.props.value;
    
    if (WalletAddress.STELLAR_PUBLIC_KEY_REGEX.test(value)) {
      return 'stellar';
    } else if (WalletAddress.ETHEREUM_ADDRESS_REGEX.test(value)) {
      return 'ethereum';
    } else if (WalletAddress.SOLANA_ADDRESS_REGEX.test(value)) {
      return 'solana';
    }
    
    return 'unknown';
  }

  /**
   * Check if address is for a specific blockchain
   */
  public isStellar(): boolean {
    return this.getAddressType() === 'stellar';
  }

  public isEthereum(): boolean {
    return this.getAddressType() === 'ethereum';
  }

  public isSolana(): boolean {
    return this.getAddressType() === 'solana';
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
  public static fromJSON(json: string): WalletAddress {
    return WalletAddress.create(json);
  }
}