# Task 1: Extend Type Definitions

## Context

The frontend needs TypeScript types for the tenant selection feature. These types will be used across the API client, hooks, and components.

## Changes

### File: `frontend/lib/types/user.ts`

Add the following type definitions:

```typescript
/**
 * Tenant option for superadmin dropdown
 */
export interface TenantOption {
  id: string;
  name: string;
  slug: string;
  status: 'Active' | 'Inactive' | 'Suspended';
}

/**
 * Request payload for selecting a tenant
 */
export interface SelectTenantDto {
  tenantId: string;
}

/**
 * Response from tenant selection endpoint
 */
export interface SelectTenantResponse {
  accessToken: string;
  refreshToken: string;
}
```

## Why This Type Structure

- `TenantOption`: Represents a tenant in the dropdown list (from `GET /auth/tenants`)
- `SelectTenantDto`: Request payload for `POST /auth/select-tenant`
- `SelectTenantResponse`: Response containing new tokens after tenant switch

## Dependencies

None - this is a foundational task

## Verification

```typescript
// Test that types compile correctly
import type { TenantOption, SelectTenantDto, SelectTenantResponse } from '@/lib/types/user';

const tenant: TenantOption = {
  id: '123',
  name: 'Test Turf',
  slug: 'test-turf',
  status: 'Active',
};

const dto: SelectTenantDto = { tenantId: '123' };
```

## Completion Criteria

- [ ] Types added to `frontend/lib/types/user.ts`
- [ ] TypeScript compilation succeeds (`npm run type-check`)
