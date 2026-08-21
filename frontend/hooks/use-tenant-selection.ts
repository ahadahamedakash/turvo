import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/api-client";
import { updateSession } from "@/lib/auth/session-manager";
import { useUserContext } from "@/contexts/user-context";
import { toast } from "sonner";
import type { TenantOption } from "@/lib/types/user";

/**
 * Query key factory for tenant queries
 */
const tenantKeys = {
  all: ["tenants"] as const,
  list: () => [...tenantKeys.all, "list"] as const,
};

/**
 * Hook to fetch available tenants (superadmin only)
 * @param enabled - Whether to enable the query (should be isSuperAdmin)
 */
export function useAvailableTenants(enabled: boolean) {
  return useQuery({
    queryKey: tenantKeys.list(),
    queryFn: () => authApi.getTenants(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - tenant list doesn't change often
  });
}

/**
 * Hook to select a tenant and switch context
 * Handles session update, user context refresh, and query invalidation
 */
export function useSelectTenant() {
  const queryClient = useQueryClient();
  const { refresh } = useUserContext();

  return useMutation({
    mutationFn: (tenantId: string) => authApi.selectTenant(tenantId),

    onSuccess: async (data) => {
      // Update session with new JWT (includes new tenantContext)
      updateSession(data.accessToken);

      // Refresh user context to pick up new tenantContext
      await refresh();

      // Reset all queries to fetch fresh data for new tenant
      queryClient.resetQueries();

      toast.success("Organization switched successfully");
    },

    onError: (error: unknown) => {
      console.error("[useSelectTenant] Error:", error);
      toast.error("Failed to switch organization. Please try again.");
    },
  });
}

/**
 * Hook to get current tenant info from user context
 * Returns the tenant object from the user's current session
 */
export function useCurrentTenant() {
  const { user } = useUserContext();
  return user?.currentTenant || null;
}
