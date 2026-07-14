import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DayType } from '../../../../generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class QueryPricingRuleDto {
  @ApiProperty({
    description: 'Filter by court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  courtId?: string;

  @ApiProperty({
    description: 'Filter by day type',
    enum: DayType,
    required: false,
  })
  @IsEnum(DayType, { message: 'Day type must be a valid enum value' })
  @IsOptional()
  dayType?: DayType;

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
    default: 10,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @IsOptional()
  limit?: number = 10;
}
