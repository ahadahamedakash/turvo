/**
 * Roles API Client
 *
 * API methods for fetching roles
 */

import { apiClient } from '@/lib/api'
import type { Role } from '@/lib/types/role'

/**
 * Roles API endpoints
 */
export const rolesApi = {
  /**
   * Get all available roles for invitation assignment
   */
  getAll: async (): Promise<Role[]> => {
    return apiClient.get<Role[]>('/roles')
  },
}
