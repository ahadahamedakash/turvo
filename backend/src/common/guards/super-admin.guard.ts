import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Extended Request interface with user context
 */
interface RequestWithUser {
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    isActive?: boolean;
    isSuperAdmin?: boolean;
  };
}

/**
 * SuperAdminGuard - Validates super admin access
 *
 * This guard checks if the authenticated user is a super admin.
 * Super admins have elevated privileges such as creating tenants.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, SuperAdminGuard)
 *
 * Optional: Use @SuperAdmin() decorator to bypass the check (for public endpoints)
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public (bypass super admin check)
    const isPublic = this.reflector.get<boolean>(
      'superAdminPublic',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if user is a super admin
    if (!user.isSuperAdmin) {
      throw new ForbiddenException(
        'Access denied. This action requires super admin privileges.',
      );
    }

    return true;
  }
}
