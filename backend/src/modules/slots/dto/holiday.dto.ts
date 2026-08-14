import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString as IsStringVal,
  Matches,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({
    description: 'Holiday date in YYYY-MM-DD format',
    example: '2026-03-26',
  })
  @IsStringVal()
  @IsNotEmpty({ message: 'Date is required' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date!: string;

  @ApiProperty({
    description: 'Holiday name (e.g. Independence Day)',
    example: 'Independence Day',
  })
  @IsStringVal()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  name!: string;
}

export class HolidayResponseDto {
  @ApiProperty({ description: 'Holiday ID' })
  id!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({
    description: 'Holiday date in YYYY-MM-DD format',
    example: '2026-03-26',
  })
  date!: string;

  @ApiProperty({ description: 'Holiday name', example: 'Independence Day' })
  name!: string;
}

export class DeleteHolidayParams {
  @ApiProperty({
    description: 'Holiday ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id!: string;
}
