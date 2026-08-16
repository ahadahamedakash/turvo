import { ApiProperty } from '@nestjs/swagger';

export class TenantInfoDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Sports Complex',
  })
  name!: string;

  @ApiProperty({
    description: 'Tenant slug',
    example: 'acme-sports',
  })
  slug!: string;

  @ApiProperty({
    description: 'Tenant member ID for this user in this tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantMemberId!: string;

  @ApiProperty({
    description: 'List of permissions for this user in this tenant',
    example: ['Booking.create', 'Booking.view'],
    type: [String],
  })
  permissions!: string[];

  @ApiProperty({
    description: "User's role in this tenant",
  })
  role!: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export class AuthResponseDto {
  @ApiProperty({
    description:
      'Access token for authentication (15 min expiry). Also set as httpOnly cookie for enhanced security.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description:
      'Refresh token for authentication (7 day expiry). Also set as httpOnly cookie for enhanced security.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Authenticated user information',
    example: {
      id: 'user-1256456',
      email: 'user@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  user!: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };

  @ApiProperty({
    description:
      'Customer ID linked to this user (if registration matched existing customer record). Contains previous booking history.',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  customerId?: string;

  @ApiProperty({
    description:
      'List of tenants the user has access to. Frontend uses this for tenant selection.',
    type: [TenantInfoDto],
    required: false,
  })
  tenants?: TenantInfoDto[];
}
