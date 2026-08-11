# Task 2: JWT Tenant Context Implementation

**Priority**: HIGH
**Status**: COMPLETED ✅
**Estimated Time**: 1-2 hours
**Depends On**: None (can be done in parallel with Task 1)
**Completed**: 2026-08-11

## Problem

Current JWT payload only contains `{ sub: userId, email }`. Backend relies on frontend passing `X-Tenant-ID` header for tenant context, which:
- Violates backend-first principle
- Causes 401 errors when header is missing (e.g., GET requests)
- Requires frontend to explicitly manage tenant context

## Solution

Include tenant context directly in JWT payload for regular users (one user = one tenant).

## User Requirements

- Regular users belong to exactly ONE tenant
- Superadmin doesn't belong to any tenant
- Backend must derive tenant context from JWT, not headers

## Required Changes

### 1. Update Token Generation (auth.service.ts)

**File**: `backend/src/modules/auth/auth.service.ts`

**Change**: Include tenant context in JWT payload for regular users.

**Location**: In `generateTokens()` or `login()` method

```typescript
// After validating credentials, fetch user's single tenant
const tenantMember = await this.prisma.tenantMember.findFirst({
  where: { 
    userId: user.id,
    tenant: { status: 'Active' }
  },
  include: {
    tenant: {
      select: {
        id: true,
        name: true,
        slug: true,
        status: true
      }
    },
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      },
      where: { deletedAt: null }
    }
  }
});

// Extract permissions from roles
const permissions: string[] = [];
tenantMember?.userRoles.forEach((userRole) => {
  userRole.role.rolePermissions.forEach((rp) => {
    permissions.push(rp.permission.slug);
  });
});

// Generate JWT with tenant context
const payload = {
  sub: user.id,
  email: user.email,
  isSuperAdmin: user.isSuperAdmin,
  // For regular users: include tenant context
  tenantContext: user.isSuperAdmin ? null : {
    tenantId: tenantMember!.tenantId,
    tenantMemberId: tenantMember!.id,
    tenant: tenantMember!.tenant,
    permissions
  }
};

return {
  accessToken: this.jwtService.sign(payload),
  refreshToken: // ... existing refresh token logic
};
```

### 2. Update JWT Strategy (jwt.strategy.ts)

**File**: `backend/src/modules/auth/strategies/jwt.strategy.ts`

**Change**: Attach tenant context from JWT to `request.user`

**Location**: In `validate()` method

```typescript
async validate(payload: any) {
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isSuperAdmin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedException('User not found!');
  }

  if (!user.isActive) {
    throw new UnauthorizedException('Account is disabled');
  }

  // Attach tenant context from JWT to user object
  return {
    ...user,
    tenantContext: payload.tenantContext // From JWT, not DB query
  };
}
```

### 3. Define JWT Payload Type (new file)

**File**: `backend/src/modules-auth/interfaces/jwt-payload.interface.ts` (new)

```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  tenantContext?: {
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
}
```

## Verification

After making changes:

1. Clear existing tokens (logout or clear cookies)
2. Login as regular user
3. Decode JWT (use jwt.io or backend logging) - verify `tenantContext` is present
4. Login as superadmin - verify `tenantContext` is null
5. Test API calls - should work without `X-Tenant-ID` header

## Next Steps

After this task, complete:
- **Task 3**: Simplify TenantGuard to read from JWT
- **Task 4**: Superadmin tenant selection

## Notes

- This is a BREAKING CHANGE - existing JWTs will become invalid
- All users will need to re-login after deployment
- No database changes required
