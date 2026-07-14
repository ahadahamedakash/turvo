import { ApiProperty } from '@nestjs/swagger';
import { DayType } from '../../../../generated/prisma/enums';

export class PricingRuleResponseDto {
  @ApiProperty({
    description: 'Pricing rule ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'Court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courtId!: string;

  @ApiProperty({
    description: 'Court name (included for convenience)',
    example: 'Court 1 - Main Arena',
  })
  courtName?: string;

  @ApiProperty({
    description: 'Day type for pricing',
    enum: DayType,
    example: DayType.Weekday,
  })
  dayType!: DayType;

  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '06:00',
  })
  startTime!: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '23:00',
  })
  endTime!: string;

  @ApiProperty({
    description: 'Price per hour',
    example: '500.00',
  })
  price!: string;

  @ApiProperty({
    description: 'Number of slots using this pricing rule',
    example: 24,
  })
  slotCount!: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt!: string;
}

export class PricingRuleListResponseDto {
  @ApiProperty({
    description: 'List of pricing rules',
    type: [PricingRuleResponseDto],
  })
  data!: PricingRuleResponseDto[];

  @ApiProperty({
    description: 'Total number of pricing rules',
    example: 15,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2,
  })
  totalPages!: number;
}
