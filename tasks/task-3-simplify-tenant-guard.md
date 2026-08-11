# Task 3: Simplify TenantGuard to Read from JWT

**Priority**: HIGH
**Status**: COMPLETED ✅
**Estimated Time**: 30 minutes
**Depends On**: Task 2 (JWT must contain tenant context first)
**Completed**: 2026-08-11
**Note**: Completed as part of Task 2 - changes were interdependent

## Problem

Current `TenantGuard` extracts tenantId from URL params, query params, or `X-Tenant-ID` header, then queries the database to validate membership. This:
- Is inefficient (DB query on every request)
- Depends on frontend sending tenant context
- Violates stateless JWT principles

## Solution

Simplify `TenantGuard` to read tenant context from `request.user.tenantContext` (populated by JWT strategy).

## Required Changes

### 1. Update TenantGuard (tenant.guard.ts)

**File**: `backend/src/common/guard/tenant.guard.ts`

**Change**: Replace tenant ID extraction logic with JWT-based reading.

**Location**: `canActivate()` method (lines 74-198)

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest<TenantContextRequest>();
  const user = request.user; // Set by JwtAuthGuard

  if (!user) {
    throw new UnauthorizedException('Authentication required');
  }

  // Superadmin: handle tenant selection (see Task 4)
  if (user.isSuperAdmin) {
    // For now, use virtual context (will be enhanced in Task 4)
    request.tenantContext = {
      tenantId: 'SUPERADMIN',
      tenantMemberId: 'SUPERADMIN',
      tenant: {
        id: 'SUPERADMIN',
        name: 'Super Admin',
        slug: 'superadmin',
        status: 'Active',
      },
      roles: [],
      permissions: ['*.all'], // Superadmin has all permissions
    };
    return true;
  }

  // Regular user: use tenant context from JWT
  if (!user.tenantContext) {
    throw new UnauthorizedException(
      'No tenant context in JWT. Please re-login.'
    );
  }

  // Simply attach tenant context from JWT to request
  request.tenantContext = user.tenantContext;
  return true;
}
```

### 2. Remove Old Extraction Logic

**DELETE** these sections from `TenantGuard.canActivate()`:
- Lines 102-126: Tenant ID extraction from URL/query/header
- Lines 133-167: DB query for tenant member validation
- Lines 180-186: Permission extraction from DB (now in JWT)

### 3. Update Type Definition

**File**: `backend/src/common/guard/tenant.guard.ts`

**Update**: Add `tenantContext` to user type

```typescript
interface TenantContextRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    isActive?: boolean;
    isSuperAdmin?: boolean;
    tenantContext?: {  // ADD THIS
      tenantId: string;
      tenantMemberId: string;
      tenant: {
        id: string;
        name: string;
        slug: string;
        status: string;
      };
      permissions: string[];
    };
  };
  tenantContext?: {
    tenantId: string;
    tenantMemberId: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    roles: any[];
    permissions: string[];
  };
}
```

## Verification

After making changes:

1. Login as regular user
2. Call GET `/courts` - should work without `X-Tenant-ID` header
3. Check backend logs - no DB query for tenant member on each request
4. Test POST `/courts` - should create court in user's tenant
5. Login as superadmin - virtual context should work

## Expected Behavior Changes

| Before | After |
|--------|-------|
| DB query on every request for tenant membership | No DB query (data from JWT) |
| Frontend must send `X-Tenant-ID` header | No header needed |
| Extracts tenantId from 3 sources | Reads from JWT only |

## Next Steps

After this task, complete:
- **Task 4**: Superadmin tenant selection endpoint
- **Task 5**: Remove frontend `X-Tenant-ID` logic

## Notes

- This eliminates a DB query per request, improving performance
- Tenant context changes require re-login (acceptable since one user = one tenant)
