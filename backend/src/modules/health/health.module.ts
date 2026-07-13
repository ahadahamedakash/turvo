import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaModule } from '@src/prisma/prisma.module';

/**
 * Health Module
 *
 * Provides health check endpoints for monitoring and orchestration.
 *
 * Endpoints:
 * - GET /health - Basic health check
 * - GET /health/live - Liveness probe
 * - GET /health/ready - Readiness probe
 * - GET /health/detailed - Detailed health information
 * - GET /health/database - Database health only
 *
 * Usage in Kubernetes:
 * ```yaml
 * livenessProbe:
 *   httpGet:
 *     path: /health/live
 *     port: 3001
 *   initialDelaySeconds: 30
 *   periodSeconds: 10
 *
 * readinessProbe:
 *   httpGet:
 *     path: /health/ready
 *     port: 3001
 *   initialDelaySeconds: 5
 *   periodSeconds: 5
 * ```
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
