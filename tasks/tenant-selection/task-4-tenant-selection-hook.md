# Task 4: Create Tenant Selection Hook

## Context

Create a new hook file that encapsulates the tenant selection logic using React Query. This hook will:
1. Fetch available tenants (for superadmin only)
2. Handle tenant selection mutation with session update and query invalidation

## New File

**File**: `frontend/hooks/use-tenant-selection.ts` (CREATE NEW FILE)

```typescript
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
```

## Why This Structure

1. **Query key factory**: Follows established pattern from `hooks/slots.ts` and other modules
2. **10-minute cache**: Tenant list doesn't change frequently, reduces API calls
3. **`resetQueries()`**: Clears all tenant-scoped data so components refetch with new tenant context
4. **`updateSession()` then `refresh()`**: Updates JWT first, then refreshes UserContext to pick up new `tenantContext`
5. **Separate `useCurrentTenant()` hook**: Convenient for components that just need current tenant info

## Dependencies

- Task 1: Type definitions (`TenantOption` type)
- Task 3: API client methods (`getTenants()`, `selectTenant()`)
- Existing: `session-manager.ts` (`updateSession()`)
- Existing: `user-context.tsx` (`refresh()` method)

## Completion Criteria

- [ ] File created at `frontend/hooks/use-tenant-selection.ts`
- [ ] `useAvailableTenants` hook exported
- [ ] `useSelectTenant` mutation hook exported
- [ ] `useCurrentTenant` hook exported
- [ ] TypeScript compilation succeeds
- [ ] `sonner` toast library is installed (should already be installed from bookings feature)
