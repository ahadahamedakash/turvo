import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourtStatus } from '../../../../generated/prisma/enums';

/**
 * Slot intervals (minutes) a court can be configured with. Used at slot
 * generation time to tile each pricing rule's time range.
 */
export const ALLOWED_SLOT_INTERVALS = [30, 45, 60, 90, 120];

export class CreateCourtDto {
  @ApiProperty({
    description: 'Name of the court (must be unique within tenant)',
    example: 'Court 1 - Main Arena',
  })
  @IsString()
  @IsNotEmpty({ message: 'Court name is required' })
  name!: string;

  @ApiProperty({
    description: 'Description of the court',
    example: 'Indoor synthetic grass court with LED lighting',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Status of the court',
    enum: CourtStatus,
    example: CourtStatus.Available,
    default: CourtStatus.Available,
    required: false,
  })
  @IsEnum(CourtStatus, {
    message: 'Status must be one of: Available, Maintenance, Inactive',
  })
  @IsOptional()
  status?: CourtStatus;

  @ApiProperty({
    description:
      'Slot length in minutes used when generating slots for this court. ' +
      'Changing it only affects dates that do not have slots yet.',
    enum: ALLOWED_SLOT_INTERVALS,
    example: 60,
    default: 60,
    required: false,
  })
  @Type(() => Number)
  @IsInt({ message: 'Slot interval must be an integer (minutes)' })
  @IsIn(ALLOWED_SLOT_INTERVALS, {
    message: `Slot interval must be one of: ${ALLOWED_SLOT_INTERVALS.join(', ')} minutes`,
  })
  @IsOptional()
  slotIntervalMinutes?: number;
}
