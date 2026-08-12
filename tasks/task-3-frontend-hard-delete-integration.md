# Task 3: Frontend Hard Delete Integration

## Problem Description

The frontend needs to be updated to properly handle the hard delete behavior from the backend. This task ensures the UI correctly reflects the database state after permissions are added or removed.

## Changes Required

The frontend changes are minimal since the API contract remains the same (PUT with array of permission IDs). However, we need to ensure:

1. **Optimistic Updates**: The UI updates immediately when a checkbox is toggled
2. **Error Rollback**: If the API call fails, the UI reverts to the previous state
3. **Proper Loading States**: Checkboxes are disabled during mutation
4. **Correct Data Refetch**: Query invalidation happens after successful mutation

## Implementation Steps

### Step 1: Update useUpdateRolePermissions Hook

**File**: `frontend/hooks/permissions.ts`

Improve the mutation with proper optimistic updates and error handling:

```typescript
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: UpdateRolePermissionsDto }) =>
      permissionsApi.updateRolePermissions(roleId, data),

    // Optimistic update
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: permissionKeys.role(variables.roleId) });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<RoleWithPermissions>(
        permissionKeys.role(variables.roleId),
      );

      // Get all permissions for building optimistic response
      const allPermissions = queryClient.getQueryData<Permission[]>(
        permissionKeys.list(),
      );

      // Optimistically update to the new value
      if (previousData && allPermissions) {
        queryClient.setQueryData<RoleWithPermissions>(
          permissionKeys.role(variables.roleId),
          {
            ...previousData,
            permissions: variables.data.permissionIds
              .map((id) => allPermissions.find((p) => p.id === id))
              .filter((p): p is Permission => p !== undefined),
          },
        );
      }

      return { previousData };
    },

    // If mutation fails, use context returned from onMutate to roll back
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          permissionKeys.role(variables.roleId),
          context.previousData,
        );
      }
    },

    // Refetch after success or error to ensure consistency
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.role(variables.roleId) });
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      toast.success('Role permissions updated', {
        description: `"${data.name}" permissions have been updated`,
      });
    },

    onError: (error: Error) => {
      toast.error('Failed to update role permissions', {
        description: error.message,
      });
    },
  });
}
```

### Step 2: Verify RolePermissionsDialog Component

**File**: `frontend/app/dashboard/superadmin/settings/page.tsx`

The component should already be mostly correct. Verify the following:

1. **Permission IDs Calculation**: Ensure the array calculation is correct

```typescript
const handleTogglePermission = (permissionId: string, isAssigned: boolean) => {
  // Get current permissions from the query data
  const currentPermissionIds =
    rolePermissions?.permissions.map((p) => p.id) ?? [];

  // Calculate new permission IDs
  let newPermissionIds: string[];

  if (isAssigned) {
    // Remove permission
    newPermissionIds = currentPermissionIds.filter(
      (id) => id !== permissionId,
    );
  } else {
    // Add permission
    newPermissionIds = [...currentPermissionIds, permissionId];
  }

  // Call mutation
  updateRolePermissions.mutate(
    {
      roleId: role.id,
      data: { permissionIds: newPermissionIds },
    },
    {
      onSuccess: () => {
        // Optimistic update already handled by the hook
      },
    },
  );
};
```

2. **Checkbox State**: Derived from query data (optimistic updates handled by React Query)

```typescript
const assignedPermissionIds = new Set(
  rolePermissions?.permissions.map((p) => p.id) ?? [],
);

// In the checkbox
<input
  type="checkbox"
  checked={assignedPermissionIds.has(perm.id)}
  onChange={() => handleTogglePermission(perm.id, isAssigned)}
  disabled={updateRolePermissions.isPending}
/>
```

3. **Loading State**: Disable checkboxes during mutation

```typescript
disabled={updateRolePermissions.isPending}
className="... disabled:opacity-50 disabled:cursor-not-allowed"
```

### Step 3: Add Visual Feedback for Pending Changes

**File**: `frontend/app/dashboard/superadmin/settings/page.tsx`

Add a visual indicator when permissions are being updated:

```typescript
// Add a loading indicator near the checkbox
{updateRolePermissions.isPending && (
  <span className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
)}
```

Or add a save button instead of immediate updates:

```typescript
// Alternative approach: Batch updates
const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());

// On dialog open, initialize with current permissions
useEffect(() => {
  if (rolePermissions && open) {
    setSelectedPermissionIds(
      new Set(rolePermissions.permissions.map((p) => p.id)),
    );
  }
}, [rolePermissions, open]);

// On save, call mutation
const handleSave = () => {
  updateRolePermissions.mutate({
    roleId: role.id,
    data: { permissionIds: Array.from(selectedPermissionIds) },
  });
};
```

## Verification Steps

1. Start the frontend: `cd frontend && npm run dev`
2. Navigate to `http://localhost:3000/dashboard/superadmin/settings`
3. Click "Permissions" on a role
4. Test the following scenarios:

   **Scenario 1: Add Permission**
   - Click an unchecked permission
   - ✅ Checkbox immediately shows checked (optimistic update)
   - ✅ API call is made with permission ID in array
   - ✅ Toast shows success message
   - ✅ Permission remains checked

   **Scenario 2: Remove Permission**
   - Click a checked permission
   - ✅ Checkbox immediately shows unchecked
   - ✅ API call is made without permission ID in array
   - ✅ Toast shows success message
   - ✅ Permission remains unchecked

   **Scenario 3: Multiple Changes**
   - Toggle multiple permissions quickly
   - ✅ All changes are sent to backend
   - ✅ Final state matches all toggled changes
   - ✅ No permissions are lost

   **Scenario 4: Error Handling**
   - Simulate network error (dev tools offline mode)
   - Click a permission
   - ✅ Error toast is shown
   - ✅ UI reverts to previous state

5. Check network tab:
   - PUT request to `/permissions/roles/:roleId`
   - Body contains `{"permissionIds": ["id1", "id2", ...]}`
   - Response contains updated role with permissions array

## Expected Outcome

- ✅ Immediate UI feedback when toggling permissions (optimistic updates)
- ✅ Backend hard deletes removed permissions
- ✅ Frontend correctly reflects database state
- ✅ Error handling works correctly with rollback
- ✅ Loading states prevent duplicate mutations

## Dependencies

- **Must complete AFTER**: Task 2 (Backend Hard Delete)
- **Must complete BEFORE**: Task 4 (Testing and Verification)

## Notes

- The optimistic update pattern is critical for good UX
- React Query handles most of the complexity automatically
- Error rollback ensures the UI never gets out of sync
- Consider debouncing if users frequently toggle permissions
- The batch/save button approach could be implemented as an alternative UI pattern
