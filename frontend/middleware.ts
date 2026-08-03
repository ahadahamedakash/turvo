/**
 * Next.js Middleware for Route Protection
 *
 * Features:
 * - Protects authenticated routes
 * - Redirects unauthenticated users to login
 * - Redirects authenticated users away from auth pages
 * - Validates access tokens before allowing access
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Paths that require authentication
 */
const PROTECTED_PATHS = [
  "/dashboard",
  "/superadmin",
  "/admin",
  "/profile",
  "/settings",
];

/**
 * Paths that are for authentication only (redirect if authenticated)
 */
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * JWT verification helper (client-side compatible)
 * Does NOT verify signature - just checks format and expiry
 * For production, consider verifying signature with JWT_SECRET
 */
function isTokenValid(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    const decoded = atob(payload);
    const data = JSON.parse(decoded);

    // Check expiration
    if (!data.exp) {
      return false;
    }

    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = data.exp * 1000;
    const now = Date.now();

    // Add 30 second buffer to account for clock skew
    return now < expirationTime - 30000;
  } catch {
    return false;
  }
}

/**
 * Get access token from cookie
 */
function getAccessTokenFromCookie(request: NextRequest): string | null {
  const accessToken = request.cookies.get("access_token")?.value;
  return accessToken || null;
}

/**
 * Check if path is protected
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Check if path is auth-only
 */
function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Middleware main function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get access token from cookie
  const accessToken = getAccessTokenFromCookie(request);
  const isAuthenticated = accessToken && isTokenValid(accessToken);

  // Handle protected routes
  if (isProtectedPath(pathname)) {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Handle auth routes (redirect if already authenticated)
  if (isAuthPath(pathname)) {
    if (isAuthenticated) {
      // Redirect to dashboard or return URL
      const returnUrl = request.nextUrl.searchParams.get("redirect");
      const url = request.nextUrl.clone();
      url.pathname = returnUrl || "/dashboard/superadmin";
      url.searchParams.delete("redirect");
      return NextResponse.redirect(url);
    }
  }

  // Allow request to proceed
  return NextResponse.next();
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
