# Task 6: Update Dashboard Header

## Context

The dashboard header currently shows a static organization label. This task replaces it with:
- An interactive dropdown for superadmin users (can select tenants)
- A static disabled button for regular users (shows their organization name)

## Current State

**File**: `frontend/components/dashboard/dashboard-header.tsx` (lines 146-188)

```typescript
{/* Active Tenant Context Dropdown */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="hidden lg:flex gap-2 text-xs font-medium">
      <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
      <span className="max-w-30 truncate">
        {isSuperAdmin ? "Global Organization" : "Primary Turf"}
      </span>
      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
      Tenant Scope
    </DropdownMenuLabel>
    <DropdownMenuItem className="gap-2 font-medium">
      <Building2 className="h-4 w-4 text-teal-600" />
      <span>
        {isSuperAdmin ? "All Tenants (Super Admin)" : "Active Turf Organization"}
      </span>
      <Check className="h-3.5 w-3.5 ml-auto text-teal-600" />
    </DropdownMenuItem>
    {isSuperAdmin && (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/superadmin/tenants" className="cursor-pointer text-xs">
            Manage All Turfs
          </Link>
        </DropdownMenuItem>
      </>
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

## Changes

### File: `frontend/components/dashboard/dashboard-header.tsx`

#### 1. Add imports:

```typescript
import { useUserContext } from "@/contexts/user-context";
import { Loader2 } from "lucide-react";
```

#### 2. Update component to use UserContext:

```typescript
export function DashboardHeader() {
  // ... existing state
  const { userData } = useUserData();
  const { availableTenants, selectTenant, isSwitchingTenant, user } = useUserContext();
  const logoutMutation = useLogout();
  const { theme, setTheme } = useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = userData?.isSuperAdmin ?? false;

  // Get current tenant name for display
  const currentTenantName = user?.currentTenant?.name || (isSuperAdmin ? "Select Organization" : "My Organization");
```

#### 3. Replace the organization dropdown section (lines 146-188):

```typescript
{/* Organization Selector - Updated */}
{isSuperAdmin ? (
  /* SUPERADMIN: Interactive dropdown with tenant list */
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:flex gap-2 text-xs font-medium"
        disabled={isSwitchingTenant}
      >
        <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span className="max-w-30 truncate">
          {currentTenantName}
        </span>
        {isSwitchingTenant ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        Switch Organization
      </DropdownMenuLabel>
      {availableTenants && availableTenants.length > 0 ? (
        availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            className="gap-2 cursor-pointer"
            onClick={() => tenant.id !== user?.currentTenant?.id && selectTenant?.(tenant.id)}
            disabled={isSwitchingTenant || tenant.id === user?.currentTenant?.id}
          >
            <Building2 className="h-4 w-4 text-teal-600" />
            <span>{tenant.name}</span>
            {tenant.status === 'Inactive' && (
              <span className="ml-auto text-[10px] text-muted-foreground">(Inactive)</span>
            )}
            {user?.currentTenant?.id === tenant.id && (
              <Check className="h-3.5 w-3.5 ml-auto text-teal-600" />
            )}
          </DropdownMenuItem>
        ))
      ) : (
        <DropdownMenuItem className="gap-2 cursor-pointer" disabled>
          <span className="text-muted-foreground text-xs">No organizations available</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/dashboard/superadmin/tenants" className="cursor-pointer text-xs">
          Manage All Organizations
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
) : (
  /* REGULAR USER: Static button showing organization name */
  <Button
    variant="outline"
    size="sm"
    className="hidden lg:flex gap-2 text-xs font-medium"
    disabled
  >
    <Building2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
    <span className="max-w-30 truncate">
      {currentTenantName}
    </span>
  </Button>
)}
```

## Key Features

1. **Superadmin view**:
   - Shows current tenant name (or "Select Organization" if none selected)
   - Lists all available tenants with checkmark on current
   - Shows "(Inactive)" label for inactive tenants
   - Disables button and shows spinner during switch
   - Can click to switch to any tenant (except current)

2. **Regular user view**:
   - Shows organization name as static disabled button
   - No dropdown, no interactivity

3. **Loading states**:
   - `isSwitchingTenant` shows spinner and disables interactions
   - Prevents concurrent switch attempts

4. **Accessibility**:
   - Disabled state for current tenant (can't switch to self)
   - Disabled state during switch operation
   - Visual feedback with spinner

## Dependencies

- Task 1-5: All previous tasks must be complete
- `Loader2` icon from lucide-react (already imported)

## Completion Criteria

- [ ] Imports added (`useUserContext`, `Loader2`)
- [ ] `currentTenantName` computed from `user.currentTenant?.name`
- [ ] Superadmin dropdown replaced with interactive version
- [ ] Regular user shows static disabled button
- [ ] Loading spinner shown during `isSwitchingTenant`
- [ ] Checkmark shown on current tenant
- [ ] "(Inactive)" label shown for inactive tenants
- [ ] TypeScript compilation succeeds
- [ ] Manual testing: Login as superadmin, see dropdown, click tenant, observe switch

## Manual Testing

1. **Test as superadmin**:
   - Login as superadmin
   - See "Select Organization" or current tenant name
   - Click dropdown, see tenant list
   - Click a tenant, see spinner, then name updates
   - Refresh page, tenant selection persists

2. **Test as regular user**:
   - Login as admin/staff
   - See organization name as disabled button
   - No dropdown appears

3. **Test edge cases**:
   - Try to switch to inactive tenant (should show label but still allow)
   - Switch to tenant, observe data refreshes (bookings, courts, etc.)
   - Network error during switch (toast error shown)
