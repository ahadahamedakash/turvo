import { ApiProperty } from '@nestjs/swagger';
import { PermissionModule } from '../../../../generated/prisma/enums';

/**
 * Response DTO for a single permission
 */
export class PermissionResponseDto {
  @ApiProperty({
    description: 'Unique permission identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Module this permission belongs to',
    enum: PermissionModule,
    example: PermissionModule.Booking,
  })
  module: PermissionModule;

  @ApiProperty({
    description: 'Unique slug for the permission',
    example: 'booking.create',
  })
  slug: string;

  @ApiProperty({
    description: 'Human-readable permission name',
    example: 'Create Booking',
  })
  name: string;

  @ApiProperty({
    description: 'Detailed description of what this permission allows',
    required: false,
    example: 'Allows creating new bookings for customers',
  })
  description?: string;

  @ApiProperty({
    description: 'Timestamp when permission was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when permission was last updated',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}
