# Task 6: Enable Refresh Token Interceptor

**Priority**: LOW
**Status**: COMPLETED ✅
**Estimated Time**: 30 minutes
**Depends On**: None (can be done independently)
**Completed**: 2026-08-11

## Problem

The frontend's token refresh interceptor is completely commented out (lines 87-185 in `api-client.ts`). When access tokens expire (15 minutes), users get 401 errors and must manually refresh.

## Current State

**File**: `frontend/lib/api/api-client.ts` (lines 90-185)

The entire response interceptor that handles 401 errors and token refresh is commented out.

## Required Changes

### 1. Uncomment Response Interceptor

**File**: `frontend/lib/api/api-client.ts`

**Uncomment** lines 90-185 (the response interceptor):

```typescript
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is not 401 or already retried, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If refresh already failed, reject immediately
    if (refreshState.failed) {
      // Clear auth state and redirect to login
      clearCookie();
      clearSession();

      // Redirect to login (only in browser)
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      return Promise.reject(new ApiError(401, null, "Session expired"));
    }

    // If refresh is in progress, queue this request
    if (refreshState.isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      })
        .then(() => {
          // Retry original request after refresh succeeds
          return axiosInstance(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    // Start refresh process
    refreshState.isRefreshing = true;

    try {
      // Call refresh endpoint
      // Refresh token cookie is sent automatically with withCredentials: true
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
      });

      console.log("REFRESH RESPONSE: ", response);

      if (response.status === 200 && response.data.accessToken) {
        // Update auth state with new token
        setAccessToken(response.data.accessToken);
        updateSession(response.data.accessToken);

        // Mark refresh as successful
        refreshState.isRefreshing = false;
        refreshState.failed = false;

        // Process queued requests
        refreshQueue.forEach((queued) => queued.resolve(true));
        refreshQueue = [];

        // Retry original request with new token
        originalRequest._retry = true;
        return axiosInstance(originalRequest);
      } else {
        throw new Error("Refresh failed");
      }
    } catch (refreshError) {
      // Refresh failed - mark as failed and clear auth state

      console.log(refreshError);
      refreshState.isRefreshing = false;
      refreshState.failed = true;

      // clearCookie();
      // clearSession();

      // Reject all queued requests
      refreshQueue.forEach((queued) =>
        queued.reject(new ApiError(401, null, "Session expired")),
      );
      refreshQueue = [];

      // Redirect to login
      // if (typeof window !== "undefined") {
      //   window.location.href = "/login";
      // }

      return Promise.reject(new ApiError(401, null, "Session expired"));
    }
  },
);
```

### 2. Optional: Uncomment Logout Redirects

The commented-out lines for `clearCookie()`, `clearSession()`, and redirects are commented for debugging. You may want to:

**Option A**: Keep them commented for now (easier debugging)
**Option B**: Uncomment them for production (proper session cleanup)

### 3. Remove Debug Console.log

**File**: `frontend/lib/api/api-client.ts` (line 140)

Remove or replace with proper logging:

```typescript
// DELETE: console.log("REFRESH RESPONSE: ", response);
// REPLACE WITH: (optional)
// logger.info('Token refreshed successfully');
```

## Verification

After making changes:

1. Login as any user
2. Wait 15+ minutes (for access token to expire)
3. Make an API request (e.g., navigate to courts page)
4. Verify:
   - Request initially fails with 401
   - Refresh token endpoint is called automatically
   - New access token is stored
   - Original request is retried with new token
   - UI shows correct data (no error to user)

5. Test with expired refresh token:
   - Clear cookies and login
   - Wait 7+ days (or manually expire refresh token in DB)
   - Make API request
   - Verify redirect to login page

## Expected Behavior

| Before | After |
|--------|-------|
| 401 errors shown to user | 401 triggers automatic refresh |
| User must manually refresh page | Token refresh transparent to user |
| Session expires after 15 min | Session extends via refresh token |

## Known Issues

- The refresh interceptor uses `axios.post` directly instead of `apiClient` to avoid circular dependency
- Refresh state management is in-memory - lost on page refresh (acceptable since cookies persist)

## Related Files

- `backend/src/modules/auth/auth.controller.ts` - `/auth/refresh` endpoint
- `backend/src/modules/auth/strategies/refresh-token.strategy.ts` - Refresh token validation
- `frontend/lib/auth/session-manager.ts` - Session state management
- `frontend/lib/auth/cookie-utils.ts` - Cookie utilities

## Notes

- This is independent of tenant context changes (Tasks 2-5)
- Can be done in parallel with other tasks
- Critical for user experience (prevents frequent logouts)
