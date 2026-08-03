/**
 * Cookie Utilities for Authentication
 *
 * Since we're using cookies for authentication (not localStorage),
 * this module provides helper functions to read/write cookies.
 */

/**
 * Get the access token from cookies
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Parse cookies to find access_token
  const cookies = document.cookie.split(';');
  const accessCookie = cookies.find(cookie =>
    cookie.trim().startsWith('access_token=')
  );

  if (!accessCookie) return null;

  return accessCookie.trim().substring('access_token='.length);
}

/**
 * Set the access token in cookies
 * This is used after login or token refresh
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;

  const maxAge = 15 * 60; // 15 minutes
  document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Clear the access token from cookies
 */
export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;

  document.cookie = 'access_token=; path=/; max-age=0';
}
