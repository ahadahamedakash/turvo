import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { CourtStatus } from '../../../../generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class QueryCourtDto {
  @ApiProperty({
    description: 'Filter by court status',
    enum: CourtStatus,
    required: false,
  })
  @IsEnum(CourtStatus, { message: 'Status must be a valid enum value' })
  @IsOptional()
  status?: CourtStatus;

  @ApiProperty({
    description: 'Search by name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Include deleted courts in results',
    required: false,
    default: false,
  })
  @IsBoolean({ message: 'Include deleted must be a boolean' })
  @IsOptional()
  @Type(() => Boolean)
  includeDeleted?: boolean = false;

  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 10,
  })
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @IsOptional()
  limit?: number = 10;
}
