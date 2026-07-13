import { Throttle } from '@nestjs/throttler';
import { applyDecorators } from '@nestjs/common';

/**
 * Custom rate limiting decorators for different endpoint types
 *
 * Usage examples:
 * @ThrottleStrict() - For login endpoints (5 req/15s)
 * @ThrottleMedium() - For write operations (10 req/min)
 * @ThrottleHourly() - For creation operations (20 req/hour)
 * @ThrottlePermissive() - For general API (100 req/min)
 */

/**
 * Strict rate limiting for authentication endpoints
 * Limit: 5 requests per 15 seconds
 * Use case: Login, password reset
 */
export const ThrottleStrict = (): MethodDecorator =>
  applyDecorators(
    Throttle({
      default: {
        limit: 5,
        ttl: 15000, // 15 seconds in milliseconds
      },
    }),
  );

/**
 * Medium rate limiting for write operations
 * Limit: 10 requests per minute
 * Use case: Data updates, deletion
 */
export const ThrottleMedium = (): MethodDecorator =>
  applyDecorators(
    Throttle({
      default: {
        limit: 10,
        ttl: 60000, // 1 minute in milliseconds
      },
    }),
  );

/**
 * Hourly rate limiting for creation operations
 * Limit: 20 requests per hour
 * Use case: Account creation, invitation sending
 */
export const ThrottleHourly = (): MethodDecorator =>
  applyDecorators(
    Throttle({
      default: {
        limit: 20,
        ttl: 3600000, // 1 hour in milliseconds
      },
    }),
  );

/**
 * Permissive rate limiting for general API calls
 * Limit: 100 requests per minute
 * Use case: Read operations, general endpoints
 */
export const ThrottlePermissive = (): MethodDecorator =>
  applyDecorators(
    Throttle({
      default: {
        limit: 100,
        ttl: 60000, // 1 minute in milliseconds
      },
    }),
  );

/**
 * Custom throttle decorator with configurable options
 * @param limit Maximum number of requests
 * @param ttl Time to live in milliseconds
 */
export const ThrottleCustom = (
  limit: number,
  ttl: number,
): MethodDecorator =>
  applyDecorators(
    Throttle({
      default: {
        limit,
        ttl,
      },
    }),
  );
