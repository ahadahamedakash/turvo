import { ApiProperty } from '@nestjs/swagger';
import { PermissionModule } from '../../../../generated/prisma/enums';

/**
 * Response DTO for a member's aggregated permissions
 */
export class MemberPermissionsResponseDto {
  @ApiProperty({ description: 'Tenant member ID' })
  tenantMemberId: string;

  @ApiProperty({
    description: 'All permissions this member has through their roles',
    type: [Object],
    example: [
      { id: '1', slug: 'booking.create', name: 'Create Booking', module: 'Booking' },
      { id: '2', slug: 'booking.update', name: 'Update Booking', module: 'Booking' },
    ],
  })
  permissions: Array<{
    id: string;
    slug: string;
    name: string;
    description?: string;
    module: PermissionModule;
  }>;

  @ApiProperty({
    description: 'Permission slugs for easy checking',
    type: [String],
    example: ['booking.create', 'booking.update', 'booking.view'],
  })
  permissionSlugs: string[];

  @ApiProperty({
    description: 'Roles that grant these permissions',
    type: [Object],
    example: [
      { id: '1', slug: 'admin', name: 'Admin' },
    ],
  })
  roles: Array<{
    id: string;
    slug: string;
    name: string;
    description?: string;
  }>;
}
