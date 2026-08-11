# Turvo Implementation Tasks

This directory contains detailed implementation guides for fixing the auth and tenant isolation architecture.

## Overview

**Problem**: Backend relies on frontend passing `X-Tenant-ID` header, causing 401 errors and violating the backend-first principle.

**Solution**: Include tenant context directly in JWT payload, so backend derives tenant information from the token itself.

## Task Files

| File | Priority | Est. Time | Description |
|------|----------|-----------|-------------|
| [task-1-critical-fix-courts-controller.md](./task-1-critical-fix-courts-controller.md) | CRITICAL | 5 min | Add missing `PermissionGuard` to courts controller |
| [task-2-jwt-tenant-context.md](./task-2-jwt-tenant-context.md) | HIGH | 1-2 hr | Include tenant context in JWT payload |
| [task-3-simplify-tenant-guard.md](./task-3-simplify-tenant-guard.md) | HIGH | 30 min | Simplify TenantGuard to read from JWT |
| [task-4-superadmin-tenant-selection.md](./task-4-superadmin-tenant-selection.md) | MEDIUM | 1 hr | Add superadmin tenant selection endpoints |
| [task-5-remove-tenant-header-frontend.md](./task-5-remove-tenant-header-frontend.md) | LOW | 15 min | Remove `X-Tenant-ID` header from frontend |
| [task-6-enable-refresh-token-interceptor.md](./task-6-enable-refresh-token-interceptor.md) | LOW | 30 min | Enable refresh token interceptor |

## Dependencies

```
Task 1 (Independent)
     ↓
Task 2 → Task 3 → Task 4 → Task 5
                    ↓
                Task 6 (Independent)
```

## Execution Order

**Quick Path** (Fix immediate issues):
1. Task 1 - Fix courts controller (5 min)
2. Task 6 - Enable refresh interceptor (30 min)

**Complete Path** (Full architecture fix):
1. Task 1 - Fix courts controller
2. Task 2 - JWT tenant context
3. Task 3 - Simplify TenantGuard
4. Task 4 - Superadmin tenant selection
5. Task 5 - Remove frontend header
6. Task 6 - Enable refresh interceptor

## Status

- **Overall**: COMPLETED ✅
- **Completed**: 6/6 tasks (All tasks completed)
- **Blocked**: None

## Notes

- Each task file contains specific code changes and verification steps
- Tasks are designed to be done independently where possible
- Mark tasks as complete in the status section as you finish them
