# Tenant Selection Feature - Implementation Tasks

## Overview

Implement a global organization dropdown for superadmin users to switch between tenants. Regular users will see their organization name as a static label.

## Task Dependency Graph

```
Task 1 (Type Definitions)
    ↓
Task 2 (JWT Types)          Task 3 (API Client)
    ↓                           ↓
    └────────→ Task 4 (Hook) ←────┘
                    ↓
              Task 5 (UserContext)
                    ↓
              Task 6 (Dashboard Header)
```

## Tasks

| Task | File | Description | Status |
|------|------|-------------|--------|
| [Task 1](./task-1-type-definitions.md) | `lib/types/user.ts` | Add TypeScript types for tenant selection | Pending |
| [Task 2](./task-2-jwt-types.md) | `lib/jwt.ts` | Extend JWT payload to include tenant object | Pending |
| [Task 3](./task-3-api-client.md) | `lib/api/api-client.ts` | Add `getTenants()` and `selectTenant()` methods | Pending |
| [Task 4](./task-4-tenant-selection-hook.md) | `hooks/use-tenant-selection.ts` | Create new hook file for tenant queries/mutations | Pending |
| [Task 5](./task-5-extend-user-context.md) | `contexts/user-context.tsx` | Extend UserContext with tenant state and methods | Pending |
| [Task 6](./task-6-dashboard-header.md) | `components/dashboard/dashboard-header.tsx` | Replace static dropdown with interactive tenant selector | Pending |

## Implementation Order

1. **Task 1** - Type definitions (foundational, no dependencies)
2. **Task 2** - JWT types (depends on nothing)
3. **Task 3** - API client (depends on Task 1 types, optional)
4. **Task 4** - Tenant selection hook (depends on Tasks 1, 2, 3)
5. **Task 5** - Extend UserContext (depends on Tasks 1, 2, 3)
6. **Task 6** - Dashboard header UI (depends on all previous tasks)

## Backend API (Already Implemented)

The backend already has the required endpoints:

- `GET /auth/tenants` - Returns all tenants (superadmin only)
- `POST /auth/select-tenant` - Returns new JWT with selected tenant context

## Verification

See [TESTING.md](./TESTING.md) for comprehensive testing guide.
