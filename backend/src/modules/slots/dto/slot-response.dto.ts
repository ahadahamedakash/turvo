import { ApiProperty } from '@nestjs/swagger';
import { SlotStatus } from '../../../../generated/prisma/enums';

export class SlotResponseDto {
  @ApiProperty({
    description: 'Slot ID',
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
    description: 'Pricing rule the slot was generated from',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  pricingRuleId?: string;

  @ApiProperty({
    description: 'Snapshotted price per hour (Decimal serialized as string)',
    example: '500.00',
  })
  price!: string;

  @ApiProperty({
    description: 'Slot date in YYYY-MM-DD format',
    example: '2025-08-15',
  })
  date!: string;

  @ApiProperty({
    description: 'Start time in HH:mm format (24-hour)',
    example: '09:00',
  })
  startTime!: string;

  @ApiProperty({
    description: 'End time in HH:mm format (24-hour)',
    example: '10:00',
  })
  endTime!: string;

  @ApiProperty({
    description: 'Current slot status',
    enum: SlotStatus,
    example: SlotStatus.Available,
  })
  status!: SlotStatus;

  @ApiProperty({
    description: 'When the slot was placed on hold (ISO timestamp)',
    example: '2025-08-15T09:00:00.000Z',
    nullable: true,
  })
  heldAt?: string;

  @ApiProperty({
    description: 'User ID who holds the slot',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  heldBy?: string;

  @ApiProperty({
    description: 'When the hold expires (ISO timestamp)',
    example: '2025-08-15T09:15:00.000Z',
    nullable: true,
  })
  heldUntil?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-08-15T00:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-08-15T00:00:00.000Z',
  })
  updatedAt!: string;
}

export class SlotListResponseDto {
  @ApiProperty({
    description: 'List of slots',
    type: [SlotResponseDto],
  })
  data!: SlotResponseDto[];

  @ApiProperty({
    description: 'Total number of slots matching the query',
    example: 84,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages!: number;
}

/**
 * Result shape returned by slot generation.
 */
export class SlotGenerationResultDto {
  @ApiProperty({
    description: 'Number of slots actually created',
    example: 84,
  })
  generated!: number;

  @ApiProperty({
    description: 'Number of slots skipped because they already existed',
    example: 0,
  })
  skipped!: number;

  @ApiProperty({
    description: 'Non-fatal errors encountered during generation',
    type: 'array',
    items: { type: 'string' },
    example: [],
  })
  errors!: string[];
}
