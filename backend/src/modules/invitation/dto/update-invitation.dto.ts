import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { InvitationStatus } from '../../../../generated/prisma/enums';

export class UpdateInvitationDto {
  @ApiProperty({
    description: 'New status for the invitation',
    enum: InvitationStatus,
    example: InvitationStatus.Revoked,
    required: false,
  })
  @IsEnum(InvitationStatus, { message: 'Invalid invitation status' })
  @IsOptional()
  status?: InvitationStatus;
}
