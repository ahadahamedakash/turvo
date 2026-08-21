# Task 3: Extend Auth API Client

## Context

The backend has two endpoints for tenant selection:
- `GET /auth/tenants` - Returns list of all tenants (superadmin only)
- `POST /auth/select-tenant` - Accepts `{ tenantId }`, returns new JWT with tenant context

The frontend API client needs methods to call these endpoints.

## Current State

**File**: `frontend/lib/api/api-client.ts`

```typescript
export const authApi = {
  async login(email: string, password: string) { ... },
  async logout() { ... },
  async getMe() { ... },
};
```

## Changes

### File: `frontend/lib/api/api-client.ts`

Add two new methods to the `authApi` object:

```typescript
export const authApi = {
  // ... existing methods (login, logout, getMe)

  /**
   * Get all available tenants (superadmin only)
   * Returns array of tenants with id, name, slug, status
   */
  async getTenants() {
    const response = await axiosInstance.get<{
      tenants: Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
      }>;
    }>("/auth/tenants");
    return response.data.tenants;
  },

  /**
   * Select a tenant and get new JWT with tenant context
   * Backend validates tenant is Active and returns new tokens
   */
  async selectTenant(tenantId: string) {
    const response = await axiosInstance.post<{
      accessToken: string;
      refreshToken: string;
    }>("/auth/select-tenant", { tenantId });
    return response.data;
  },
};
```

## Backend API Reference

**File**: `backend/src/modules/auth/auth.controller.ts`

```typescript
@Get('tenants')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
async getTenants(@GetUser('id') userId: string) {
  // Returns all tenants (id, name, slug, status)
}

@Post('select-tenant')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
async selectTenant(
  @GetUser('isSuperAdmin') isSuperAdmin: boolean,
  @Body('tenantId') tenantId: string,
) {
  // Returns { accessToken, refreshToken }
}
```

## Dependencies

- Task 1: Type definitions (`SelectTenantResponse` type exists, though not strictly needed here)

## Completion Criteria

- [ ] `getTenants()` method added to `authApi`
- [ ] `selectTenant()` method added to `authApi`
- [ ] TypeScript compilation succeeds
- [ ] Manual test: Call methods from browser console (when authenticated as superadmin)

## Manual Testing

```javascript
// In browser console (authenticated as superadmin):
import { authApi } from '@/lib/api/api-client';

// Test getTenants
const tenants = await authApi.getTenants();
console.log(tenants); // Should show array of tenants

// Test selectTenant (replace with actual tenant ID)
const result = await authApi.selectTenant('tenant-id-here');
console.log(result); // Should show { accessToken, refreshToken }
```
