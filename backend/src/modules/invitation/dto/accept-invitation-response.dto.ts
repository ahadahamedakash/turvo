import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationResponseDto {
  @ApiProperty({
    description: 'User information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({
    description: 'Tenant member information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    },
  })
  tenantMember!: {
    id: string;
    tenantId: string;
  };

  @ApiProperty({
    description: 'Access token for authentication (expires in 15 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens (expires in 7 days)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}
