import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SlotStatus } from '../../../../generated/prisma/enums';

export class QuerySlotsDto {
  @ApiProperty({
    description: 'Filter by court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  courtId?: string;

  @ApiProperty({
    description: 'Filter by slot status',
    enum: SlotStatus,
    required: false,
  })
  @IsEnum(SlotStatus, {
    message: 'Status must be one of: Available, Booked, Blocked, Expired, Held',
  })
  @IsOptional()
  status?: SlotStatus;

  @ApiProperty({
    description: 'Filter by a specific date in YYYY-MM-DD format',
    example: '2025-08-15',
    required: false,
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  @IsOptional()
  date?: string;

  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 20,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @IsOptional()
  limit?: number = 20;
}
