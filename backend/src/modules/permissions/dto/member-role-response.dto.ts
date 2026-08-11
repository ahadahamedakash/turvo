import { ApiProperty } from '@nestjs/swagger';

/**
 * Role info in member role response
 */
class MemberRoleInfo {
  @ApiProperty({ description: 'Role ID' })
  id: string;

  @ApiProperty({ description: 'Role slug' })
  slug: string;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiProperty({ description: 'Role description', required: false })
  description?: string;
}

/**
 * Response DTO for a member's role assignment
 */
export class MemberRoleResponseDto {
  @ApiProperty({ description: 'User role ID' })
  id: string;

  @ApiProperty({ description: 'Tenant member ID' })
  tenantMemberId: string;

  @ApiProperty({ description: 'Assigned role' })
  role: MemberRoleInfo;

  @ApiProperty({ description: 'User ID who assigned this role' })
  assignedBy: string;

  @ApiProperty({ description: 'Assignment timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
