# Task 2: Extend JWT Types

## Context

The backend JWT payload includes full tenant info (`id`, `name`, `slug`, `status`) in the `tenantContext.tenant` object. The frontend JWT type needs to reflect this to display the current tenant name in the header.

## Current State

**File**: `frontend/lib/jwt.ts`

```typescript
export interface JWTPayload {
  // ...
  tenantContext?: {
    tenantId: string;
    tenantMemberId: string;
    permissions: string[];
  };
  // ...
}
```

## Changes

### File: `frontend/lib/jwt.ts`

Update the `tenantContext` interface to include the full tenant object:

```typescript
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  tenantContext?: {
    tenantId: string;
    tenantMemberId: string;
    tenant?: {           // ADD THIS - full tenant info
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    permissions: string[];
  };
  iat?: number;
  exp?: number;
}
```

## Why This Change

- The backend already sends `tenantContext.tenant` with `id`, `name`, `slug`, `status`
- Frontend needs access to `name` to display current tenant in header
- Making it optional (`tenant?`) maintains compatibility for JWTs without tenant context

## Backend Reference

**File**: `backend/src/modules/auth/interfaces/jwt-payload.interface.ts`

```typescript
export interface JwtPayload {
  // ...
  tenantContext?: {
    tenantId: string;
    tenantMemberId: string;
    tenant: { id, name, slug, status };
    permissions: string[];
  };
  // ...
}
```

## Completion Criteria

- [ ] `tenant?` object added to `tenantContext` type
- [ ] TypeScript compilation succeeds (`npm run type-check`)
