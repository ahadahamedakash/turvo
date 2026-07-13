import { ApiProperty } from '@nestjs/swagger';
import { InvitationStatus } from '../../../../generated/prisma/enums';

export class InvitationResponseDto {
  @ApiProperty({
    description: 'Unique invitation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address of the invited person',
    example: 'john.doe@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId!: string;

  @ApiProperty({
    description: 'Role ID to assign upon acceptance',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  roleId!: string;

  @ApiProperty({
    description: 'Unique token for invitation acceptance',
    example: 'abc123xyz456',
  })
  token!: string;

  @ApiProperty({
    description: 'Current invitation status',
    enum: InvitationStatus,
    example: InvitationStatus.Pending,
  })
  status!: InvitationStatus;

  @ApiProperty({
    description: 'Invitation expiration date',
    example: '2024-12-31T23:59:59.999Z',
  })
  expiresAt!: Date;

  @ApiProperty({
    description: 'Date when invitation was revoked',
    example: '2024-12-15T10:30:00.000Z',
    required: false,
  })
  revokedAt?: Date;

  @ApiProperty({
    description: 'Date when invitation was accepted',
    example: '2024-12-15T10:30:00.000Z',
    required: false,
  })
  acceptedAt?: Date;

  @ApiProperty({
    description: 'User ID who accepted the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  acceptedBy?: string;

  @ApiProperty({
    description: 'Tenant member ID who created the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  invitedBy!: string;

  @ApiProperty({
    description: 'Tenant member ID who revoked the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  revokedBy?: string;

  @ApiProperty({
    description: 'Invitation creation date',
    example: '2024-12-01T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Invitation last update date',
    example: '2024-12-01T10:00:00.000Z',
  })
  updatedAt!: Date;

  // Nested objects (optional)
  @ApiProperty({
    description: 'Tenant information',
    required: false,
  })
  tenant?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Role information',
    required: false,
  })
  role?: {
    id: string;
    name: string;
    slug: string;
  };
}
