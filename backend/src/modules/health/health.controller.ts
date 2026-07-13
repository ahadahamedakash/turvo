import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeController,
} from '@nestjs/swagger';
import { HealthService, HealthCheckResult, DatabaseHealthIndicator } from './health.service';

/**
 * Health Check Controller
 *
 * Provides health check endpoints for monitoring and orchestration systems.
 * These endpoints are typically used by:
 * - Load balancers for health checks
 * - Container orchestrators (Kubernetes, Docker)
 * - Monitoring systems (Prometheus, DataDog)
 * - CI/CD pipelines for smoke testing
 *
 * Health levels:
 * 1. /health - Basic health (always returns 200 if service is running)
 * 2. /health/live - Liveness probe (is the service alive?)
 * 3. /health/ready - Readiness probe (is the service ready to serve traffic?)
 * 4. /health/detailed - Detailed health with database status
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check
   * Returns 200 if the service is running
   * Used by load balancers for simple health checks
   */
  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description:
      'Returns 200 OK if the service is running. Used by load balancers and orchestrators for simple health checks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  basicHealth() {
    return this.healthService.getBasicHealth();
  }

  /**
   * Liveness probe
   * Indicates whether the service is alive
   * If this fails, the container/orchestrator should restart the service
   */
  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Indicates whether the service is alive. If this fails, the orchestrator should restart the service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'alive' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not alive',
  })
  liveness() {
    return this.healthService.getLiveness();
  }

  /**
   * Readiness probe
   * Indicates whether the service is ready to serve traffic
   * If this fails, the orchestrator should stop routing traffic to this instance
   * but should NOT restart it
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Indicates whether the service is ready to serve traffic. If this fails, the orchestrator should stop routing traffic but not restart the service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        timestamp: { type: 'string', format: 'date-time' },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
                latency: { type: 'number', example: 5 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  readiness() {
    return this.healthService.getReadiness();
  }

  /**
   * Detailed health check
   * Returns detailed health information including database status
   * Used for monitoring and debugging
   */
  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check',
    description:
      'Returns detailed health information including database status, connection pool metrics, and version information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    type: Object,
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy',
  })
  detailed() {
    return this.healthService.getDetailedHealth();
  }

  /**
   * Database health check
   * Returns only database health status
   */
  @Get('database')
  @ApiOperation({
    summary: 'Database health check',
    description: 'Returns only the database health status and connection pool metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Database is healthy',
    type: Object,
  })
  @ApiResponse({
    status: 503,
    description: 'Database is unhealthy',
  })
  async database(): Promise<DatabaseHealthIndicator> {
    return this.healthService.getDatabaseHealth();
  }
}
