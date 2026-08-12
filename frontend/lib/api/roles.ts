/**
 * Roles API Client
 *
 * API methods for role management
 */

import { apiClient } from '@/lib/api';
import type { Role } from '@/lib/types/role';
import type { CreateRoleInput, UpdateRoleInput } from '@/lib/schemas/role';

/**
 * Roles API endpoints
 */
export const rolesApi = {
  /**
   * Get all available roles for invitation assignment
   */
  getAll: async (): Promise<Role[]> => {
    return apiClient.get<Role[]>('/roles');
  },

  /**
   * Get a single role by ID
   */
  get: async (id: string): Promise<Role> => {
    return apiClient.get<Role>(`/roles/${id}`);
  },

  /**
   * Create a new role
   */
  create: async (data: CreateRoleInput): Promise<Role> => {
    return apiClient.post<Role>('/roles', data);
  },

  /**
   * Update an existing role
   */
  update: async (id: string, data: UpdateRoleInput): Promise<Role> => {
    return apiClient.put<Role>(`/roles/${id}`, data);
  },

  /**
   * Delete a role
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/roles/${id}`);
  },
};
