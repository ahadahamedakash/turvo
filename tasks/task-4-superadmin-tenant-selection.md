# Task 4: Superadmin Tenant Selection

**Priority**: MEDIUM
**Status**: COMPLETED ✅
**Estimated Time**: 1 hour
**Depends On**: Task 2, Task 3
**Completed**: 2026-08-11

## Problem

Superadmin needs to:
1. View list of all tenants (without selecting a tenant)
2. Select a specific tenant to operate on (for courts, bookings, etc.)
3. Switch between tenants

Current implementation only has virtual "SUPERADMIN" context with no tenant selection.

## Solution

Add tenant selection endpoint and session-based active tenant for superadmin.

## Required Changes

### 1. Add Select Tenant Endpoint (auth.controller.ts)

**File**: `backend/src/modules/auth/auth.controller.ts`

**Add new endpoint**:

```typescript
@Post('select-tenant')
@UseGuards(JwtAuthGuard)
@ApiOperation({
  summary: 'Superadmin selects active tenant',
  description: 'Allows superadmin to select which tenant to operate on. Returns new JWT with tenant context.'
})
@ApiBearerAuth()
@ApiResponse({ status: 200, description: 'Tenant selected successfully' })
@ApiResponse({ status: 400, description: 'Invalid tenant ID' })
@ApiResponse({ status: 403, description: 'Not a superadmin' })
async selectTenant(
  @GetUser('id') userId: string,
  @GetUser('isSuperAdmin') isSuperAdmin: boolean,
  @Body('tenantId') tenantId: string,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
): Promise<AuthResponseDto> {
  // Verify user is superadmin
  if (!isSuperAdmin) {
    throw new ForbiddenException('Only superadmins can select tenants');
  }

  // Validate tenant exists and is active
  const tenant = await this.authService.validateTenantForSuperadmin(tenantId);
  
  if (!tenant) {
    throw new BadRequestException('Invalid or inactive tenant');
  }

  // Get tenant context with all permissions
  const tenantContext = await this.authService.getTenantContextForSuperadmin(tenantId);

  // Generate new JWT with tenant context
  const authResponse = await this.authService.generateTokensForSuperadmin(
    req.user.id,
    req.user.email,
    tenantContext
  );

  // Set new tokens as cookies
  setAuthCookies(
    res,
    this.configService,
    authResponse.accessToken,
    authResponse.refreshToken,
  );

  return authResponse;
}
```

### 2. Add Get Tenants Endpoint (auth.controller.ts or tenants.controller.ts)

**File**: `backend/src/modules/auth/auth.controller.ts`

**Add new endpoint**:

```typescript
@Get('tenants')
@UseGuards(JwtAuthGuard)
@ApiOperation({
  summary: 'Get all tenants (superadmin only)',
  description: 'Returns a list of all tenants. Only accessible by superadmins.'
})
@ApiBearerAuth()
@ApiResponse({ status: 200, description: 'List of tenants' })
@ApiResponse({ status: 403, description: 'Not a superadmin' })
async getTenants(
  @GetUser('isSuperAdmin') isSuperAdmin: boolean,
): Promise<any> {
  if (!isSuperAdmin) {
    throw new ForbiddenException('Only superadmins can view all tenants');
  }

  return this.authService.getAllTenants();
}
```

### 3. Add Auth Service Methods (auth.service.ts)

**File**: `backend/src/modules/auth/auth.service.ts`

**Add methods**:

```typescript
// Validate tenant for superadmin selection
async validateTenantForSuperadmin(tenantId: string): Promise<any> {
  return this.prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    }
  });
}

// Get tenant context for superadmin (with all permissions)
async getTenantContextForSuperadmin(tenantId: string): Promise<any> {
  const tenant = await this.prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    }
  });

  if (!tenant || tenant.status !== 'Active') {
    return null;
  }

  return {
    tenantId: tenant.id,
    tenantMemberId: 'SUPERADMIN',
    tenant,
    permissions: ['*.all'] // Superadmin has all permissions
  };
}

// Generate tokens for superadmin with tenant context
async generateTokensForSuperadmin(
  userId: string,
  email: string,
  tenantContext: any
): Promise<AuthResponseDto> {
  const payload = {
    sub: userId,
    email,
    isSuperAdmin: true,
    tenantContext // Includes selected tenant or null for virtual context
  };

  const accessToken = this.jwtService.sign(payload, {
    expiresIn: this.configService.get('JWT_EXPIRY') || '15m',
  });

  const refreshToken = await this.generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    user: { id: userId, email },
    tenants: null // Superadmin doesn't have tenant memberships
  };
}

// Get all tenants for superadmin
async getAllTenants(): Promise<any> {
  return this.prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          tenantMembers: true,
          courts: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });
}
```

### 4. Update TenantGuard for Superadmin (tenant.guard.ts)

**File**: `backend/src/common/guard/tenant.guard.ts`

**Update** superadmin section to handle tenant context from JWT:

```typescript
// Superadmin: handle tenant selection
if (user.isSuperAdmin) {
  // If JWT contains tenant context, use it
  if (user.tenantContext) {
    request.tenantContext = user.tenantContext;
  } else {
    // Virtual context for tenant list operations
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
      permissions: ['*.all'],
    };
  }
  return true;
}
```

## Frontend Changes (Optional - Separate Task)

**File**: `frontend/hooks/useSuperAdminTenant.ts` (new)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';

export function useSuperAdminTenant() {
  const queryClient = useQueryClient();

  const { data: tenants } = useQuery({
    queryKey: ['superadmin', 'tenants'],
    queryFn: () => apiClient.get('/auth/tenants'),
    enabled: false // Only fetch when needed
  });

  const selectTenant = useMutation({
    mutationFn: (tenantId: string) =>
      apiClient.post('/auth/select-tenant', { tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const deselectTenant = useMutation({
    mutationFn: () =>
      apiClient.post('/auth/logout'), // Then login again as superadmin
  });

  return {
    tenants,
    selectTenant,
    deselectTenant,
  };
}
```

## Verification

After making changes:

1. Login as superadmin
2. Call GET `/auth/tenants` - should return all tenants
3. Call POST `/auth/select-tenant` with tenantId - should return new JWT with tenant context
4. Call GET `/courts` - should return courts for selected tenant
5. Logout and login as superadmin again - should have virtual context

## API Changes

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/auth/tenants` | GET | List all tenants | Superadmin only |
| `/auth/select-tenant` | POST | Select active tenant | Superadmin only |

## Next Steps

After this task, complete:
- **Task 5**: Remove frontend `X-Tenant-ID` header logic
- **Task 6**: Add superadmin tenant selector UI (frontend)

## Notes

- Superadmin tenant selection issues a new JWT (not session-based)
- To deselect tenant, superadmin must logout and login again
- Consider adding a "deselect-tenant" endpoint if frequent switching is needed
