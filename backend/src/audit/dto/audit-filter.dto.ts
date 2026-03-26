import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsDate,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { AuditEventType, AuditStatus } from "../entities/audit-log.entity";

export class AuditFilterDto {
  @ApiPropertyOptional({ description: "Filter by user ID" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Filter by wallet address" })
  @IsOptional()
  @IsString()
  wallet?: string;

  @ApiPropertyOptional({
    enum: AuditEventType,
    description: "Filter by event type",
  })
  @IsOptional()
  @IsEnum(AuditEventType)
  eventType?: AuditEventType;

  @ApiPropertyOptional({
    description: "Filter by entity type, e.g. Transaction",
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: "Filter by entity ID" })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: AuditStatus, description: "Filter by status" })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({ description: "Start of date range (ISO-8601)" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: "End of date range (ISO-8601)" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: "IP address filter" })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ default: 50, description: "Max records to return" })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0, description: "Offset for pagination" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
