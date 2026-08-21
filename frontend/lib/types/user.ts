/**
 * User Types
 *
 * Type definitions for user authentication and profile
 */

/**
 * User information extracted from JWT
 */
export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  /** Current tenant context from JWT (for regular users and selected tenant for superadmin) */
  currentTenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * User authentication context
 */
export interface UserContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  refresh: () => Promise<void>;
  /** Available tenants for superadmin to select from */
  availableTenants?: TenantOption[];
  /** Method to switch tenant (superadmin only) */
  selectTenant?: (tenantId: string) => Promise<void>;
  /** Loading state during tenant switch */
  isSwitchingTenant?: boolean;
}

/**
 * Tenant info from auth response
 */
export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  tenantMemberId: string;
  permissions: string[];
  role: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Tenant option for superadmin dropdown
 */
export interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: "Active" | "Inactive" | "Suspended" | string;
  createdAt?: string;
  _count?: {
    tenantMembers: number;
    courts: number;
  };
}

/**
 * Request payload for selecting a tenant
 */
export interface SelectTenantDto {
  tenantId: string;
}

/**
 * Response from tenant selection endpoint
 */
export interface SelectTenantResponse {
  accessToken: string;
  refreshToken: string;
}
