/**
 * User Context Provider
 *
 * Provides user authentication state across the application
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
 */
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to refresh user data from token
  const refresh = async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken();

      console.log("TOKEN: ", token);

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        clearTokens();
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Decode JWT to get user info
      const payload = decodeJWT(token);
      console.log("PAYLOAD: ", payload);
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
        setUser(null);
      }
    } catch {
      // Error decoding token
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data on mount and when token changes
  useEffect(() => {
    refresh();
  }, []);

  const value: UserContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    refresh,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
