# Task 1: Fix Role Permissions UI Synchronization

## Problem Description

The "Manage Permissions" modal in the settings page is not working correctly:
- When clicking a permission checkbox, an API call is made (correct)
- But instead of properly toggling the permission, the entire permission list gets deleted
- During fetching roles, the permissions array shows as empty
- The UI state doesn't reflect the actual database state

## Root Causes Identified

1. **Race Condition**: The `assignedPermissionIds` Set is computed from `rolePermissions?.permissions` which may be stale during the mutation
2. **Query Invalidation Timing**: The query might be invalidated before the mutation completes, causing the UI to show empty permissions
3. **Optimistic Updates**: The UI doesn't use optimistic updates, causing a lag between user action and UI feedback
4. **Checkbox State**: The checkbox checked state is derived from potentially stale data

## Files Involved

- `frontend/app/dashboard/superadmin/settings/page.tsx` (RolePermissionsDialog component)
- `frontend/hooks/permissions.ts` (useUpdateRolePermissions hook)
- `frontend/lib/api/permissions.ts` (API client)

## Implementation Steps

### Step 1: Add Optimistic State Management

**File**: `frontend/app/dashboard/superadmin/settings/page.tsx`

Add local state to track pending permission changes:

```typescript
// In RolePermissionsDialog component
const [pendingPermissionIds, setPendingPermissionIds] = useState<Set<string>>(new Set());

const handleTogglePermission = (permissionId: string, isAssigned: boolean) => {
  const currentPermissionIds = rolePermissions?.permissions.map((p) => p.id) ?? [];
  let newPermissionIds: string[];

  if (isAssigned) {
    newPermissionIds = currentPermissionIds.filter((id) => id !== permissionId);
  } else {
    newPermissionIds = [...currentPermissionIds, permissionId];
  }

  // Optimistic update
  const newPendingSet = new Set(pendingPermissionIds);
  if (isAssigned) {
    newPendingSet.delete(permissionId);
  } else {
    newPendingSet.add(permissionId);
  }
  setPendingPermissionIds(newPendingSet);

  updateRolePermissions.mutate(
    { roleId: role.id, data: { permissionIds: newPermissionIds } },
    {
      onSuccess: () => {
        // Clear pending state on success
        setPendingPermissionIds(new Set());
      },
      onError: () => {
        // Revert pending state on error
        setPendingPermissionIds(new Set());
      },
    },
  );
};

// Update assignedPermissionIds to include pending changes
const assignedPermissionIds = new Set([
  ...(rolePermissions?.permissions.map((p) => p.id) ?? []),
  ...Array.from(pendingPermissionIds),
]);
```

### Step 2: Fix Query Invalidation Timing

**File**: `frontend/hooks/permissions.ts`

Update `useUpdateRolePermissions` to properly invalidate queries AFTER mutation completes:

```typescript
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRolePermissionsDto }) =>
      permissionsApi.updateRolePermissions(roleId, data),

    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: permissionKeys.role(variables.roleId) });

      // Snapshot previous value
      const previousRolePermissions = queryClient.getQueryData(
        permissionKeys.role(variables.roleId),
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        permissionKeys.role(variables.roleId),
        (old: RoleWithPermissions | undefined) => {
          if (!old) return old;
          return {
            ...old,
            permissions: variables.data.permissionIds.map((id) =>
              allPermissions?.find((p) => p.id === id),
            ).filter(Boolean),
          };
        },
      );

      return { previousRolePermissions };
    },

    onError: (err, variables, context) => {
      // Rollback to previous value
      if (context?.previousRolePermissions) {
        queryClient.setQueryData(
          permissionKeys.role(variables.roleId),
          context.previousRolePermissions,
        );
      }
    },

    onSuccess: (data, variables) => {
      // Refetch to ensure we have the latest data from server
      queryClient.invalidateQueries({ queryKey: permissionKeys.role(variables.roleId) });
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}
```

### Step 3: Add Loading State to Checkboxes

**File**: `frontend/app/dashboard/superadmin/settings/page.tsx`

Disable checkboxes during mutation and show loading indicator:

```typescript
<input
  type="checkbox"
  checked={isAssigned}
  onChange={() => handleTogglePermission(perm.id, isAssigned)}
  disabled={updateRolePermissions.isPending}
  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600 disabled:opacity-50"
/>
```

### Step 4: Add Error Recovery

**File**: `frontend/app/dashboard/superadmin/settings/page.tsx`

Handle mutation errors gracefully with user feedback:

```typescript
// In the mutation call
updateRolePermissions.mutate(
  { roleId: role.id, data: { permissionIds: newPermissionIds } },
  {
    onSuccess: () => {
      setPendingPermissionIds(new Set());
      // Toast is already shown by the hook
    },
    onError: (error) => {
      setPendingPermissionIds(new Set());
      // Additional error handling if needed
      console.error('Failed to update permissions:', error);
    },
  },
);
```

## Verification Steps

1. Open the settings page: `http://localhost:3000/dashboard/superadmin/settings`
2. Click "Permissions" on a role
3. Toggle a permission checkbox ON:
   - Checkbox should immediately show checked state (optimistic update)
   - API call is made
   - Toast shows success
   - Permission remains checked after completion
4. Toggle the same permission OFF:
   - Checkbox should immediately show unchecked state
   - API call is made
   - Toast shows success
   - Permission remains unchecked after completion
5. Quickly toggle multiple permissions:
   - All toggles should be processed correctly
   - No permissions should be lost
   - Final state matches all toggled changes
6. Check network tab:
   - Each toggle should send a PUT request with the correct permission IDs
   - Response should include the updated role with permissions

## Expected Outcome

- ✅ Clicking a permission checkbox immediately updates the UI (optimistic update)
- ✅ API call is made with correct permission IDs array
- ✅ After completion, the UI matches the database state
- ✅ No race conditions or lost updates
- ✅ Error handling rolls back optimistic updates
- ✅ Permissions array is never empty after successful updates

## Dependencies

- None (this task can be done independently)

## Notes

- The backend already handles soft-delete correctly, so we don't need to change the backend
- The key is proper optimistic updates and query invalidation timing
- Using React Query's `onMutate`, `onError`, and `onSuccess` callbacks is the recommended pattern
