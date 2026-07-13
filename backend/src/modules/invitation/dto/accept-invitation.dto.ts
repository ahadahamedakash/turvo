import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsOptional, ValidateIf } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token from email link',
    example: 'abc123xyz456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;

  @ApiProperty({
    description: 'User password for new account (required only for new users)',
    example: 'SecurePass123!',
    minLength: 8,
    required: false,
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.isNewUser !== false) // Only required for new users
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @ApiProperty({
    description: 'User first name (required only for new users)',
    example: 'John',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: 'User last name (required only for new users)',
    example: 'Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'User phone number (optional)',
    example: '01712345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'User gender',
    enum: ['Male', 'Female', 'Other'],
    required: false,
  })
  @IsOptional()
  gender?: 'Male' | 'Female' | 'Other';
}

export class InvitationTokenDto {
  @ApiProperty({
    description: 'Invitation token from email link',
    example: 'abc123xyz456',
  })
  @IsString()
  @IsNotEmpty({ message: 'Token is required' })
  token!: string;
}
