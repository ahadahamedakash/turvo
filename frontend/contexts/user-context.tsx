"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  getSessionState,
  getSessionUser,
  onSessionChange,
  initializeSession,
} from "@/lib/auth/session-manager";
import type { JWTPayload } from "@/lib/jwt";
import type { User, UserContextValue } from "@/lib/types/user";

const UserContext = createContext<UserContextValue | undefined>(undefined);

function jwtToUser(payload: JWTPayload): User {
  return {
    id: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    isActive: payload.isActive,
    isSuperAdmin: payload.isSuperAdmin,
  };
}

export function useUserContext(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const sessionUser = getSessionUser();
      if (sessionUser) {
        setUser(jwtToUser(sessionUser));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("[UserContext] Error refreshing user data:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      console.log("[UserContext] Initializing session...");

      const hasSession = await initializeSession();

      if (!mounted) return;

      console.log("[UserContext] Session initialized:", hasSession);

      // Get the session state after initialization
      const sessionState = getSessionState();

      if (sessionState.user) {
        setUser(jwtToUser(sessionState.user));
      }

      setIsInitialized(true);
      setIsLoading(false);
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionChange((sessionState) => {
      // console.log("[UserContext] Session state changed:", {
      //   isInitialized: sessionState.isInitialized,
      //   hasUser: !!sessionState.user,
      // });

      if (sessionState.user) {
        setUser(jwtToUser(sessionState.user));
      } else if (sessionState.isInitialized) {
        // Session is initialized but no user means logged out
        setUser(null);
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: UserContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    refresh,
  };

  // Don't block rendering - just pass the context
  // Components can check isLoading/isInitialized themselves
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
