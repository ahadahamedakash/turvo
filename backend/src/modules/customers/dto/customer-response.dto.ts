import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Customer shaped for the booking-dialog typeahead. Deliberately minimal —
 * this module exists to serve bookings, not full customer management.
 */
export class CustomerOptionDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ description: 'First name', example: 'Karim' })
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Rahman' })
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Phone number (primary lookup key)',
    example: '+880 1711-234567',
    nullable: true,
  })
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'Email address (null for phone-only customers)',
    example: 'karim@example.com',
    nullable: true,
  })
  email?: string | null;
}

export class CustomerSearchResponseDto {
  @ApiProperty({
    description: 'Matching customers (most recently created first)',
    type: [CustomerOptionDto],
  })
  data!: CustomerOptionDto[];
}
