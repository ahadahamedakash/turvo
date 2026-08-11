# Task 1: Critical Fix - Courts Controller Missing PermissionGuard

**Priority**: CRITICAL
**Status**: COMPLETED ✅
**Estimated Time**: 5 minutes
**Completed**: 2026-08-11

## Problem

The courts controller is using `@RequirePermissions()` decorators but `PermissionGuard` is missing from the guard chain. This causes permission checks to fail silently or behave unexpectedly.

## Current State

**File**: `backend/src/modules/courts/courts.controller.ts` (line 45)

```typescript
@UseGuards(JwtAuthGuard, TenantGuard)  // PermissionGuard is MISSING
export class CourtsController {
  // ...
  @Post()
  @RequirePermissions('Court.create')  // Permission decorator used
  async create(...) { }
}
```

## Required Changes

### 1. Update Guard Chain

**File**: `backend/src/modules/courts/courts.controller.ts`

```typescript
// Line 45 - BEFORE:
@UseGuards(JwtAuthGuard, TenantGuard)

// Line 45 - AFTER:
@UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard)
```

### 2. Update Import Statement

**File**: `backend/src/modules/courts/courts.controller.ts`

```typescript
// Lines 28-30 - BEFORE:
import {
  TenantGuard,
  RequirePermissions,
} from '@src/common/guard/tenant.guard';

// Lines 28-31 - AFTER:
import {
  TenantGuard,
  RequirePermissions,
  PermissionGuard,
} from '@src/common/guard/tenant.guard';
```

## Verification

After making changes, verify:

1. Start backend: `cd backend && npm run start:dev`
2. Test courts endpoints with different permission levels:
   - User without `Court.create` permission → 403 on POST `/courts`
   - User with `Court.create` permission → 201 on POST `/courts`
3. Check Swagger UI at `http://localhost:3001/api` to ensure docs load correctly

## Related Files

- `backend/src/common/guard/tenant.guard.ts` - Contains `PermissionGuard` implementation
- `backend/src/modules/courts/dto/create-court.dto.ts` - Create court DTO
- `backend/src/modules/courts/courts.service.ts` - Courts business logic

## Notes

This is a quick fix that resolves immediate permission check issues. The broader tenant context architecture fix is covered in subsequent tasks.
