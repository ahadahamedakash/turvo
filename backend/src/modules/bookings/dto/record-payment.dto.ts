import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PaymentMethod,
  PaymentType,
} from '../../../../generated/prisma/client';

/**
 * Cash payment recorded by staff. Reused as `CreateBookingDto.payment`
 * (collect cash at creation) and as the body of POST /bookings/:id/payments
 * (record payment later).
 *
 * NOTE: Card / MobileBanking are schema-ready but version-2 — cash is the
 * only method staff can actually settle today.
 */
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Amount collected (BDT)',
    example: 500,
    minimum: 0.01,
    maximum: 9999999,
  })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @Max(9999999, { message: 'Amount must be at most 9999999' })
  amount!: number;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    default: PaymentMethod.Cash,
  })
  @IsEnum(PaymentMethod, {
    message: 'Method must be one of: Cash, Card, MobileBanking',
  })
  @IsOptional()
  method?: PaymentMethod = PaymentMethod.Cash;

  @ApiPropertyOptional({
    description: 'Optional staff reference (receipt number, note)',
    example: 'RCP-0042',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100, { message: 'Reference number must be at most 100 characters' })
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description:
      'Payment classification. Inferred when omitted: full remaining due ' +
      '→ Due, partial → Advance.',
    enum: PaymentType,
    enumName: 'PaymentType',
  })
  @IsIn([PaymentType.Advance, PaymentType.Due], {
    message: 'Type must be Advance or Due (refunds use the cancel flow)',
  })
  @IsOptional()
  type?: PaymentType;
}
