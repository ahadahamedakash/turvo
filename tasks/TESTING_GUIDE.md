# Testing Guide: Role Permissions Management

## Overview

This guide provides comprehensive testing instructions for verifying the role permissions management system after implementing Tasks 1-3 (Frontend UI Sync, Backend Hard Delete, Frontend Hard Delete Integration).

**Testing Date**: [Fill in when testing]
**Tester**: [Fill in when testing]
**Environment**: Development (localhost)

---

## Pre-Test Setup

### 1. Start Services

```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Verify Services Running

- Backend: `http://localhost:5000/api` (Swagger UI)
- Frontend: `http://localhost:3000` (Dashboard)

### 3. Database Prerequisites

Ensure you have test data:
- ✅ At least 2 roles created (e.g., "Admin", "Staff")
- ✅ At least 5-6 permissions across different modules
- ✅ One role with some permissions assigned
- ✅ One role with no permissions (for testing from-scratch)

If needed, create via:
- Frontend: `/dashboard/superadmin/settings`
- Backend API: `POST /permissions` and `POST /roles`

---

## Test Cases

### TC-001: Initial State Verification

**Objective**: Verify permissions modal loads correctly and displays current state

**Steps**:
1. Login as superadmin
2. Navigate to `http://localhost:3000/dashboard/superadmin/settings`
3. Click "Permissions" button on a role with existing permissions

**Expected Results**:
- [ ] Modal opens without errors
- [ ] Permissions are grouped by module (Booking, Court, Payment, etc.)
- [ ] Assigned permissions show checked
- [ ] Unassigned permissions show unchecked
- [ ] No console errors

**API Check** (Terminal):
```bash
curl -H "Authorization: Bearer <your_token>" \
  http://localhost:5000/api/v1/permissions/roles/<roleId>
```

---

### TC-002: Add Single Permission

**Objective**: Verify adding a permission works with optimistic update

**Steps**:
1. Open permissions modal for a role
2. Find an unchecked permission
3. Click the checkbox
4. Watch browser Network tab
5. Wait for completion

**Expected Results**:
- [ ] Checkbox immediately shows checked (optimistic update)
- [ ] Network tab shows PUT request to `/permissions/roles/:roleId`
- [ ] Request body includes the permission ID
- [ ] Success toast appears: "Role permissions updated"
- [ ] Permission remains checked after request completes
- [ ] Close/reopen modal, permission still checked

**Database Verification**:
```sql
SELECT * FROM "role_permissions"
WHERE "roleId" = '<roleId>' AND "permissionId" = '<permissionId>';
-- Should return 1 row
```

---

### TC-003: Remove Single Permission (HARD DELETE)

**Objective**: Verify removing a permission uses hard delete

**Steps**:
1. Open permissions modal for a role with permissions
2. Find a checked permission
3. Click the checkbox to uncheck
4. Watch browser Network tab

**Expected Results**:
- [ ] Checkbox immediately shows unchecked (optimistic update)
- [ ] Network tab shows PUT request
- [ ] Request body does NOT include the removed permission ID
- [ ] Success toast appears
- [ ] Permission remains unchecked

**Database Verification** (CRITICAL):
```sql
-- Check for deleted records
SELECT COUNT(*) FROM "role_permissions"
WHERE "roleId" = '<roleId>' AND "permissionId" = '<removedId>';

-- Should return 0 (hard delete, no soft-delete records)
-- If rows exist with deletedAt, hard delete failed
```

---

### TC-004: Add Multiple Permissions

**Objective**: Verify multiple additions work correctly

**Steps**:
1. Open permissions modal
2. Click 3 unchecked permissions in sequence
3. Wait for all requests to complete

**Expected Results**:
- [ ] Each checkbox updates immediately when clicked
- [ ] Multiple PUT requests made (one per toggle)
- [ ] Final state has all 3 permissions checked
- [ ] All permissions persist after closing/reopening

**Database Verification**:
```sql
SELECT COUNT(*) FROM "role_permissions" WHERE "roleId" = '<roleId>';
-- Should equal original_count + 3
```

---

### TC-005: Remove All Permissions

**Objective**: Verify complete removal works

**Steps**:
1. Open permissions modal for a role with permissions
2. Uncheck all permissions one by one

**Expected Results**:
- [ ] All checkboxes become unchecked
- [ ] Final PUT request has empty array `{"permissionIds":[]}`
- [ ] Success toast appears
- [ ] No permissions checked after completion

**Database Verification**:
```sql
SELECT * FROM "role_permissions" WHERE "roleId" = '<roleId>';
-- Should return 0 rows
```

---

### TC-006: Optimistic Update Error Rollback

**Objective**: Verify UI reverts on API failure

**Steps**:
1. Open browser DevTools → Network tab
2. Set throttling to "Offline"
3. Click a permission checkbox
4. Observe behavior

**Expected Results**:
- [ ] Checkbox optimistically updates (shows check)
- [ ] Request fails (network error)
- [ ] Error toast appears
- [ ] Checkbox reverts to original state (rollback)
- [ ] UI reflects correct database state

**Recovery Steps**:
1. Set network back online
2. Click the same permission
3. Verify request succeeds and checkbox stays updated

---

### TC-007: Empty Permissions Array Bug (Regression Test)

**Objective**: Ensure the original bug doesn't recur

**Steps**:
1. Open permissions modal
2. Toggle a permission
3. Close modal
4. Reopen the same modal

**Expected Results**:
- [ ] Modal opens successfully
- [ ] All permissions displayed
- [ ] Correct permissions checked/unchecked
- [ ] Permissions array is NOT empty
- [ ] No "permissions undefined" errors in console

---

### TC-008: Cross-Role Isolation

**Objective**: Verify roles don't interfere with each other

**Steps**:
1. Open permissions for Role A
2. Assign Permission X
3. Close modal
4. Open permissions for Role B
5. Verify Permission X state

**Expected Results**:
- [ ] Role B's permissions are independent from Role A
- [ ] Changes to Role A don't affect Role B
- [ ] Each role has correct permission set

---

### TC-009: Database State Verification

**Objective**: Verify no soft-delete records exist

**Steps**:
1. Assign permissions to a role
2. Remove all permissions
3. Query database

**Database Verification**:
```sql
-- Check for any soft-deleted records
SELECT COUNT(*) FROM "role_permissions" WHERE "deletedAt" IS NOT NULL;
-- Should return 0 (or error: column doesn't exist)

-- Verify clean table for role
SELECT * FROM "role_permissions" WHERE "roleId" = '<roleId>';
-- Should return 0 rows
```

---

## API Contract Testing (Swagger)

Navigate to `http://localhost:5000/api` and test:

### GET `/permissions/roles/:roleId`

**Request**:
```
GET /api/v1/permissions/roles/{roleId}
Headers: Authorization: Bearer <token>
```

**Expected Response** (200):
```json
{
  "id": "uuid",
  "slug": "admin",
  "name": "Administrator",
  "description": "Full system access",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "permissions": [
    {
      "id": "uuid",
      "slug": "booking.create",
      "name": "Create Bookings",
      "description": "Can create new bookings",
      "module": "Booking"
    }
  ]
}
```

### PUT `/permissions/roles/:roleId`

**Request**:
```
PUT /api/v1/permissions/roles/{roleId}
Headers: Authorization: Bearer <token>, Content-Type: application/json
Body: {"permissionIds": ["uuid1", "uuid2"]}
```

**Expected Response** (200):
```json
{
  "id": "uuid",
  "slug": "admin",
  "name": "Administrator",
  "permissions": [...]
}
```

**Error Responses**:
- 404: Role not found
- 400: Invalid permission IDs
- 401: Unauthorized
- 403: Forbidden (insufficient permissions)

---

## Performance Checks

### PC-001: Large Permissions List

**Test**: Create 50+ permissions and verify performance

**Expected Results**:
- [ ] Modal renders without lag
- [ ] Toggles remain responsive
- [ ] No console performance warnings

### PC-002: Query Cache Effectiveness

**Test**: Open same role permissions dialog twice

**Expected Results**:
- [ ] Second open is faster (cache hit)
- [ ] Network tab shows only one API call
- [ ] UI displays immediately on second open

---

## Final Verification Checklist

### Code Verification
- [ ] Backend builds without errors (`npm run build`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] No TypeScript compilation errors
- [ ] All Swagger endpoints documented

### Functional Verification
- [ ] All TC-001 through TC-009 pass
- [ ] No console errors in browser
- [ ] No backend errors in terminal
- [ ] Database is clean (no orphaned soft-deleted records)

### UX Verification
- [ ] Optimistic updates feel instant
- [ ] Error messages are clear
- [ ] Toast notifications appear correctly
- [ ] Loading states are visible during mutations
- [ ] Disabled states prevent duplicate actions

### Cross-Browser Verification (if possible)
- [ ] Chrome: All tests pass
- [ ] Firefox: All tests pass
- [ ] Safari/Edge: Basic functionality verified

---

## Issue Tracking

Record any issues found during testing:

| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| | | | |

---

## Test Results Summary

**Date**: [Fill in]
**Tester**: [Fill in]

### Tests Passed
- TC-001: []
- TC-002: []
- TC-003: []
- TC-004: []
- TC-005: []
- TC-006: []
- TC-007: []
- TC-008: []
- TC-009: []

### Overall Result
- [ ] PASS - Ready for staging
- [ ] FAIL - Issues need resolution

### Notes
[Add any observations, suggestions, or concerns]

---

## Next Steps After Testing

1. **If All Pass**: Proceed to staging deployment
2. **If Issues Found**:
   - Document each issue in tracker
   - Assign to appropriate developer
   - Re-test after fixes
3. **Enhancement Suggestions**: Document for future iterations
