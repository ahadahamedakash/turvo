import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatus } from '../../../../generated/prisma/client';

export type PaymentStatusFilter = 'Paid' | 'Partial' | 'Unpaid';

export class QueryBookingsDto {
  @ApiPropertyOptional({
    description:
      'Range start (inclusive) against the booking date. YYYY-MM-DD.',
    example: '2026-08-17',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom must be in YYYY-MM-DD format',
  })
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Range end (inclusive). YYYY-MM-DD.',
    example: '2026-08-24',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo must be in YYYY-MM-DD format',
  })
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by court', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  courtId?: string;

  @ApiPropertyOptional({
    description: 'Filter by booking status',
    enum: BookingStatus,
  })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;

  @ApiPropertyOptional({
    description:
      'Derived payment status. Paid = paidAmount ≥ total; Partial = 0 < ' +
      'paidAmount < total; Unpaid = paidAmount 0. Translated server-side ' +
      'into column-vs-column comparisons via Prisma field references.',
    enum: ['Paid', 'Partial', 'Unpaid'],
  })
  @IsIn(['Paid', 'Partial', 'Unpaid'], {
    message: 'paymentStatus must be Paid, Partial or Unpaid',
  })
  @IsOptional()
  paymentStatus?: PaymentStatusFilter;

  @ApiPropertyOptional({
    description: 'Free text — matches customer name or phone (contains)',
    example: 'Karim',
  })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  @IsOptional()
  limit?: number = 20;
}
