/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Tenant Context Decorator
 * Extracts tenant context set by TenantGuard
 *
 * Usage:
 * @TenantContext() tenantContext: TenantContext
 * @TenantContext('tenantId') tenantId: string
 * @TenantContext('tenantMemberId') tenantMemberId: string
 */
export const TenantContext = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request?.tenantContext;

    return data ? tenantContext?.[data] : tenantContext;
  },
);

/**
 * Current Tenant Decorator
 * Extracts just the tenant ID
 *
 * Usage:
 * @CurrentTenant() tenantId: string
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request?.tenantContext?.tenantId;
  },
);

/**
 * Current Tenant Member Decorator
 * Extracts the tenant member ID (for audit trails)
 *
 * Usage:
 * @CurrentMember() memberId: string
 */
export const CurrentMember = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request?.tenantContext?.tenantMemberId;
  },
);

/**
 * Tenant Decorator
 * Extracts the full tenant object
 *
 * Usage:
 * @Tenant() tenant: { id, name, slug, status }
 */
export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request?.tenantContext?.tenant;
  },
);

/**
 * Roles Decorator
 * Extracts user's roles in current tenant
 *
 * Usage:
 * @Roles() roles: Role[]
 */
export const Roles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request?.tenantContext?.roles || [];
  },
);

/**
 * Permissions Decorator
 * Extracts user's permissions in current tenant
 *
 * Usage:
 * @Permissions() permissions: string[]
 */
export const Permissions = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request?.tenantContext?.permissions || [];
  },
);
