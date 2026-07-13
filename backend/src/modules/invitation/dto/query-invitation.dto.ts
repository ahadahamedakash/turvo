import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvitationStatus } from '../../../../generated/prisma/enums';

export class QueryInvitationDto {
  @ApiProperty({
    description: 'Filter by invitation status',
    enum: InvitationStatus,
    required: false,
  })
  @IsEnum(InvitationStatus, { message: 'Invalid invitation status' })
  @IsOptional()
  status?: InvitationStatus;

  @ApiProperty({
    description: 'Filter by email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  limit?: number;
}
