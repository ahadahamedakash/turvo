import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAMES = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
} as const;

const PROTECTED_PATHS = [
  "/dashboard",
  "/superadmin",
  "/admin",
  "/profile",
  "/settings",
];

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function base64UrlDecode(base64Url: string): string {
  // Convert Base64Url to Base64
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  // Pad with '=' if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  // Decode using Buffer (Edge Runtime compatible)
  return Buffer.from(base64, "base64").toString("utf-8");
}

function isTokenValid(token: string): boolean {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log("[Middleware] Invalid JWT format");
      return false;
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    const decoded = base64UrlDecode(payload);
    const data = JSON.parse(decoded);

    // Check expiration
    if (!data.exp) {
      console.log("[Middleware] Token missing exp claim");
      return false;
    }

    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = data.exp * 1000;
    const now = Date.now();

    // Add 30 second grace period AFTER expiration to account for clock skew
    // Token is valid if current time is less than expiration time + 30 seconds
    const isValid = now < expirationTime + 30000;

    if (!isValid) {
      console.log("[Middleware] Token expired", {
        exp: new Date(expirationTime).toISOString(),
        now: new Date(now).toISOString(),
      });
    }

    return isValid;
  } catch (error) {
    console.error("[Middleware] Token validation error:", error);
    return false;
  }
}

function getAccessTokenFromCookie(request: NextRequest): string | null {
  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value;

  if (!accessToken) {
    console.log("[Middleware] No access token cookie found");
  }

  return accessToken || null;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/"),
  );
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

  // Get access token from HttpOnly cookie
  const token = getAccessTokenFromCookie(request);
  const isAuthenticated = !!token && isTokenValid(token);

  // console.log(
  //   "[Middleware] Path:",
  //   pathname,
  //   "Authenticated:",
  //   isAuthenticated,
  // );

  // Handle protected routes
  if (isProtectedPath(pathname)) {
    if (!isAuthenticated) {
      console.log("[Middleware] Redirecting to login (unauthenticated)");
      // Redirect to login with return URL
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    console.log("[Middleware] Access granted to protected route");
  }

  // Handle auth routes (redirect if already authenticated)
  if (isAuthPath(pathname)) {
    if (isAuthenticated) {
      console.log(
        "[Middleware] Redirecting away from auth page (already authenticated)",
      );
      // Redirect to dashboard or return URL
      const returnUrl = request.nextUrl.searchParams.get("redirect");
      const url = request.nextUrl.clone();
      url.pathname = returnUrl || "/dashboard/superadmin/tenants";
      url.searchParams.delete("redirect");
      return NextResponse.redirect(url);
    }
  }

  // Allow request to proceed
  return NextResponse.next();
}

/**
 * Configure which paths the middleware runs on
 *
 * Excludes:
 * - API routes (/api/*) - handled separately
 * - Static files (_next/static, _next/image)
 * - Public files (favicon.ico, images with extensions)
 * - Static assets in public folder
 *
 * Includes:
 * - All page routes (app directory)
 * - Both authenticated and public pages
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Files with extensions (images, fonts, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
