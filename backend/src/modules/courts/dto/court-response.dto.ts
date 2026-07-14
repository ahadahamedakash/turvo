import { ApiProperty } from '@nestjs/swagger';
import { CourtStatus } from '../../../../generated/prisma/enums';

export class CourtResponseDto {
  @ApiProperty({
    description: 'Court ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Name of the court',
    example: 'Court 1 - Main Arena',
  })
  name!: string;

  @ApiProperty({
    description: 'Description of the court',
    example: 'Indoor synthetic grass court with LED lighting',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Status of the court',
    enum: CourtStatus,
    example: CourtStatus.Available,
  })
  status!: CourtStatus;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'User ID who created the court',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'User ID who last updated the court',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  updatedBy?: string;

  @ApiProperty({
    description: 'User ID who soft deleted the court',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  deletedBy?: string;

  @ApiProperty({
    description: 'Number of active pricing rules for this court',
    example: 5,
  })
  pricingRuleCount!: number;

  @ApiProperty({
    description: 'Number of active slots for this court',
    example: 120,
  })
  slotCount!: number;

  @ApiProperty({
    description: 'Number of bookings for this court',
    example: 45,
  })
  bookingCount!: number;

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

  @ApiProperty({
    description: 'Soft delete timestamp',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  deletedAt?: string;
}

export class CourtListResponseDto {
  @ApiProperty({
    description: 'List of courts',
    type: [CourtResponseDto],
  })
  data!: CourtResponseDto[];

  @ApiProperty({
    description: 'Total number of courts',
    example: 25,
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
    example: 3,
  })
  totalPages!: number;
}
