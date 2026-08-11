/**
 * Permission Types
 *
 * Type definitions for permissions and role management
 */

/**
 * Permission module enum
 */
export type PermissionModule = "Booking" | "Customer" | "Court" | "Payment" | "Reports" | "Users";

/**
 * Permission entity
 */
export interface Permission {
  id: string;
  module: PermissionModule;
  slug: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Role with permissions
 */
export interface RoleWithPermissions {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Role info (simplified)
 */
export interface RoleInfo {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

/**
 * User role assignment
 */
export interface UserRoleAssignment {
  id: string;
  tenantMemberId: string;
  roleId: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
  role: RoleInfo;
}

/**
 * Member permissions response
 */
export interface MemberPermissions {
  tenantMemberId: string;
  permissions: Permission[];
  permissionSlugs: string[];
  roles: RoleInfo[];
}

/**
 * Update role permissions DTO
 */
export interface UpdateRolePermissionsDto {
  permissionIds: string[];
}

/**
 * Update member roles DTO
 */
export interface UpdateMemberRolesDto {
  roleIds: string[];
}
