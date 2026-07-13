import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

/**
 * Rate Limiting Configuration
 *
 * Production-grade rate limiting strategy:
 *
 * 1. Login Endpoint (5 requests / 15 minutes):
 *    - Prevents brute force password attacks
 *    - Allows for legitimate user mistakes
 *    - Short lockout period reduces annoyance
 *
 * 2. Invitation Creation (10 requests / hour):
 *    - Prevents spam/abuse while allowing legitimate bulk invitations
 *    - Higher limit for admin workflows
 *    - Longer window for batch operations
 *
 * 3. Invitation Acceptance (5 requests / hour):
 *    - Prevents automated account creation
 *    - Low limit since users should only accept once
 *    - Longer window to handle retries
 *
 * 4. General API (100 requests / minute):
 *    - Protects against general DDoS/abuse
 *    - Allows for legitimate high-frequency operations
 *    - Per-IP rate limiting for fair resource allocation
 *
 * NOTE: In production, consider using Redis-backed rate limiting
 * for distributed systems. This implementation uses memory storage
 * which is suitable for single-instance deployments.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const isDevelopment = config.get('NODE_ENV') !== 'production';

        return {
          // Configuration for multiple rate limiters with different strategies
          throttlers: [
            {
              // Strict rate limiter for authentication endpoints
              name: 'strict',
              ttl: 15 * 1000, // 15 seconds
              limit: 5, // 5 requests per 15 seconds
            },
            {
              // Medium rate limiter for write operations
              name: 'medium',
              ttl: 60 * 1000, // 1 minute
              limit: 10, // 10 requests per minute
            },
            {
              // Hourly rate limiter for creation operations
              name: 'hourly',
              ttl: 60 * 60 * 1000, // 1 hour
              limit: 20, // 20 requests per hour
            },
            {
              // Permissive rate limiter for general API calls
              name: 'permissive',
              ttl: 60 * 1000, // 1 minute
              limit: 100, // 100 requests per minute
            },
          ],
          // Storage configuration
          storage: isDevelopment
            ? undefined // Use memory storage in development
            : undefined, // TODO: Add Redis storage for production
          // Skip rate limiting in development (optional)
          skipIf: () =>
            isDevelopment && config.get('SKIP_RATE_LIMIT') === 'true',
        };
      },
    }),
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
