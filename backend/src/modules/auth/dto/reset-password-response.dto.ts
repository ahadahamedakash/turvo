import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password has been reset successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true,
  })
  success!: boolean;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Information message about password reset email',
    example: 'If an account exists with this email, a password reset link has been sent',
  })
  message!: string;

  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true,
  })
  success!: boolean;
}
