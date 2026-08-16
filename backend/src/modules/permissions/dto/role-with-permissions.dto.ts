import { ApiProperty } from '@nestjs/swagger';

/**
 * Nested permission info within role response
 */
class RolePermissionInfo {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ description: 'Permission slug' })
  slug: string;

  @ApiProperty({ description: 'Permission name' })
  name: string;

  @ApiProperty({ description: 'Permission module', required: false })
  module?: string;
}

/**
 * Response DTO for a role with its permissions
 */
export class RoleWithPermissionsResponseDto {
  @ApiProperty({ description: 'Role ID' })
  id: string;

  @ApiProperty({ description: 'Unique role slug' })
  slug: string;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiProperty({ description: 'Role description', required: false })
  description?: string;

  @ApiProperty({
    description: 'Permissions assigned to this role',
    type: [RolePermissionInfo],
  })
  permissions: RolePermissionInfo[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
