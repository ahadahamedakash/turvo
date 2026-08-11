import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '@src/common/guard/jwt-auth.guard';
import { TenantGuard, RequirePermissions } from '@src/common/guard/tenant.guard';
import { CurrentTenant, CurrentMember } from '@src/common/decorators/tenant-context.decorator';
import { GetUser } from '@src/common/decorators/get-user.decorator';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RoleWithPermissionsResponseDto } from './dto/role-with-permissions.dto';
import { UpdateMemberRolesDto } from './dto/update-member-roles.dto';
import { MemberRoleResponseDto } from './dto/member-role-response.dto';
import { MemberPermissionsResponseDto } from './dto/member-permissions-response.dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Get all permissions in the system
   * Useful for role management UI
   */
  @Get()
  @ApiOperation({
    summary: 'Get all permissions',
    description:
      'Returns a list of all available permissions in the system, grouped by module. ' +
      'Useful for building role management interfaces.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all permissions',
    type: [PermissionResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAllPermissions() {
    return this.permissionsService.findAllPermissions();
  }

  /**
   * Get permissions for a specific role
   */
  @Get('roles/:roleId')
  @RequirePermissions('Users.view', 'Users.all')
  @ApiOperation({
    summary: 'Get role permissions',
    description:
      'Returns all permissions assigned to a specific role. ' +
      'Requires Users.view or Users.all permission.',
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Role with permissions',
    type: RoleWithPermissionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async getRolePermissions(@Param('roleId') roleId: string) {
    return this.permissionsService.getRolePermissions(roleId);
  }

  /**
   * Update permissions for a role
   */
  @Put('roles/:roleId')
  @RequirePermissions('Users.manage', 'Users.all')
  @ApiOperation({
    summary: 'Update role permissions',
    description:
      'Replaces all permissions assigned to a role with a new set. ' +
      'Requires Users.manage or Users.all permission. ' +
      'Only superadmin and tenant admins can modify role permissions.',
  })
  @ApiParam({
    name: 'roleId',
    description: 'Role ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateRolePermissionsDto,
    description: 'Array of permission IDs to assign to the role',
  })
  @ApiResponse({
    status: 200,
    description: 'Role permissions updated successfully',
    type: RoleWithPermissionsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid permission IDs',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() updateRolePermissionsDto: UpdateRolePermissionsDto,
    @GetUser('id') assignedByUserId: string,
  ) {
    return this.permissionsService.updateRolePermissions(
      roleId,
      updateRolePermissionsDto.permissionIds,
      assignedByUserId,
    );
  }

  /**
   * Get roles assigned to a tenant member
   */
  @Get('members/:tenantMemberId/roles')
  @RequirePermissions('Users.view', 'Users.all')
  @ApiOperation({
    summary: 'Get member roles',
    description:
      'Returns all roles assigned to a specific tenant member. ' +
      'Requires Users.view or Users.all permission.',
  })
  @ApiParam({
    name: 'tenantMemberId',
    description: 'Tenant member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of member roles',
    type: [MemberRoleResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant member not found',
  })
  async getMemberRoles(
    @Param('tenantMemberId') tenantMemberId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.getMemberRoles(tenantId, tenantMemberId);
  }

  /**
   * Update roles assigned to a tenant member
   */
  @Put('members/:tenantMemberId/roles')
  @RequirePermissions('Users.manage', 'Users.all')
  @ApiOperation({
    summary: 'Update member roles',
    description:
      'Replaces all roles assigned to a tenant member with a new set. ' +
      'Requires Users.manage or Users.all permission. ' +
      'Only superadmin and tenant admins can modify member roles. ' +
      'Users cannot remove their own admin role.',
  })
  @ApiParam({
    name: 'tenantMemberId',
    description: 'Tenant member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateMemberRolesDto,
    description: 'Array of role IDs to assign to the member',
  })
  @ApiResponse({
    status: 200,
    description: 'Member roles updated successfully',
    type: [MemberRoleResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid role IDs or attempting to remove own admin role',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions or cannot remove own admin role',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant member not found',
  })
  async updateMemberRoles(
    @Param('tenantMemberId') tenantMemberId: string,
    @Body() updateMemberRolesDto: UpdateMemberRolesDto,
    @CurrentTenant() tenantId: string,
    @GetUser('id') assignedByUserId: string,
  ) {
    return this.permissionsService.updateMemberRoles(
      tenantId,
      tenantMemberId,
      updateMemberRolesDto.roleIds,
      assignedByUserId,
    );
  }

  /**
   * Get all permissions for a tenant member
   * Aggregates permissions from all assigned roles
   */
  @Get('members/:tenantMemberId')
  @RequirePermissions('Users.view', 'Users.all')
  @ApiOperation({
    summary: 'Get member permissions',
    description:
      'Returns all permissions a tenant member has through their assigned roles. ' +
      'Requires Users.view or Users.all permission. ' +
      'Useful for audit and verification purposes.',
  })
  @ApiParam({
    name: 'tenantMemberId',
    description: 'Tenant member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Member permissions with source roles',
    type: MemberPermissionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant member not found',
  })
  async getMemberPermissions(
    @Param('tenantMemberId') tenantMemberId: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.permissionsService.getMemberPermissions(tenantId, tenantMemberId);
  }
}
