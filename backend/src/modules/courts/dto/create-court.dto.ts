import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { CourtStatus } from '../../../../generated/prisma/enums';

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
}
