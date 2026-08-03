/**
 * User Context Provider
 *
 * Provides user authentication state across the application
 * Integrates with token manager for proactive token refresh
 */

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getAccessToken, clearTokens } from "@/lib/auth";
import { decodeJWT, isTokenExpired } from "@/lib/jwt";
import {
  initTokenManager,
  cleanupTokenManager,
  updateTokenManager,
  onTokenEvent,
} from "@/lib/token-manager";
import type { User, UserContextValue } from "@/lib/types/user";

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * Hook to access user context
 */
export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}

/**
 * User Provider Props
 */
interface UserProviderProps {
  children: ReactNode;
}

/**
 * User Provider Component
 *
 * Provides user authentication state across the app
 * Decodes JWT from cookie to get user info
 * Integrates with token manager for proactive refresh
 */
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to refresh user data from token
  const refresh = async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken();

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        clearTokens();
        cleanupTokenManager();
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Decode JWT to get user info
      const payload = decodeJWT(token);
      if (payload) {
        setUser({
          id: payload.sub,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          isActive: payload.isActive,
          isSuperAdmin: payload.isSuperAdmin,
        });
      } else {
        // Invalid token
        clearTokens();
        cleanupTokenManager();
        setUser(null);
      }
    } catch {
      // Error decoding token
      clearTokens();
      cleanupTokenManager();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data on mount and when token changes
  useEffect(() => {
    // Initialize token manager and get initial user data
    const token = getAccessToken();

    if (token && !isTokenExpired(token)) {
      // Initialize token manager for proactive refresh
      initTokenManager();
      updateTokenManager(token);
    }

    refresh();

    // Cleanup token manager on unmount
    return () => {
      cleanupTokenManager();
    };
  }, []);

  // Listen for token refresh events to update user state
  useEffect(() => {
    const unsubscribeSuccess = onTokenEvent("refreshSuccess", () => {
      // Token was refreshed, update user state
      const newToken = getAccessToken();
      if (newToken) {
        const payload = decodeJWT(newToken);
        if (payload) {
          setUser({
            id: payload.sub,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            isActive: payload.isActive,
            isSuperAdmin: payload.isSuperAdmin,
          });
        }
      }
    });

    const unsubscribeFailed = onTokenEvent("refreshFailed", () => {
      // Token refresh failed, clear user state
      setUser(null);
    });

    // Cleanup listeners
    return () => {
      unsubscribeSuccess();
      unsubscribeFailed();
    };
  }, []);

  const value: UserContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    refresh,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
