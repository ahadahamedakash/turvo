# Task 4: End-to-End Testing and Verification

## Overview

This task covers comprehensive testing of the role permissions management system after implementing the fixes from Tasks 1-3.

## Prerequisites

- ✅ Task 1: Frontend UI synchronization fix completed
- ✅ Task 2: Backend hard delete implementation completed
- ✅ Task 3: Frontend hard delete integration completed

## Testing Environment Setup

### Backend Setup

```bash
cd backend
npm run start:dev
```

Verify backend is running at `http://localhost:5000/api`

### Frontend Setup

```bash
cd frontend
npm run dev
```

Verify frontend is running at `http://localhost:3000`

### Database State

Ensure you have:
- At least 2 roles created
- At least 5-6 permissions across different modules
- One role with some permissions assigned
- One role with no permissions assigned

## Test Cases

### TC-001: Get Role Permissions (Initial State)

**Steps:**
1. Navigate to `http://localhost:3000/dashboard/superadmin/settings`
2. Click "Permissions" button on a role that has existing permissions
3. Observe the modal

**Expected Results:**
- ✅ Modal opens without errors
- ✅ Permissions are grouped by module (Booking, Court, Payment, etc.)
- ✅ Permissions that are assigned to the role are checked
- ✅ Permissions that are NOT assigned are unchecked
- ✅ No empty permissions array in console

**Backend Verification:**
```bash
# Check the API directly
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/permissions/roles/<roleId>
```

### TC-002: Add Single Permission

**Steps:**
1. Open permissions modal for a role
2. Find an unchecked permission
3. Click the checkbox

**Expected Results:**
- ✅ Checkbox immediately shows checked (optimistic update)
- ✅ Network tab shows PUT request to `/permissions/roles/:roleId`
- ✅ Request body contains the permission ID
- ✅ Toast notification: "Role permissions updated"
- ✅ Permission remains checked after request completes
- ✅ Modal can be closed and reopened, permission still checked

**Backend Verification:**
```sql
-- Check database for the new permission
SELECT * FROM "RolePermission"
WHERE "roleId" = '<roleId>' AND "permissionId" = '<permissionId>';
-- Should return exactly 1 row
```

### TC-003: Remove Single Permission

**Steps:**
1. Open permissions modal for a role that has permissions
2. Find a checked permission
3. Click the checkbox to uncheck it

**Expected Results:**
- ✅ Checkbox immediately shows unchecked (optimistic update)
- ✅ Network tab shows PUT request
- ✅ Request body does NOT contain the permission ID
- ✅ Toast notification: "Role permissions updated"
- ✅ Permission remains unchecked after request completes

**Backend Verification:**
```sql
-- Check database - should be empty
SELECT * FROM "RolePermission"
WHERE "roleId" = '<roleId>' AND "permissionId" = '<removedPermissionId>';
-- Should return 0 rows (hard delete)
```

### TC-004: Add Multiple Permissions

**Steps:**
1. Open permissions modal
2. Click 3 unchecked permissions in sequence

**Expected Results:**
- ✅ Each checkbox updates immediately when clicked
- ✅ 3 separate PUT requests are made (or 1 if debounced)
- ✅ Final state has all 3 permissions checked
- ✅ All 3 permissions persist after closing and reopening modal

**Backend Verification:**
```sql
SELECT COUNT(*) FROM "RolePermission"
WHERE "roleId" = '<roleId>';
-- Should equal the original count + 3
```

### TC-005: Remove All Permissions

**Steps:**
1. Open permissions modal for a role with multiple permissions
2. Uncheck all permissions one by one

**Expected Results:**
- ✅ All checkboxes become unchecked
- ✅ Final PUT request has empty array `[]`
- ✅ Toast notification shows success
- ✅ Modal shows no permissions checked

**Backend Verification:**
```sql
SELECT * FROM "RolePermission" WHERE "roleId" = '<roleId>';
-- Should return 0 rows
```

### TC-006: Rapid Toggle (Stress Test)

**Steps:**
1. Open permissions modal
2. Rapidly toggle the same permission 5 times (check, uncheck, check...)

**Expected Results:**
- ✅ No duplicate requests (if debouncing is implemented)
- ✅ Or all requests complete successfully (if no debouncing)
- ✅ Final state matches the last toggle action
- ✅ No race conditions or lost updates
- ✅ No error toasts shown

### TC-007: Network Error Recovery

**Steps:**
1. Open browser DevTools → Network tab
2. Set throttling to "Offline"
3. Click a permission checkbox

**Expected Results:**
- ✅ Checkbox optimistically updates
- ✅ Request fails with network error
- ✅ Error toast is shown
- ✅ Checkbox reverts to original state (rollback)
- ✅ UI reflects correct database state

**Recovery:**
1. Set network back online
2. Click the permission again
3. ✅ Request succeeds
4. ✅ Checkbox stays updated

### TC-008: Empty Permissions Array Bug (Regression Test)

**Steps:**
1. Open permissions modal
2. Toggle a permission
3. Close modal
4. Reopen the same modal

**Expected Results:**
- ✅ Modal opens successfully
- ✅ All permissions are shown
- ✅ Correct permissions are checked/unchecked
- ✅ Permissions array is NOT empty
- ✅ No errors in console

**This tests the original bug where permissions array was empty.**

### TC-009: Cross-Role Verification

**Steps:**
1. Assign permissions to Role A
2. Open permissions for Role B

**Expected Results:**
- ✅ Role B's permissions are independent from Role A
- ✅ Changes to Role A don't affect Role B
- ✅ Each role has its own correct permission set

### TC-010: Database Hard Delete Verification

**Steps:**
1. Assign permissions to a role
2. Remove all permissions
3. Query database directly

**Expected Results:**
```sql
SELECT * FROM "RolePermission" WHERE "roleId" = '<roleId>';
-- Result: 0 rows

-- Verify no soft-deleted rows
SELECT * FROM "RolePermission"
WHERE "roleId" = '<roleId>' AND "deletedAt" IS NOT NULL;
-- Result: 0 rows (should not exist if schema was updated)
```

## Performance Tests

### PT-001: Large Permissions List

**Setup:** Create 50+ permissions

**Steps:**
1. Open permissions modal
2. Scroll through all permissions
3. Toggle several permissions

**Expected Results:**
- ✅ Modal renders without significant lag
- ✅ Toggles are responsive
- ✅ No performance warnings in console

### PT-002: Multiple Roles

**Setup:** Have 10+ roles

**Steps:**
1. Navigate between different roles' permission dialogs
2. Toggle permissions in each

**Expected Results:**
- ✅ Each role loads its permissions correctly
- ✅ Query cache works (subsequent opens are faster)
- ✅ No memory leaks or performance degradation

## API Contract Testing

### Using Swagger UI

Navigate to `http://localhost:5000/api` and test:

1. **GET `/permissions/roles/:roleId`**
   - Response includes `permissions` array
   - Each permission has: `id`, `slug`, `name`, `description`, `module`

2. **PUT `/permissions/roles/:roleId`**
   - Request body: `{"permissionIds": ["id1", "id2"]}`
   - Response: Updated role with permissions array
   - Returns 200 on success
   - Returns 404 if role not found
   - Returns 400 if invalid permission IDs

## Final Verification Checklist

- [ ] All test cases pass
- [ ] No console errors in browser
- [ ] No backend errors in terminal
- [ ] Database is clean (no orphaned soft-deleted records)
- [ ] UI is responsive and performs well
- [ ] Error handling works correctly
- [ ] Optimistic updates feel instant
- [ ] Toast notifications appear correctly
- [ ] Permissions persist across page refreshes
- [ ] Multiple roles can be managed independently

## Known Issues to Document

After testing, document any:
1. Edge cases that don't work as expected
2. Performance bottlenecks
3. UX improvements needed
4. Additional features that would be helpful

## Sign-off

Once all tests pass:
1. Create a summary of test results
2. Note any bugs found and their status
3. Recommend deployment to staging environment

## Dependencies

- **Must complete AFTER**: Tasks 1, 2, and 3

## Notes

- Run these tests after each code change to catch regressions
- Consider automating these tests with Playwright or Cypress
- Keep this document updated with new test cases as features are added
- Test with different browsers (Chrome, Firefox, Safari) for cross-browser compatibility
