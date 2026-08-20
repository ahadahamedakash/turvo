/**
 * Cookie Configuration Utility
 *
 * Provides centralized cookie configuration for authentication tokens.
 * Ensures consistent security settings across all auth endpoints.
 *
 * Security Features:
 * - httpOnly: Prevents JavaScript access (XSS protection)
 *   - Access token: NOT httpOnly (frontend needs to read it for Authorization header)
 *   - Refresh token: httpOnly (long-lived, must be protected)
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
interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
  domain?: string; // Optional domain for cookie scope
}

/**
 * Get base cookie options based on environment
 *
 * @param configService - NestJS ConfigService
 * @returns Base cookie options object
 */
function getBaseCookieOptions(
  configService: ConfigService,
): Pick<CookieOptions, 'secure' | 'sameSite' | 'path' | 'domain'> {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (isProduction) {
    // Production: strict settings
    return {
      secure: true,
      sameSite: 'strict',
      path: '/',
      domain: undefined,
    };
  }

  // Development: Permissive settings for cross-port cookie sharing
  // Using sameSite: 'lax' allows cookies to work across ports on localhost
  return {
    secure: false, // HTTP for localhost development
    sameSite: 'lax', // 'lax' allows top-level navigations
    path: '/',
    domain: undefined, // Let browser use default scoping
  };
}

/**
 * Set access token cookie
 *
 * NOTE: Access token is NOT httpOnly because frontend JavaScript needs to read it
 * to set the Authorization header on API requests. This is safe because:
 * - Short expiry (15 minutes) limits XSS attack window
 * - Refresh token (long-lived) IS httpOnly and stored securely in DB
 * - SameSite protection prevents CSRF attacks
 * - HTTPS with secure flag in production
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
  const maxAge = 15 * 60;
  const baseOptions = getBaseCookieOptions(configService);

  const options: CookieOptions = {
    ...baseOptions,
    httpOnly: false, // Frontend needs to read this for Authorization header
    maxAge,
  };

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, token, options);
}

/**
 * Set refresh token cookie
 *
 * NOTE: Refresh token IS httpOnly for security (long-lived token).
 * Frontend never needs to read it directly - browser sends it automatically.
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
  const maxAge = 7 * 24 * 60 * 60;
  const baseOptions = getBaseCookieOptions(configService);

  const options: CookieOptions = {
    ...baseOptions,
    httpOnly: true, // Protect long-lived token from XSS
    maxAge,
  };

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
  console.log('[CookieConfig] Setting cookies...');
  console.log('[CookieConfig] Access token length:', accessToken.length);
  console.log('[CookieConfig] Refresh token length:', refreshToken.length);

  setAccessTokenCookie(res, configService, accessToken);
  setRefreshTokenCookie(res, configService, refreshToken);

  console.log('[CookieConfig] Cookies set successfully');
}

/**
 * Clear all authentication cookies
 *
 * @param res - Express Response object
 */
export function clearAuthCookies(res: Response): void {
  // Clear cookies with same options used to set them
  // Since we don't set domain in development, we only need path
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
}
