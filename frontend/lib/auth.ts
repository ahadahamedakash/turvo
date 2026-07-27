/**
 * Cookie-based authentication token storage
 *
 * For MVP: Using client-readable cookies
 * TODO: Upgrade to httpOnly cookies with Next.js middleware/API routes for enhanced security
 */

const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

const COOKIE_OPTIONS = {
  // Use secure cookies in production
  secure: process.env.NODE_ENV === 'production',
  // Prevent CSRF - can be 'strict', 'lax', or 'none'
  sameSite: 'lax' as const,
  // Cookie path
  path: '/',
};

/**
 * Set a cookie with the given name, value, and max age (in seconds)
 */
function setCookie(name: string, value: string, maxAge: number): void {
  const secureFlag = COOKIE_OPTIONS.secure ? '; Secure' : '';
  const sameSiteFlag = `; SameSite=${COOKIE_OPTIONS.sameSite}`;

  document.cookie = `${name}=${value}; Path=${COOKIE_OPTIONS.path}; Max-Age=${maxAge}${sameSiteFlag}${secureFlag}`;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift();
  }
  return undefined;
}

/**
 * Delete a cookie by name
 */
function deleteCookie(name: string): void {
  document.cookie = `${name}=; Path=${COOKIE_OPTIONS.path}; Max-Age=0${
    COOKIE_OPTIONS.secure ? '; Secure' : ''
  }; SameSite=${COOKIE_OPTIONS.sameSite}`;
}

/**
 * Store authentication tokens in cookies
 * @param accessToken - JWT access token (15 min expiry)
 * @param refreshToken - JWT refresh token (7 day expiry)
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  // Access token: 15 minutes (15 * 60 = 900 seconds)
  setCookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, 15 * 60);

  // Refresh token: 7 days (7 * 24 * 60 * 60 = 604800 seconds)
  setCookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, 7 * 24 * 60 * 60);
}

/**
 * Get the current access token from cookies
 */
export function getAccessToken(): string | undefined {
  return getCookie(COOKIE_NAMES.ACCESS_TOKEN);
}

/**
 * Get the current refresh token from cookies
 */
export function getRefreshToken(): string | undefined {
  return getCookie(COOKIE_NAMES.REFRESH_TOKEN);
}

/**
 * Clear all authentication cookies
 */
export function clearTokens(): void {
  deleteCookie(COOKIE_NAMES.ACCESS_TOKEN);
  deleteCookie(COOKIE_NAMES.REFRESH_TOKEN);
}

/**
 * Check if user is authenticated (has valid access token)
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
