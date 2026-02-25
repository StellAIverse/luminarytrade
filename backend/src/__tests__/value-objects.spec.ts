import { WalletAddress } from '../common/value-objects/wallet-address.vo';
import { Score } from '../common/value-objects/score.vo';
import { Timestamp } from '../common/value-objects/timestamp.vo';
import { Signature } from '../common/value-objects/signature.vo';
import { Hash } from '../common/value-objects/hash.vo';
import { Percentage } from '../common/value-objects/percentage.vo';
import { ValidationError } from '../common/errors/validation.error';

describe('Value Objects', () => {
  describe('WalletAddress', () => {
    it('should create a valid Stellar wallet address', () => {
      const validStellarAddress = 'GA7YNBWQD4J5JLPDB4ZNKCVXD4PWJJBSMNMKCPKHB5MJQVIB3NJQASBB';
      const walletAddress = WalletAddress.create(validStellarAddress);
      
      expect(walletAddress.getValue()).toBe(validStellarAddress);
      expect(walletAddress.getAddressType()).toBe('stellar');
      expect(walletAddress.isStellar()).toBe(true);
    });

    it('should create a valid Ethereum wallet address', () => {
      const validEthAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const walletAddress = WalletAddress.create(validEthAddress);
      
      expect(walletAddress.getValue()).toBe(validEthAddress);
      expect(walletAddress.getAddressType()).toBe('ethereum');
      expect(walletAddress.isEthereum()).toBe(true);
    });

    it('should throw error for invalid address', () => {
      expect(() => WalletAddress.create('invalid_address'))
        .toThrow(ValidationError);
    });

    it('should check equality correctly', () => {
      const addr1 = WalletAddress.create('GA7YNBWQD4J5JLPDB4ZNKCVXD4PWJJBSMNMKCPKHB5MJQVIB3NJQASBB');
      const addr2 = WalletAddress.create('GA7YNBWQD4J5JLPDB4ZNKCVXD4PWJJBSMNMKCPKHB5MJQVIB3NJQASBB');
      const addr3 = WalletAddress.create('GC2FFLU53IO7EB6RJB2DEURVGLUXLGHJKAFZ5JQV6F6GJA7P5XHTDCH7');
      
      expect(addr1.equals(addr2)).toBe(true);
      expect(addr1.equals(addr3)).toBe(false);
    });
  });

  describe('Score', () => {
    it('should create a valid score', () => {
      const score = Score.create(85);
      
      expect(score.getValue().value).toBe(85);
      expect(score.getRawValue()).toBe(85);
      expect(score.getRiskLevel()).toBe('low');
      expect(score.getCreditRating()).toBe('good');
    });

    it('should throw error for out of range score', () => {
      expect(() => Score.create(-10)).toThrow(ValidationError);
      expect(() => Score.create(150)).toThrow(ValidationError);
    });

    it('should convert between formats', () => {
      const score = Score.create(75);
      
      expect(score.toPercentage()).toBe(75);
      expect(score.toDecimal()).toBe(0.75);
    });

    it('should compare scores', () => {
      const score1 = Score.create(75);
      const score2 = Score.create(80);
      const score3 = Score.create(75);
      
      expect(score1.compareTo(score2)).toBe(-1); // score1 < score2
      expect(score2.compareTo(score1)).toBe(1);  // score2 > score1
      expect(score1.compareTo(score3)).toBe(0);  // score1 == score3
    });

    it('should create from string', () => {
      const score = Score.fromString('75%');
      expect(score.getRawValue()).toBe(75);
      
      const score2 = Score.fromString('85');
      expect(score2.getRawValue()).toBe(85);
    });
  });

  describe('Timestamp', () => {
    it('should create a valid timestamp', () => {
      const now = new Date();
      const timestamp = Timestamp.create(now);
      
      expect(timestamp.getDateValue().getTime()).toBe(now.getTime());
      expect(timestamp.toISOString()).toBe(now.toISOString());
    });

    it('should create from ISO string', () => {
      const isoString = '2023-01-01T10:00:00.000Z';
      const timestamp = Timestamp.create(isoString);
      
      expect(timestamp.toISOString()).toBe(isoString);
    });

    it('should handle time operations', () => {
      const baseTime = new Date('2023-01-01T10:00:00.000Z');
      const timestamp = Timestamp.create(baseTime);
      
      const futureTime = timestamp.add(3600000); // Add 1 hour (3600000 ms)
      expect(futureTime.getDateValue().getTime()).toBe(baseTime.getTime() + 3600000);
      
      const pastTime = timestamp.subtract(1800000); // Subtract 30 minutes
      expect(pastTime.getDateValue().getTime()).toBe(baseTime.getTime() - 1800000);
    });

    it('should compare timestamps', () => {
      const time1 = Timestamp.create('2023-01-01T10:00:00.000Z');
      const time2 = Timestamp.create('2023-01-01T11:00:00.000Z');
      
      expect(time1.isBefore(time2)).toBe(true);
      expect(time2.isAfter(time1)).toBe(true);
      expect(time1.isSame(time2)).toBe(false);
    });

    it('should throw error for invalid date', () => {
      expect(() => Timestamp.create('invalid-date')).toThrow(ValidationError);
    });
  });

  describe('Signature', () => {
    it('should create a valid signature', () => {
      const signature = 'a'.repeat(64); // Valid hex string of 64 chars
      const sig = Signature.create(signature);
      
      expect(sig.getRawValue()).toBe(signature);
      expect(sig.getLength()).toBe(64);
      expect(sig.isValidHex()).toBe(true);
    });

    it('should throw error for invalid signature', () => {
      expect(() => Signature.create('short')).toThrow(ValidationError);
      expect(() => Signature.create('invalid_hex')).toThrow(ValidationError);
    });

    it('should handle buffer conversion', () => {
      const hexSig = 'a'.repeat(64);
      const sig = Signature.create(hexSig);
      const buffer = sig.toBuffer();
      const fromBuffer = Signature.fromBuffer(buffer);
      
      expect(fromBuffer.getRawValue()).toBe(hexSig);
    });
  });

  describe('Hash', () => {
    it('should create a valid hash', () => {
      const sha256Hash = 'a'.repeat(64); // SHA256 hash length
      const hash = Hash.create(sha256Hash);
      
      expect(hash.getRawValue()).toBe(sha256Hash);
      expect(hash.getLength()).toBe(64);
      expect(hash.getAlgorithmType()).toBe('sha256');
    });

    it('should detect algorithm type', () => {
      const md5Hash = 'a'.repeat(32);
      const sha1Hash = 'b'.repeat(40);
      const sha256Hash = 'c'.repeat(64);
      const customHash = 'd'.repeat(80);
      
      expect(Hash.create(md5Hash).getAlgorithmType()).toBe('md5');
      expect(Hash.create(sha1Hash).getAlgorithmType()).toBe('sha1');
      expect(Hash.create(sha256Hash).getAlgorithmType()).toBe('sha256');
      expect(Hash.create(customHash).getAlgorithmType()).toBe('other');
    });

    it('should throw error for invalid hash', () => {
      expect(() => Hash.create('too_short')).toThrow(ValidationError);
      expect(() => Hash.create('invalid_hex')).toThrow(ValidationError);
    });
  });

  describe('Percentage', () => {
    it('should create a valid percentage', () => {
      const percentage = Percentage.create(75);
      
      expect(percentage.getRawValue()).toBe(75);
      expect(percentage.toDecimal()).toBe(0.75);
      expect(percentage.toString()).toBe('75%');
    });

    it('should throw error for out of range percentage', () => {
      expect(() => Percentage.create(-10)).toThrow(ValidationError);
      expect(() => Percentage.create(150)).toThrow(ValidationError);
    });

    it('should perform arithmetic operations', () => {
      const percent1 = Percentage.create(75);
      const percent2 = Percentage.create(20);
      
      const sum = percent1.add(percent2);
      expect(sum.getRawValue()).toBe(95);
      
      const diff = percent1.subtract(percent2);
      expect(diff.getRawValue()).toBe(55);
    });

    it('should calculate portions', () => {
      const percent = Percentage.create(50);
      const portion = percent.calculatePortion(100);
      
      expect(portion).toBe(50);
    });

    it('should compare percentages', () => {
      const percent1 = Percentage.create(75);
      const percent2 = Percentage.create(80);
      const percent3 = Percentage.create(75);
      
      expect(percent1.compareTo(percent2)).toBe(-1); // percent1 < percent2
      expect(percent2.compareTo(percent1)).toBe(1);  // percent2 > percent1
      expect(percent1.compareTo(percent3)).toBe(0);  // percent1 == percent3
    });
  });

  describe('Immutability', () => {
    it('should maintain immutability of value objects', () => {
      const originalScore = Score.create(85);
      const originalValue = originalScore.getRawValue();
      
      // Modifying the returned value shouldn't affect the VO
      const retrievedValue = originalScore.getValue();
      retrievedValue.value = 999;
      
      // Original should still have the same value
      expect(originalScore.getRawValue()).toBe(originalValue);
    });

    it('should create new instances on operations', () => {
      const timestamp1 = Timestamp.now();
      const timestamp2 = timestamp1.add(1000);
      
      expect(timestamp1).not.toBe(timestamp2);
      expect(timestamp1.equals(timestamp2)).toBe(false);
    });
  });
});