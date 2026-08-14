import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString as IsStringVal,
  Matches,
} from 'class-validator';

export class GenerateSlotsDto {
  @ApiProperty({
    description:
      'Court ID to generate slots for. Omit to generate for ALL courts of the tenant.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  courtId?: string;

  @ApiProperty({
    description: 'Start date of the range (inclusive) in YYYY-MM-DD format',
    example: '2025-08-15',
  })
  @IsStringVal()
  @IsNotEmpty({ message: 'Start date is required' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Start date must be in YYYY-MM-DD format',
  })
  startDate!: string;

  @ApiProperty({
    description: 'End date of the range (inclusive) in YYYY-MM-DD format',
    example: '2025-08-22',
  })
  @IsStringVal()
  @IsNotEmpty({ message: 'End date is required' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'End date must be in YYYY-MM-DD format',
  })
  endDate!: string;
}
