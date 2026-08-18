import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../../generated/prisma/client';

export class CancelRefundDto {
  @ApiProperty({
    description: 'Refund amount (cannot exceed the booking paidAmount)',
    example: 500,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Refund amount must be a number' })
  @Min(0.01, { message: 'Refund amount must be at least 0.01' })
  @Max(9999999, { message: 'Refund amount must be at most 9999999' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Refund method',
    enum: PaymentMethod,
    default: PaymentMethod.Cash,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;
}

export class CancelBookingDto {
  @ApiProperty({
    description:
      'Why the booking is cancelled. Stored on the Cancelled BookingEvent ' +
      '(the timeline is the display surface) — deliberately NOT a booking ' +
      'column.',
    example: 'Customer called to postpone',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is required' })
  @MaxLength(255, { message: 'Reason must be at most 255 characters' })
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Optional refund. Only allowed when paidAmount > 0; amount cannot ' +
      'exceed paidAmount.',
    type: CancelRefundDto,
  })
  @ValidateNested()
  @Type(() => CancelRefundDto)
  @IsOptional()
  refund?: CancelRefundDto;
}
