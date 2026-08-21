# Tenant Selection Feature - Testing Guide

## Pre-Implementation Setup

1. Ensure backend is running on port 5000
2. Ensure frontend is running on port 3000
3. Have a superadmin user ready for testing

## Testing After Each Task

### After Task 1: Type Definitions

```bash
cd frontend
npm run type-check
```

Expected: No TypeScript errors

### After Task 2: JWT Types

```bash
cd frontend
npm run type-check
```

Expected: No TypeScript errors

### After Task 3: API Client

**Manual test in browser console** (authenticated as superadmin):

```javascript
// Test getTenants
import { authApi } from '@/lib/api/api-client';
const tenants = await authApi.getTenants();
console.log(tenants); // Should show array of {id, name, slug, status}

// Test selectTenant (replace with actual ID)
const result = await authApi.selectTenant(tenants[0].id);
console.log(result); // Should show {accessToken, refreshToken}
```

### After Task 4: Tenant Selection Hook

```bash
cd frontend
npm run type-check
```

Expected: No TypeScript errors

### After Task 5: Extend UserContext

```bash
cd frontend
npm run type-check
```

**Manual test in browser console** (authenticated):

```javascript
// Get UserContext from any component
import { useUserContext } from '@/contexts/user-context';
const { availableTenants, selectTenant, user, isSwitchingTenant } = useUserContext();

console.log('Current tenant:', user?.currentTenant); // Should show current tenant
console.log('Available tenants:', availableTenants); // Should show array for superadmin
console.log('Is switching:', isSwitchingTenant); // Should be false
```

### After Task 6: Dashboard Header

See "End-to-End Testing" below.

---

## End-to-End Testing

### Test 1: Regular User (Admin/Staff)

**Setup**: Login as a regular tenant user (not superadmin)

**Expected behavior**:
1. Header shows organization name as a **disabled button**
2. No dropdown appears
3. Organization name matches the user's tenant

**Screenshot reference**:
```
[Header with: Building2 icon + "My Organization" (disabled button)]
```

### Test 2: Superadmin - Initial State

**Setup**: Login as superadmin

**Expected behavior**:
1. Header shows **dropdown button** with Building2 icon
2. Button text shows current tenant name or "Select Organization"
3. Click dropdown to see tenant list

**Browser console check**:
```javascript
import { useUserContext } from '@/contexts/user-context';
const { user, availableTenants } = useUserContext();
console.log('Current:', user?.currentTenant);
console.log('Available:', availableTenants);
```

### Test 3: Superadmin - Switch Tenant

**Setup**: Logged in as superadmin, viewing dashboard

**Steps**:
1. Click the organization dropdown
2. Select a different tenant
3. Observe loading spinner appears
4. Wait for switch to complete
5. Verify toast message: "Organization switched successfully"

**Expected behavior**:
1. Dropdown button shows new tenant name
2. Loading spinner appears during switch
3. Checkmark appears on newly selected tenant
4. All data refreshes (bookings, courts, etc.)

**Verification**:
- Navigate to Bookings page - should show bookings for NEW tenant
- Navigate to Courts page - should show courts for NEW tenant

### Test 4: Superadmin - Persistence

**Setup**: After switching to a tenant, refresh the page

**Expected behavior**:
1. Page reloads
2. Header still shows the previously selected tenant name
3. User remains logged in
4. Checkmark is on the correct tenant in dropdown

### Test 5: Inactive Tenant Handling

**Setup**: Login as superadmin, have at least one inactive tenant

**Expected behavior**:
1. Dropdown shows all tenants including inactive ones
2. Inactive tenants show "(Inactive)" label
3. Can still switch to inactive tenant (backend validates)
4. If backend rejects inactive tenant, error toast appears

### Test 6: Error Scenarios

**Scenario A: Network error during switch**

1. Start switching tenant
2. Simulate network failure (disconnect network or stop backend)
3. Expected: Error toast "Failed to switch organization"
4. User remains on current tenant
5. Loading state resets

**Scenario B: Backend returns 403**

1. Try to switch to a tenant with restricted access
2. Expected: Error toast with backend message
3. User remains on current tenant

### Test 7: Race Condition Protection

**Steps**:
1. Click to switch to Tenant A
2. Immediately click to switch to Tenant B (while first switch is loading)

**Expected behavior**:
1. First switch proceeds normally
2. Second click is ignored (button disabled during switch)
3. No concurrent switch attempts
4. Final state is consistently on one tenant

### Test 8: Query Invalidation

**Steps**:
1. Go to Bookings page (Tenant A)
2. Note the bookings shown
3. Switch to Tenant B
4. Return to Bookings page

**Expected behavior**:
1. Bookings page shows Tenant B's bookings (not Tenant A's)
2. No stale data from previous tenant

---

## Edge Cases to Test

| Case | Expected Behavior |
|------|-------------------|
| Superadmin with no tenants | "No organizations available" message in dropdown |
| Superadmin removed from tenant while viewing | JWT validation fails, redirect to login |
| Tenant status changes while viewing | Next refresh shows updated status |
| Quick succession of tenant switches | First switch completes, subsequent clicks ignored |
| Browser refresh during switch | Switch completes on page load or shows error |

---

## Performance Checks

1. **Tenant list loading time**: Should be < 500ms for < 100 tenants
2. **Switch latency**: Should complete in < 2 seconds
3. **Memory**: No memory leaks after multiple switches
4. **Network**: Only one API call per switch (`POST /auth/select-tenant`)

---

## Accessibility Testing

1. **Keyboard navigation**: Tab to dropdown, Enter to open, Arrow keys to navigate
2. **Screen reader**: Tenant names are announced, current tenant is indicated
3. **Disabled state**: Button is properly disabled during switch

---

## Browser Compatibility

Test in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

---

## Success Criteria

All tasks complete when:
- [ ] All TypeScript checks pass
- [ ] Superadmin can see and interact with tenant dropdown
- [ ] Regular users see static organization name
- [ ] Tenant switching works correctly
- [ ] All data refreshes after tenant switch
- [ ] Error cases are handled gracefully
- [ ] No console errors during normal operation
