/**
 * Token Manager - Handles proactive token refresh
 *
 * Features:
 * - Tracks token expiry and refreshes before expiration
 * - Prevents concurrent refresh attempts
 * - Cleans up timers on unmount
 * - Coordinates with api-client for mutex-controlled refresh
 */

import { getAccessToken, setTokens, clearTokens } from "./auth";
import { decodeJWT, isTokenExpired } from "./jwt";

/**
 * Token manager state
 */
interface TokenManagerState {
  refreshTimer: ReturnType<typeof setTimeout> | null;
  checkExpiryTimer: ReturnType<typeof setInterval> | null;
  isInitialized: boolean;
}

const state: TokenManagerState = {
  refreshTimer: null,
  checkExpiryTimer: null,
  isInitialized: false,
};

/**
 * Time before token expiry to trigger refresh (in milliseconds)
 * 1 minute before expiry = 60,000ms
 */
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;

/**
 * Interval to check token expiry (in milliseconds)
 * Check every 30 seconds
 */
const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Minimum time remaining to consider token valid (in milliseconds)
 * 30 seconds buffer
 */
const MIN_VALID_TIME_MS = 30 * 1000;

/**
 * Refresh token mutex - shared with api-client
 * Import this from api-client to ensure single source of truth
 */
let refreshPromise: Promise<boolean> | null = null;

/**
 * Perform the actual token refresh
 *
 * @returns Promise<boolean> - true if refresh succeeded, false otherwise
 */
async function performRefresh(): Promise<boolean> {
  // If a refresh is already in progress, return that promise
  if (refreshPromise) {
    return refreshPromise;
  }

  // Create new refresh promise
  refreshPromise = (async () => {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

    // Get refresh token from cookie
    const refreshToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("refresh_token="))
      ?.split("=")[1];

    if (!refreshToken) {
      notifyRefreshFailed();
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        clearTokens();
        notifyRefreshFailed();
        return false;
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      notifyRefreshSuccess();
      return true;
    } catch {
      clearTokens();
      notifyRefreshFailed();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Notify listeners of successful refresh
 */
function notifyRefreshSuccess(): void {
  listeners.onRefreshSuccess.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.error("Error in refresh success callback:", error);
    }
  });
}

/**
 * Notify listeners of failed refresh
 */
function notifyRefreshFailed(): void {
  listeners.onRefreshFailed.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.error("Error in refresh failed callback:", error);
    }
  });
}

/**
 * Calculate time until token expiry
 *
 * @param token - JWT access token
 * @returns number - milliseconds until expiry, or null if unable to determine
 */
function getTimeUntilExpiry(token: string): number | null {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) {
      return null;
    }

    // exp is in seconds, convert to milliseconds
    const expiryTime = payload.exp * 1000;
    const timeUntilExpiry = expiryTime - Date.now();

    return timeUntilExpiry;
  } catch {
    return null;
  }
}

/**
 * Schedule a token refresh before expiry
 *
 * @param token - JWT access token
 */
function scheduleRefresh(token: string): void {
  // Clear any existing timer
  if (state.refreshTimer) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = null;
  }

  const timeUntilExpiry = getTimeUntilExpiry(token);

  if (!timeUntilExpiry || timeUntilExpiry <= MIN_VALID_TIME_MS) {
    // Token is expired or will expire soon, refresh now
    performRefresh().catch(() => {
      // Refresh failed, will be handled by listeners
    });
    return;
  }

  // Schedule refresh for REFRESH_BEFORE_EXPIRY_MS before actual expiry
  const refreshDelay = Math.max(
    0,
    timeUntilExpiry - REFRESH_BEFORE_EXPIRY_MS,
  );

  state.refreshTimer = setTimeout(() => {
    performRefresh().catch(() => {
      // Refresh failed, will be handled by listeners
    });
  }, refreshDelay);
}

/**
 * Check token expiry and refresh if needed
 * This is called periodically by the expiry check interval
 */
function checkTokenExpiry(): void {
  const token = getAccessToken();

  if (!token) {
    // No token, nothing to do
    return;
  }

  // If token is expired or will expire soon, trigger refresh
  const timeUntilExpiry = getTimeUntilExpiry(token);

  if (timeUntilExpiry === null || timeUntilExpiry <= MIN_VALID_TIME_MS) {
    // Token is expired or will expire very soon, refresh now
    performRefresh().catch(() => {
      // Refresh failed, will be handled by listeners
    });
  } else if (
    !state.refreshTimer &&
    timeUntilExpiry <= REFRESH_BEFORE_EXPIRY_MS + MIN_VALID_TIME_MS
  ) {
    // Token is approaching expiry but no timer is set, schedule refresh
    scheduleRefresh(token);
  }
}

/**
 * Callbacks for token events
 */
type TokenEventCallback = () => void;

const listeners: {
  onRefreshSuccess: TokenEventCallback[];
  onRefreshFailed: TokenEventCallback[];
} = {
  onRefreshSuccess: [],
  onRefreshFailed: [],
};

/**
 * Initialize the token manager
 * Sets up periodic expiry checks and schedules initial refresh
 */
export function initTokenManager(): void {
  if (state.isInitialized) {
    return;
  }

  const token = getAccessToken();

  if (token) {
    // Check if token is already expired
    if (isTokenExpired(token)) {
      clearTokens();
      return;
    }

    // Schedule initial refresh
    scheduleRefresh(token);

    // Set up periodic expiry checks
    // This handles cases where the computer wakes from sleep
    // or the token expiry calculation might be off
    state.checkExpiryTimer = setInterval(() => {
      checkTokenExpiry();
    }, EXPIRY_CHECK_INTERVAL_MS);
  }

  state.isInitialized = true;
}

/**
 * Update the token manager with new tokens
 * Call this after login or successful token refresh
 *
 * @param accessToken - New access token
 */
export function updateTokenManager(accessToken: string): void {
  // Schedule refresh for the new token
  scheduleRefresh(accessToken);

  // If not initialized, initialize now
  if (!state.isInitialized) {
    initTokenManager();
  }
}

/**
 * Cleanup the token manager
 * Clears all timers and intervals
 */
export function cleanupTokenManager(): void {
  if (state.refreshTimer) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = null;
  }

  if (state.checkExpiryTimer) {
    clearInterval(state.checkExpiryTimer);
    state.checkExpiryTimer = null;
  }

  state.isInitialized = false;
}

/**
 * Subscribe to token refresh events
 *
 * @param event - Event type to listen to
 * @param callback - Function to call when event occurs
 * @returns Unsubscribe function
 */
export function onTokenEvent(
  event: "refreshSuccess" | "refreshFailed",
  callback: TokenEventCallback,
): () => void {
  const listenerArray =
    event === "refreshSuccess" ? listeners.onRefreshSuccess : listeners.onRefreshFailed;

  listenerArray.push(callback);

  // Return unsubscribe function
  return () => {
    const index = listenerArray.indexOf(callback);
    if (index > -1) {
      listenerArray.splice(index, 1);
    }
  };
}

/**
 * Check if token manager is initialized
 */
export function isTokenManagerInitialized(): boolean {
  return state.isInitialized;
}

/**
 * Get time until token expiry (in milliseconds)
 * Returns null if unable to determine
 */
export function getTimeUntilTokenExpiry(): number | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }
  return getTimeUntilExpiry(token);
}
