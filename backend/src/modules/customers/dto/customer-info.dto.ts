import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Customer info submitted with a booking. Shared shape: the Bookings module
 * imports/embeds this in its create-booking DTO (Task 3).
 *
 * Resolution order in CustomersService.findOrCreate: customerId (typeahead
 * pick) → phone → email → create new row.
 */
export class CustomerInfoDto {
  @ApiPropertyOptional({
    description:
      'Existing customer ID (selected from typeahead). Takes precedence ' +
      'over the other fields when present.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({
    description: 'Customer first name',
    example: 'Karim',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(50, { message: 'First name must be at most 50 characters' })
  firstName!: string;

  @ApiProperty({
    description: 'Customer last name',
    example: 'Rahman',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  lastName!: string;

  @ApiPropertyOptional({
    description:
      'Phone number (primary lookup key — phone-first customers). ' +
      'Digits, spaces, + and - allowed.',
    example: '+880 1711-234567',
  })
  @Matches(/^[0-9+\-\s]{6,20}$/, {
    message: 'Phone must be 6-20 characters of digits, spaces, + and -',
  })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address (optional — phone-first customers)',
    example: 'karim@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsOptional()
  email?: string;
}
