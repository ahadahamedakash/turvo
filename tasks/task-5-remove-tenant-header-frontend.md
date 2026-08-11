# Task 5: Remove X-Tenant-ID Header from Frontend

**Priority**: LOW
**Status**: COMPLETED ✅
**Estimated Time**: 15 minutes
**Depends On**: Task 2, Task 3 (Backend must read tenant from JWT first)
**Completed**: 2026-08-11

## Problem

Frontend is sending `X-Tenant-ID` header, but after Tasks 2-3, backend derives tenant context from JWT. This header is now unnecessary and should be removed.

## Required Changes

### 1. Update API Client (api-client.ts)

**File**: `frontend/lib/api/api-client.ts`

**Remove** lines 75-79:

```typescript
// DELETE THESE LINES:
// Add X-Tenant-ID header if tenantId is in request data
// This is required by TenantGuard which expects tenantId in URL, query, or header
if (config.data?.tenantId && config.headers) {
  config.headers["X-Tenant-ID"] = config.data.tenantId;
}
```

**Result**: Request interceptor should only set Authorization header:

```typescript
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);
```

### 2. Verify No Other References

**Search** for `X-Tenant-ID` or `x-tenant-id` in frontend codebase:

```bash
cd frontend
grep -r "X-Tenant-ID" --include="*.ts" --include="*.tsx"
grep -r "x-tenant-id" --include="*.ts" --include="*.tsx"
```

**Remove** any other references found.

## Verification

After making changes:

1. Start frontend: `cd frontend && npm run dev`
2. Login as regular user
3. Navigate to courts page
4. Check browser Network tab - requests should NOT have `X-Tenant-ID` header
5. Verify courts load correctly (using tenant from JWT)
6. Test other modules (tenants, bookings) - all should work

## Expected Changes

| Before | After |
|--------|-------|
| Request headers: `Authorization: Bearer <token>`, `X-Tenant-ID: <uuid>` | Request headers: `Authorization: Bearer <token>` only |
| Frontend manages tenant context | Frontend only manages auth token |
| Backend reads from header | Backend reads from JWT |

## Related Files

- `frontend/lib/api/api-client.ts` - Main API client
- `frontend/lib/auth/cookie-utils.ts` - Token storage
- `frontend/lib/auth/session-manager.ts` - Session management

## Notes

- This is a cleanup task after backend changes are complete
- No functionality changes - just removing unnecessary code
- Can be done in parallel with Task 6 (frontend UI)
