/**
 * JWT Payload Interface
 *
 * Defines the structure of the JWT access token payload.
 * For regular users, includes their single tenant context.
 * For superadmins, tenantContext is null (virtual context used).
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: string;
  /** User email */
  email: string;
  /** User first name */
  firstName?: string | null;
  /** User last name */
  lastName?: string | null;
  /** Whether user is a superadmin */
  isSuperAdmin: boolean;
  /**
   * Tenant context (only for regular users)
   * For superadmins, this is null or undefined
   */
  tenantContext?: {
    /** Tenant ID */
    tenantId: string;
    /** Tenant member ID */
    tenantMemberId: string;
    /** Tenant information */
    tenant: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    /** User's permissions for this tenant */
    permissions: string[];
  };
}
