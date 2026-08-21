# Task 5: Extend UserContext

## Context

The UserContext needs to be extended to:
1. Store the list of available tenants (for superadmin dropdown)
2. Provide a `selectTenant()` method for switching tenants
3. Include an `isSwitchingTenant` loading state
4. Expose the current tenant from the user object

## Current State

**File**: `frontend/contexts/user-context.tsx`

```typescript
// User interface
export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
}

// UserContextValue interface
export interface UserContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  refresh: () => Promise<void>;
}

// jwtToUser function
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
```

## Changes

### File: `frontend/contexts/user-context.tsx`

#### 1. Add imports:

```typescript
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/api-client";
import { toast } from "sonner";
import type { TenantOption } from "@/lib/types/user";
```

#### 2. Extend User interface (add to existing):

```typescript
export interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  // ADD THIS:
  currentTenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}
```

#### 3. Extend UserContextValue interface (add to existing):

```typescript
export interface UserContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  refresh: () => Promise<void>;
  // ADD THESE:
  availableTenants?: TenantOption[];
  selectTenant?: (tenantId: string) => Promise<void>;
  isSwitchingTenant?: boolean;
}
```

#### 4. Update jwtToUser function to extract currentTenant:

```typescript
function jwtToUser(payload: JWTPayload): User {
  return {
    id: payload.sub,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    isActive: payload.isActive,
    isSuperAdmin: payload.isSuperAdmin,
    // ADD THIS:
    currentTenant: payload.tenantContext?.tenant ? {
      id: payload.tenantContext.tenant.id,
      name: payload.tenantContext.tenant.name,
      slug: payload.tenantContext.tenant.slug,
    } : null,
  };
}
```

#### 5. Add state and methods to UserProvider:

```typescript
export function UserProvider({ children }: UserProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // ADD THIS STATE:
  const [availableTenants, setAvailableTenants] = useState<TenantOption[]>([]);
  const [isSwitchingTenant, setIsSwitchingTenant] = useState(false);

  // ... existing useEffect hooks ...

  // ADD THIS METHOD:
  const selectTenant = useCallback(async (tenantId: string) => {
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
  }, [refresh, queryClient]);

  // UPDATE value object:
  const value: UserContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    refresh,
    // ADD THESE:
    availableTenants,
    selectTenant,
    isSwitchingTenant,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

#### 6. Fetch available tenants on superadmin login

Add this effect after the existing initialization effects:

```typescript
// Fetch available tenants for superadmin
useEffect(() => {
  if (user?.isSuperAdmin && isInitialized) {
    const fetchTenants = async () => {
      try {
        const tenants = await authApi.getTenants();
        setAvailableTenants(tenants);
      } catch (error) {
        console.error("[UserContext] Error fetching tenants:", error);
      }
    };
    fetchTenants();
  } else if (!user?.isSuperAdmin) {
    // Clear tenants if not superadmin
    setAvailableTenants([]);
  }
}, [user?.isSuperAdmin, isInitialized]);
```

## Why This Approach

1. **Centralized state**: Available tenants stored in UserContext, accessible from any component
2. **Loading state**: `isSwitchingTenant` prevents concurrent switch attempts
3. **Automatic fetch**: Tenants fetched automatically when superadmin logs in
4. **Current tenant exposure**: `user.currentTenant` makes current tenant info easily accessible

## Dependencies

- Task 1: Type definitions (`TenantOption` type)
- Task 2: JWT types (`tenantContext.tenant` object)
- Task 3: API client methods (`getTenants()`, `selectTenant()`)
- Existing: `session-manager.ts` (`updateSession()`)
- Existing: `QueryClientProvider` wraps `UserProvider` in `components/providers.tsx`

## Completion Criteria

- [ ] `currentTenant` added to User interface
- [ ] `availableTenants`, `selectTenant`, `isSwitchingTenant` added to UserContextValue
- [ ] `jwtToUser()` updated to extract currentTenant
- [ ] State added to UserProvider (`availableTenants`, `isSwitchingTenant`)
- [ ] `selectTenant()` method implemented
- [ ] Effect added to fetch tenants for superadmin
- [ ] TypeScript compilation succeeds
- [ ] `useQueryClient` hook works (QueryClientProvider must wrap UserProvider)

## Testing

```typescript
// In any component within UserProvider:
const { availableTenants, selectTenant, isSwitchingTenant, user } = useUserContext();

console.log(user?.currentTenant); // Should show current tenant info
console.log(availableTenants); // Should show array for superadmin, empty for others
```
