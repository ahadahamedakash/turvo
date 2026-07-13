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
 * 1. Extracts userId from JWT (already validated by JwtAuthGuard)
 * 2. Extracts tenantId from:
 *    - URL param: /:tenantId/...
 *    - Query param: ?tenantId=...
 *    - Header: X-Tenant-ID
 * 3. Validates user is a member of this tenant
 * 4. Enriches request with tenant context
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, TenantGuard)
 *
 * Request context after guard:
 * {
 *   user: { id, email, firstName, lastName },
 *   tenantContext: {
 *     tenantId: string,
 *     tenantMemberId: string,
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

    // Extract tenantId from various sources (priority order)
    let tenantId: string | undefined;

    // 1. Check URL params (e.g., /:tenantId/bookings)
    if (request.params.tenantId) {
      tenantId = Array.isArray(request.params.tenantId)
        ? request.params.tenantId[0]
        : request.params.tenantId;
    }
    // 2. Check query params (e.g., ?tenantId=uuid)
    else if (request.query.tenantId) {
      const queryValue = request.query.tenantId;
      if (Array.isArray(queryValue)) {
        tenantId =
          typeof queryValue[0] === 'string' ? queryValue[0] : undefined;
      } else if (typeof queryValue === 'string') {
        tenantId = queryValue;
      }
    }
    // 3. Check header (e.g., X-Tenant-ID: uuid)
    else if (request.headers['x-tenant-id']) {
      const headerValue = request.headers['x-tenant-id'];
      tenantId = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    }

    if (!tenantId) {
      throw new UnauthorizedException(
        'Tenant context required. Provide tenantId in URL, query, or header.',
      );
    }

    // Validate user is a member of this tenant
    const tenantMember = await this.prisma.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
          where: {
            deletedAt: null, // Only active roles
          },
        },
      },
    });

    if (!tenantMember) {
      throw new UnauthorizedException(
        'You are not a member of this organization',
      );
    }

    // Check if tenant is active
    if (tenantMember.tenant.status !== TenantStatus.Active) {
      throw new UnauthorizedException('This organization is not active');
    }

    // Extract permissions from all user roles
    const permissions: string[] = [];
    tenantMember.userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rp) => {
        permissions.push(`${rp.permission.module}.${rp.permission.slug}`);
      });
    });

    // Enrich request with tenant context
    request.tenantContext = {
      tenantId: tenantMember.tenantId,
      tenantMemberId: tenantMember.id,
      tenant: tenantMember.tenant,
      roles: tenantMember.userRoles.map((ur) => ur.role),
      permissions,
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
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest<TenantContextRequest>();
    const tenantContext = request.tenantContext;

    if (!tenantContext) {
      throw new UnauthorizedException(
        'Tenant context not found. Use TenantGuard before PermissionGuard.',
      );
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((required) =>
      tenantContext.permissions.includes(required),
    );

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
