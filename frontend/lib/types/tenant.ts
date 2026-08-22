/**
 * Tenant Types
 *
 * Type definitions for tenant/turf management
 */

/**
 * Full tenant response with all properties
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  timezone?: string | null;
  website?: string | null;
  openingHour?: string | null; // HH:mm format
  closingHour?: string | null; // HH:mm format
  bookingAmount?: number | null; // Minimum required booking amount
  status: TenantStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant status enum
 */
export type TenantStatus = "Active" | "Inactive" | "Suspended";

/**
 * Tenant member with user info and roles
 */
export interface TenantMember {
  id: string; // tenantMemberId
  tenantId: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isSuperAdmin: boolean;
  };
  roles: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  joinedAt: string;
}

/**
 * Create tenant DTO
 */
export interface CreateTenantDto {
  name: string;
  slug: string;
  description?: string;
  address?: string;
  timezone?: string;
  website?: string;
  openingHour?: string;
  closingHour?: string;
  bookingAmount?: number;
}

/**
 * Update tenant DTO (all fields optional)
 */
export interface UpdateTenantDto {
  name?: string;
  slug?: string;
  description?: string;
  address?: string;
  timezone?: string;
  website?: string;
  openingHour?: string;
  closingHour?: string;
  bookingAmount?: number;
  status?: TenantStatus;
}

/**
 * List query parameters for tenants
 */
export interface TenantListParams {
  page?: number;
  limit?: number;
  status?: TenantStatus | "All";
  search?: string;
}

/**
 * Paginated tenant list response
 */
export interface TenantListResponse {
  data: Tenant[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
