import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';
import { TenantStatus } from '../../../../generated/prisma/enums';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiProperty({
    description: 'Status of the tenant',
    enum: TenantStatus,
    example: TenantStatus.Active,
    required: false,
  })
  @IsEnum(TenantStatus, {
    message: 'Status must be one of: Active, Inactive, Suspended',
  })
  @IsOptional()
  status?: TenantStatus;
}
