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
