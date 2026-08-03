/**
 * Tenant API Client
 *
 * API methods for tenant/turf management
 */

import { apiClient, handleApiError as ApiError } from "@/lib/api";
import type {
  Tenant,
  TenantListResponse,
  TenantListParams,
  TenantMember,
  CreateTenantDto,
  UpdateTenantDto,
} from "@/lib/types/tenant";

/**
 * Tenant API endpoints
 */
export const tenantsApi = {
  /**
   * List all tenants with pagination and filtering
   */
  list: async (params?: TenantListParams): Promise<TenantListResponse> => {
    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append("page", String(params?.page || 1));
    queryParams.append("limit", String(params?.limit || 10));
    if (params?.status && params.status !== "All") {
      queryParams.append("status", params.status);
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }

    const queryString = queryParams.toString();
    const url = `/tenants${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<TenantListResponse>(url);
  },

  /**
   * Get a single tenant by ID
   */
  get: async (id: string): Promise<Tenant> => {
    return apiClient.get<Tenant>(`/tenants/${id}`);
  },

  /**
   * Create a new tenant
   */
  create: async (data: CreateTenantDto): Promise<Tenant> => {
    return apiClient.post<Tenant>("/tenants", data);
  },

  /**
   * Update a tenant
   */
  update: async (id: string, data: UpdateTenantDto): Promise<Tenant> => {
    return apiClient.put<Tenant>(`/tenants/${id}`, data);
  },

  /**
   * Delete a tenant (soft delete)
   */
  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/tenants/${id}`);
  },

  /**
   * Get members of a tenant
   */
  getMembers: async (id: string): Promise<TenantMember[]> => {
    return apiClient.get<TenantMember[]>(`/tenants/${id}/members`);
  },
};

/**
 * Export ApiError (handleApiError) for type checking
 */
export { ApiError };
