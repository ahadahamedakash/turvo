"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSessionState,
  getSessionUser,
  onSessionChange,
  initializeSession,
  updateSession,
} from "@/lib/auth/session-manager";
import type { JWTPayload } from "@/lib/jwt";
import type { User, UserContextValue, TenantOption } from "@/lib/types/user";
import { authApi } from "@/lib/api/api-client";
import { toast } from "sonner";

const UserContext = createContext<UserContextValue | undefined>(undefined);

function jwtToUser(payload: JWTPayload): User {
  return {
    id: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    isActive: payload.isActive,
    isSuperAdmin: payload.isSuperAdmin,
    currentTenant: payload.tenantContext?.tenant
      ? {
          id: payload.tenantContext.tenant.id,
          name: payload.tenantContext.tenant.name,
          slug: payload.tenantContext.tenant.slug,
        }
      : null,
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);

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

  const selectTenant = useCallback(
    async (tenantId: string) => {
      setIsSwitchingTenant(true);
      try {
        const result = await authApi.selectTenant(tenantId);
        updateSession(result.accessToken);
        await refresh();
        queryClient.resetQueries();
        toast.success("Organization switched successfully");
      } catch (error) {
        console.error("[UserContext] Error switching tenant:", error);
        toast.error("Failed to switch organization");
      } finally {
        setIsSwitchingTenant(false);
      }
    },
    [refresh, queryClient],
  );

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

  // Fetch available tenants for superadmin
  useEffect(() => {
    if (user?.isSuperAdmin && isInitialized) {
      const fetchTenants = async () => {
        try {
          const tenants = await authApi.getTenants();
          setAvailableTenants(tenants);

          // Auto-select "Default Organization" if no tenant is currently selected
          if (!user?.currentTenant) {
            const defaultTenant = tenants.find(
              (t) => t.name === "Default Organization",
            );
            if (defaultTenant && selectTenant) {
              console.log(
                "[UserContext] Auto-selecting Default Organization:",
                defaultTenant.id,
              );
              await selectTenant(defaultTenant.id);
            }
          }
        } catch (error) {
          console.error("[UserContext] Error fetching tenants:", error);
        }
      };
      fetchTenants();
    }
  }, [user?.isSuperAdmin, user?.currentTenant, isInitialized, selectTenant]);

  // Derived value: only expose tenants when user is superadmin
  const exposedAvailableTenants = useMemo(
    () => (user?.isSuperAdmin ? availableTenants : []),
    [availableTenants, user?.isSuperAdmin],
  );

  const value: UserContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    refresh,
    availableTenants: exposedAvailableTenants,
    selectTenant,
    isSwitchingTenant,
  };

  // Don't block rendering - just pass the context
  // Components can check isLoading/isInitialized themselves
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
