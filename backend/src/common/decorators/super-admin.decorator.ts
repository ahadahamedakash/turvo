import { SetMetadata } from '@nestjs/common';

/**
 * SuperAdmin decorator - Bypass super admin check for specific routes
 *
 * This is an opt-in decorator that marks a route as public from a super admin
 * perspective (not to be confused with public authentication).
 *
 * Usage:
 * @SuperAdminPublic()
 * @Get()
 * getAll() { ... }
 */
export const SuperAdminPublic = () => SetMetadata('superAdminPublic', true);
