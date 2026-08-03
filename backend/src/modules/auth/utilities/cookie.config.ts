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
  domain?: string; // Optional domain for cookie scope
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

  if (isProduction) {
    // Production: strict settings
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge,
    };
  }

  // Development: Permissive settings for cross-port cookie sharing
  // Using sameSite: 'none' allows cookies to work across ports on localhost
  // Note: This is ONLY for development. Production requires HTTPS + sameSite:none + secure:true
  return {
    httpOnly: true,
    secure: false, // HTTP for localhost development
    sameSite: 'lax', // 'lax' allows top-level navigations
    path: '/',
    maxAge,
    domain: undefined, // Let browser use default scoping
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
