/**
 * Permissions API Client
 *
 * API methods for permissions and role management
 */

import { apiClient } from "@/lib/api";
import type {
  Permission,
  RoleWithPermissions,
  UserRoleAssignment,
  MemberPermissions,
  UpdateRolePermissionsDto,
  UpdateMemberRolesDto,
} from "@/lib/types/permission";

/**
 * Permissions API endpoints
 */
export const permissionsApi = {
  /**
   * Get all permissions in the system
   */
  getAll: async (): Promise<Permission[]> => {
    return apiClient.get<Permission[]>("/permissions");
  },

  /**
   * Get permissions for a specific role
   */
  getRolePermissions: async (roleId: string): Promise<RoleWithPermissions> => {
    return apiClient.get<RoleWithPermissions>(`/permissions/roles/${roleId}`);
  },

  /**
   * Update permissions for a role
   */
  updateRolePermissions: async (
    roleId: string,
    data: UpdateRolePermissionsDto,
  ): Promise<RoleWithPermissions> => {
    return apiClient.put<RoleWithPermissions>(
      `/permissions/roles/${roleId}`,
      data,
    );
  },

  /**
   * Get roles assigned to a tenant member
   */
  getMemberRoles: async (tenantMemberId: string): Promise<UserRoleAssignment[]> => {
    return apiClient.get<UserRoleAssignment[]>(
      `/permissions/members/${tenantMemberId}/roles`,
    );
  },

  /**
   * Update roles assigned to a tenant member
   */
  updateMemberRoles: async (
    tenantMemberId: string,
    data: UpdateMemberRolesDto,
  ): Promise<UserRoleAssignment[]> => {
    return apiClient.put<UserRoleAssignment[]>(
      `/permissions/members/${tenantMemberId}/roles`,
      data,
    );
  },

  /**
   * Get all permissions for a tenant member
   */
  getMemberPermissions: async (tenantMemberId: string): Promise<MemberPermissions> => {
    return apiClient.get<MemberPermissions>(
      `/permissions/members/${tenantMemberId}`,
    );
  },
};
