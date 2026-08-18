import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BookingStatus,
} from '../../../../generated/prisma/client';
import { CustomerInfoDto } from '../../customers/dto/customer-info.dto';
import { CreatePaymentDto } from './record-payment.dto';

/**
 * Staff booking creation. The staff flow skips the 15-min Held phase
 * entirely: the service books all slots Available → Booked in ONE atomic
 * conditional update (race loser gets 409).
 */
export class CreateBookingDto {
  @ApiProperty({
    description:
      'Slots to book — must be consecutive, same court, same date. ' +
      'Duplicates are ignored. A 2h booking on 1h slots = 2 slot IDs.',
    type: [String],
    maxItems: 8,
    example: [
      '123e4567-e89b-42d3-a456-426614174000',
      '123e4567-e89b-42d3-a456-426614174001',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one slot is required' })
  @ArrayMaxSize(8, { message: 'At most 8 slots per booking' })
  @IsUUID('4', { each: true, message: 'Each slotId must be a valid UUID' })
  slotIds!: string[];

  @ApiProperty({
    description:
      'Customer info. customerId wins if given (typeahead pick); otherwise ' +
      'phone / email lookup; otherwise a new customer is created.',
    type: CustomerInfoDto,
  })
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customer!: CustomerInfoDto;

  @ApiPropertyOptional({
    description:
      'Save as "tentative" (Pending) instead of the default Confirmed — ' +
      'e.g. unconfirmed phone reservations.',
    enum: [BookingStatus.Pending, BookingStatus.Confirmed],
  })
  @IsIn([BookingStatus.Pending, BookingStatus.Confirmed], {
    message: 'Status must be Pending or Confirmed at creation',
  })
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description: 'Discount applied to the sub-total',
    example: 100,
    minimum: 0,
    maximum: 9999999,
  })
  @IsNumber({}, { message: 'Discount must be a number' })
  @Min(0, { message: 'Discount must be at least 0' })
  @Max(9999999, { message: 'Discount must be at most 9999999' })
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({
    description: 'Free-form staff note',
    maxLength: 1000,
  })
  @IsString()
  @MaxLength(1000, { message: 'Notes must be at most 1000 characters' })
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional cash collection at creation',
    type: CreatePaymentDto,
  })
  @ValidateNested()
  @Type(() => CreatePaymentDto)
  @IsOptional()
  payment?: CreatePaymentDto;
}
