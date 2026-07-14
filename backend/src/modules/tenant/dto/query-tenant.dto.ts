import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TenantStatus } from '../../../../generated/prisma/enums';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class QueryTenantDto {
  @ApiProperty({
    description: 'Filter by tenant status',
    enum: TenantStatus,
    required: false,
  })
  @IsEnum(TenantStatus, { message: 'Status must be a valid enum value' })
  @IsOptional()
  status?: TenantStatus;

  @ApiProperty({
    description: 'Search by name or slug',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

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
