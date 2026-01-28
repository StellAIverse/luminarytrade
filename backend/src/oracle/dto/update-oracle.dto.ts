import { IsArray, IsInt, IsNotEmpty, IsNumberString, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OracleFeedDto {
  @IsString()
  @IsNotEmpty()
  pair: string;

  // price as string to avoid JS float rounding; store as numeric in DB
  @IsNumberString()
  price: string;

  @IsInt()
  decimals: number;
}

export class UpdateOracleDto {
  @IsInt()
  timestamp: number; // unix seconds (or ms) — standardize in your app

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OracleFeedDto)
  feeds: OracleFeedDto[];

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  signer?: string; // optional, can be derived from signature verification
}