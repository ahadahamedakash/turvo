import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'ID of the role to assign to the invited user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Invalid role ID format' })
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId!: string;

  @ApiProperty({
    description:
      'ID of the tenant (optional, will use current tenant context if not provided)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID('4', { message: 'Invalid tenant ID format' })
  @IsOptional()
  tenantId?: string;

  @ApiProperty({
    description: 'Number of days until invitation expires (default: 7)',
    example: 7,
    required: false,
    minimum: 1,
    maximum: 30,
  })
  @IsOptional()
  expiresInDays?: number;
}
