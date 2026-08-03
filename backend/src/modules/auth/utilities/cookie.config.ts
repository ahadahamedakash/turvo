/**
 * Cookie Configuration Utility
 *
 * Provides centralized cookie configuration for authentication tokens.
 * Ensures consistent security settings across all auth endpoints.
 *
 * Security Features:
 * - httpOnly: Prevents JavaScript access (XSS protection)
 * - secure: Ensures cookies are only sent over HTTPS
 * - sameSite: Prevents CSRF attacks
 * - path: Limits cookie scope to specific paths
 */

import { type Response } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Cookie names
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Cookie options interface
 */
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
}

/**
 * Get cookie options based on environment
 *
 * @param configService - NestJS ConfigService
 * @param maxAge - Cookie max age in seconds
 * @returns Cookie options object
 */
export function getCookieOptions(
  configService: ConfigService,
  maxAge: number,
): CookieOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    httpOnly: true, // Prevent JavaScript access (XSS protection)
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/', // Available on all paths
    maxAge, // Expiry in seconds
  };
}

/**
 * Set access token cookie
 *
 * @param res - Express Response object
 * @param configService - NestJS ConfigService
 * @param token - Access token JWT
 */
export function setAccessTokenCookie(
  res: Response,
  configService: ConfigService,
  token: string,
): void {
  // Access token expires in 15 minutes (900 seconds)
  const options = getCookieOptions(configService, 15 * 60);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, token, options);
}

/**
 * Set refresh token cookie
 *
 * @param res - Express Response object
 * @param configService - NestJS ConfigService
 * @param token - Refresh token JWT
 */
export function setRefreshTokenCookie(
  res: Response,
  configService: ConfigService,
  token: string,
): void {
  // Refresh token expires in 7 days (604800 seconds)
  const options = getCookieOptions(configService, 7 * 24 * 60 * 60);

  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, options);
}

/**
 * Set both access and refresh token cookies
 *
 * @param res - Express Response object
 * @param configService - NestJS ConfigService
 * @param accessToken - Access token JWT
 * @param refreshToken - Refresh token JWT
 */
export function setAuthCookies(
  res: Response,
  configService: ConfigService,
  accessToken: string,
  refreshToken: string,
): void {
  setAccessTokenCookie(res, configService, accessToken);
  setRefreshTokenCookie(res, configService, refreshToken);
}

/**
 * Clear all authentication cookies
 *
 * @param res - Express Response object
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
}
