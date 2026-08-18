import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCustomersDto {
  @ApiProperty({
    description:
      'Free-text search. Matched against phone (frontend sends digits ' +
      'only, so "01711" finds "+8801711234567") and first/last name ' +
      '(case-insensitive contains). Omit to list recent customers.',
    example: '01711',
    required: false,
  })
  @IsString()
  @MinLength(1, { message: 'Search term must not be empty when provided' })
  @MaxLength(100, { message: 'Search term must be at most 100 characters' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Maximum number of customers to return (typeahead)',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 20,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(20, { message: 'Limit must be at most 20' })
  @IsOptional()
  limit?: number = 10;
}
