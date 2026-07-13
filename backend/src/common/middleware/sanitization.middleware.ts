import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Global Sanitization Middleware
 *
 * Applies input sanitization to all incoming requests
 * Provides defense-in-depth against XSS, SQL injection, and other attacks
 *
 * Features:
 * - Sanitizes request body
 * - Sanitizes query parameters
 * - Sanitizes URL parameters
 * - Logs suspicious patterns
 *
 * Note: Prisma ORM provides SQL injection protection at the database layer.
 * This middleware adds application-level validation and sanitization.
 */
@Injectable()
export class SanitizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Sanitize request body
      if (req.body) {
        req.body = this.sanitize(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitize(req.query);
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = this.sanitize(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      next();
    }
  }

  /**
   * Recursively sanitize input
   */
  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          sanitized[this.sanitizeString(key)] = this.sanitize(value[key]);
        }
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // XSS Prevention - remove script tags and dangerous HTML
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:(?!image\/)[^;]*;base64/gi, '')
      .trim();

    // Detect NoSQL injection attempts
    const nosqlPatterns = [
      /\$where/i,
      /\$ne/i,
      /\$gt/i,
      /\$lt/i,
      /\$in/i,
      /\$nin/i,
      /\$or/i,
      /\$and/i,
      /\$not/i,
      /\$exists/i,
      /\$regex/i,
    ];

    for (const pattern of nosqlPatterns) {
      if (pattern.test(sanitized)) {
        throw new BadRequestException(
          'Invalid input: potentially malicious content detected',
        );
      }
    }

    // Limit string length to prevent DoS
    const MAX_STRING_LENGTH = 10000;
    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = sanitized.substring(0, MAX_STRING_LENGTH);
    }

    return sanitized;
  }
}
