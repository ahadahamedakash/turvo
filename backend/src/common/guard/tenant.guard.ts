/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TenantStatus } from '../../../generated/prisma/enums';

/**
 * Extended Request interface with tenant context
 */
interface TenantContextRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    isActive?: boolean;
    isSuperAdmin?: boolean;
    tenantContext?: {
      tenantId: string;
      tenantMemberId: string;
      tenant: {
        id: string;
        name: string;
        slug: string;
        status: string;
      };
      permissions: string[];
    };
  };
  tenantContext?: {
    tenantId: string;
    tenantMemberId: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    roles: any[];
    permissions: string[];
  };
}

/**
 * TenantGuard - Validates tenant membership for authenticated users
 *
 * This guard implements the production-grade multi-tenant authentication pattern:
 *
 * 1. Reads userId from request.user (already validated by JwtAuthGuard)
 * 2. Reads tenant context from request.user.tenantContext (from JWT payload)
 * 3. For superadmins: creates virtual tenant context with all permissions
 * 4. For regular users: validates tenant context exists and attaches to request
 *
 * NO DB QUERIES: All tenant context comes from JWT (set by JwtStrategy)
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard)
 *
 * Request context after guard:
 * {
 *   user: { id, email, firstName, lastName, tenantContext: {...} },
 *   tenantContext: {
 *     tenantId: string,
 *     tenantMemberId: string,
 *     tenant: {...},
 *     roles: Role[],
 *     permissions: Permission[]
 *   }
 * }
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantContextRequest>();
    const user = request.user; // Set by JwtAuthGuard

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Superadmin bypass - superadmins can access any tenant
    if (user.isSuperAdmin) {
      // If superadmin has selected a tenant (tenantContext in JWT), use it
      if (user.tenantContext) {
        request.tenantContext = {
          tenantId: user.tenantContext.tenantId,
          tenantMemberId: user.tenantContext.tenantMemberId,
          tenant: user.tenantContext.tenant,
          roles: [],
          permissions: user.tenantContext.permissions, // ['*.all']
        };
      } else {
        // Virtual context for tenant list operations (no tenant selected)
        request.tenantContext = {
          tenantId: 'SUPERADMIN', // Virtual tenant ID
          tenantMemberId: 'SUPERADMIN',
          tenant: {
            id: 'SUPERADMIN',
            name: 'Super Admin',
            slug: 'superadmin',
            status: 'Active',
          },
          roles: [], // Not applicable for superadmin
          permissions: ['*.all'], // Superadmin has all permissions
        };
      }
      return true;
    }

    // Regular user: use tenant context from JWT
    if (!user.tenantContext) {
      throw new UnauthorizedException(
        'No tenant context in JWT. Please re-login.',
      );
    }

    // Simply attach tenant context from JWT to request
    request.tenantContext = {
      tenantId: user.tenantContext.tenantId,
      tenantMemberId: user.tenantContext.tenantMemberId,
      tenant: user.tenantContext.tenant,
      roles: [], // Not populated in JWT, would need DB query if needed
      permissions: user.tenantContext.permissions, // From JWT
    };

    return true;
  }
}

/**
 * PermissionGuard - Validates specific permissions
 *
 * Used after TenantGuard to check if user has specific permission
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
 * @RequirePermissions('Booking.create')
 * @Post()
 * create() { ... }
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantContextRequest>();

    // Superadmin bypass - superadmins have all permissions
    if (request.user?.isSuperAdmin) {
      return true;
    }

    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    console.log(requiredPermissions);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException(
        'Tenant context not found. Use TenantGuard before PermissionGuard.',
      );
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((required) => {
      // Direct match
      if (tenantContext.permissions.includes(required)) {
        return true;
      }

      // Wildcard: *.all matches any operation in that module
      const [module, operation] = required.split('.');

      console.log('tenantContext: ', tenantContext);

      console.log('module: ', module);
      console.log('operation: ', operation);

      const wildcardPermission = `${module.toLowerCase()}.all`;
      console.log('wildcardPermission: ', wildcardPermission);
      if (tenantContext.permissions.includes(wildcardPermission)) {
        return true;
      }

      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

/**
 * RequirePermissions decorator - Use with PermissionGuard
 * Sets metadata for permission validation
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
 * @RequirePermissions('Booking.create', 'Booking.update')
 * @Post()
 * create() { ... }
 */
export const RequirePermissions =
  (...permissions: string[]) =>
  (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('permissions', permissions, descriptor.value);
    return descriptor;
  };
