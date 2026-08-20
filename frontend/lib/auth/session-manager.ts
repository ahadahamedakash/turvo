import { decodeJWT, isTokenExpired, type JWTPayload } from "../jwt";

interface SessionState {
  isInitialized: boolean;
  user: JWTPayload | null;
}

const sessionState: SessionState = {
  isInitialized: false,
  user: null,
};

type SessionListener = (state: SessionState) => void;
const sessionListeners: Set<SessionListener> = new Set();

export async function initializeSession(): Promise<boolean> {
  // Read access_token from cookies
  const cookies = document.cookie.split(";");
  const accessCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("access_token="),
  );

  let token = null;
  if (accessCookie) {
    token = accessCookie.trim().substring("access_token=".length);
  }

  console.log("[SessionManager] Initialize - token found:", !!token);

  if (!token) {
    // No access token - not authenticated
    sessionState.isInitialized = true;
    sessionState.user = null;
    notifySessionListeners();
    return false;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    // Token expired - try silent refresh
    console.log("[SessionManager] Access token expired, attempting refresh...");
    const refreshed = await attemptTokenRefresh();
    return refreshed;
  }

  // Valid token exists - decode user info
  try {
    const payload = decodeJWT(token);
    if (payload) {
      sessionState.user = payload;
    }
  } catch (error) {
    console.error("[SessionManager] Error decoding token:", error);
  }

  sessionState.isInitialized = true;
  notifySessionListeners();

  return sessionState.user !== null;
}

/**
 * Attempt to refresh the access token using refresh token cookie
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // Send HttpOnly cookies
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      // setAccessToken(data.accessToken);

      const payload = decodeJWT(data.accessToken);
      if (payload) {
        sessionState.user = payload;
      }

      sessionState.isInitialized = true;
      notifySessionListeners();

      console.log("[SessionManager] Session refreshed successfully");
      return true;
    } else {
      // Refresh failed - clear and remain logged out
      sessionState.isInitialized = true;
      sessionState.user = null;
      notifySessionListeners();
      return false;
    }
  } catch (error) {
    console.error("[SessionManager] Error during refresh:", error);
    sessionState.isInitialized = true;
    sessionState.user = null;
    notifySessionListeners();
    return false;
  }
}

/**
 * Set cookies for middleware and API client
 * Backend sets non-HttpOnly access token cookies in both dev and production
 */
function setCookies(accessToken: string): void {
  if (typeof window === "undefined") return;

  // Set access token cookie so frontend can read it for Authorization header
  const maxAge = 15 * 60; // 15 minutes

  document.cookie = `access_token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;

  console.log("[SessionManager] Access token cookie set");
}

/**
 * Clear cookies
 */
function clearCookies(): void {
  if (typeof window === "undefined") return;

  document.cookie = "access_token=; path=/; max-age=0";
  document.cookie = "refresh_token=; path=/; max-age=0";

  console.log("[SessionManager] Cookies cleared");
}

/**
 * Set up a new session after login
 *
 * @param accessToken - The access token from login response
 */
export function establishSession(accessToken: string): void {
  console.log("[SessionManager] Establishing session...");

  // Always set cookies so frontend can read the access token for Authorization header
  // Backend now sets non-HttpOnly cookies in both dev and production
  setCookies(accessToken);

  // Extract user info from JWT
  const payload = decodeJWT(accessToken);
  if (payload) {
    console.log("[SessionManager] User data from token:", payload);
    sessionState.user = payload;
  }

  sessionState.isInitialized = true;
  console.log("[SessionManager] Session established, notifying listeners...");
  notifySessionListeners();
}

/**
 * Clear the current session
 * Called on logout or when refresh fails
 */
export function clearSession(): void {
  // Always clear cookies
  clearCookies();

  sessionState.user = null;
  sessionState.isInitialized = true;
  notifySessionListeners();
}

/**
 * Update session with new tokens after refresh
 *
 * @param accessToken - The new access token
 */
export function updateSession(accessToken: string): void {
  // Always update cookies so frontend can read the access token for Authorization header
  setCookies(accessToken);

  // Update user info from new JWT
  const payload = decodeJWT(accessToken);
  if (payload) {
    sessionState.user = payload;
  }

  notifySessionListeners();
}

/**
 * Get the current session state
 */
export function getSessionState(): Readonly<SessionState> {
  return { ...sessionState };
}

/**
 * Get the current user from session
 */
export function getSessionUser(): JWTPayload | null {
  return sessionState.user;
}

/**
 * Subscribe to session state changes
 *
 * @param listener - Callback when session state changes
 * @returns Unsubscribe function
 */
export function onSessionChange(listener: SessionListener): () => void {
  sessionListeners.add(listener);

  // Immediately call with current state
  try {
    listener({ ...sessionState });
  } catch (error) {
    console.error("[SessionManager] Error in listener:", error);
  }

  return () => {
    sessionListeners.delete(listener);
  };
}

/**
 * Notify all session listeners of state changes
 */
function notifySessionListeners(): void {
  const state = { ...sessionState };
  sessionListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error("[SessionManager] Error in listener:", error);
    }
  });
}
