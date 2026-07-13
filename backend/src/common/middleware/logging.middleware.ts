import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request Logging Middleware
 *
 * Production-grade logging strategy:
 *
 * 1. Request Correlation: Each request gets a unique ID for distributed tracing
 * 2. Performance Metrics: Logs request duration for performance monitoring
 * 3. Sanitized Output: Sensitive data (passwords, tokens) are redacted
 * 4. Structured Format: JSON logs for easy parsing by log aggregation tools
 * 5. Response Status: Categorizes logs by response status (2xx, 4xx, 5xx)
 *
 * Usage:
 * - Apply globally in AppModule or per-module
 * - Logs include: timestamp, request ID, method, path, status, duration, IP
 * - Redacts: Authorization headers, password fields, token params
 *
 * TODO for production:
 * - Add integration with log aggregation service (Datadog, ELK, etc.)
 * - Add sampling for high-traffic endpoints
 * - Add request body logging with size limits
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    // Generate unique request ID for correlation
    const requestId = uuidv4();
    const startTime = Date.now();

    // Add request ID to request headers for downstream services
    req.headers['x-request-id'] = requestId;

    // Extract client info
    const clientIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Log incoming request
    this.logger.log({
      message: 'Incoming request',
      requestId,
      method: req.method,
      path: req.path,
      query: this.sanitizeQuery(req.query),
      ip: clientIp,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // Capture response
    const originalSend = res.send;
    res.send = (data) => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Determine log level based on status code
      const logLevel = this.getLogLevel(statusCode);
      const logData = {
        message: 'Request completed',
        requestId,
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
        ip: clientIp,
        timestamp: new Date().toISOString(),
      };

      // Log at appropriate level
      if (logLevel === 'error') {
        this.logger.error(logData);
      } else if (logLevel === 'warn') {
        this.logger.warn(logData);
      } else {
        this.logger.log(logData);
      }

      // Call original send
      return originalSend.call(res, data);
    };

    next();
  }

  /**
   * Get client IP address from request, accounting for proxies
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize query parameters to remove sensitive data
   */
  private sanitizeQuery(query: any): Record<string, any> {
    if (!query || typeof query !== 'object') {
      return {};
    }

    const sanitized = { ...query };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Determine log level based on HTTP status code
   */
  private getLogLevel(statusCode: number): string {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (statusCode >= 300) return 'log';
    if (statusCode >= 200) return 'log';
    return 'log';
  }
}

/**
 * Request logging configuration
 *
 * Configure which routes to log and at what level
 */
export interface LoggingConfig {
  /**
   * Paths to exclude from logging
   * @default ['/health', '/metrics']
   */
  excludePaths?: string[];

  /**
   * Whether to log request bodies
   * @default false (enable for debugging only)
   */
  logBody?: boolean;

  /**
   * Maximum request body size to log (in bytes)
   * @default 1024 (1KB)
   */
  maxBodySize?: number;
}

/**
 * Create logging middleware with custom configuration
 */
export const createLoggingMiddleware = (config: LoggingConfig = {}) => {
  const {
    excludePaths = ['/health', '/metrics'],
    logBody = false,
    maxBodySize = 1024,
  } = config;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for excluded paths
    if (excludePaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Use the main logging middleware
    const middleware = new LoggingMiddleware();
    middleware.use(req, res, next);
  };
};
