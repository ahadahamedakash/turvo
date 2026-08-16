import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Permission modules enum
 */
export enum PermissionModule {
  Booking = 'Booking',
  Customer = 'Customer',
  Court = 'Court',
  Payment = 'Payment',
  Reports = 'Reports',
  Users = 'Users',
}

/**
 * DTO for creating a new permission
 */
export class CreatePermissionDto {
  @ApiProperty({
    description: 'Module this permission belongs to',
    enum: PermissionModule,
    example: PermissionModule.Booking,
  })
  @IsIn(Object.values(PermissionModule), {
    message: `Module must be one of: ${Object.values(PermissionModule).join(', ')}`,
  })
  @IsNotEmpty()
  module!: PermissionModule;

  @ApiProperty({
    description: 'Slug identifier (e.g., "booking.create")',
    example: 'booking.create',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z]+\.[a-z]+$/, {
    message: 'Slug must be in format: module.action (e.g., "booking.create")',
  })
  @MaxLength(100)
  slug!: string;

  @ApiProperty({
    description: 'Human-readable permission name',
    example: 'Create Booking',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Description of what this permission allows',
    example: 'Allows creating new bookings',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
