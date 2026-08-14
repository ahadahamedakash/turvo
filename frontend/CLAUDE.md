# Turvo Frontend - Next.js Architecture

## Overview

Multi-tenant turf booking platform dashboard built with Next.js 16, React 19, and Tailwind CSS v4.

**Tech Stack**:
- Next.js 16 with App Router
- React 19
- Tailwind CSS v4
- shadcn/ui components
- TanStack Query (React Query) for data fetching
- Axios for API calls

---

## Current Work: Auth & Tenant Isolation Fix

### In Progress Tasks

See `/tasks/` directory for full details. Frontend-specific tasks:

| Task | File | Status | Change |
|------|------|--------|--------|
| Task 5 | `lib/api/api-client.ts` | PENDING | Remove `X-Tenant-ID` header logic |
| Task 6 | `lib/api/api-client.ts` | PENDING | Enable refresh token interceptor |

### Architecture Changes

**Current State**:
```typescript
// Frontend sends: Authorization + X-Tenant-ID headers
// Refresh interceptor: commented out
```

**Target State**:
```typescript
// Frontend sends: Authorization header only
// Refresh interceptor: enabled
```

---

---

## Completed Work: Slots Module UI (August 2026)

### Status: ✅ Complete

Admin slot management at `/dashboard/slots` (sidebar: "Time Slots").

**Files**:
- `app/dashboard/slots/page.tsx` — stats, filters, table, dialogs, settings card
- `components/dashboard/slots/` — `slots-data-table.tsx`, `generate-slots-dialog.tsx` ("Open for Booking"), `block-slot-dialog.tsx` ("Close Slot"), `cleanup-slots-dialog.tsx`, `slot-status-badge.tsx`, `slot-settings-card.tsx` (auto-pilot toggle, weekend-day chips, holidays manager)
- `hooks/slots.ts` — key-factory pattern (`slotKeys`), invalidation in hooks, toasts via `mutate(..., { onSuccess, onError })` in components
- `lib/api/slots.ts`, `lib/types/slot.ts`, `lib/schemas/slot.ts`

**Conventions established by this module (follow for new dialogs)**:
- **React Hook Form + zodResolver** with the `components/forms/` helpers (`RHFInput`, `RHFSelect`, `RHFTextarea`) — the documented standard. The older pricing dialog's plain-useState pattern is the outlier; don't copy it.
- **Never call `new Date()`/`Date.now()` during render** (react-hooks/purity rule). Compute default dates at module scope or in event handlers.
- `Slot.price` is typed `string` — the backend serializes Prisma `Decimal` to a JSON string; format with `Number(price).toLocaleString()`.
- Generate dialog: quick-range presets (7/30/90 days), "All courts" sentinel (`"all"` → `courtId: undefined` on submit).

## Project Structure

```
frontend/
├── app/
│   ├── (auth)/           # Auth routes (login, register)
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── tenants/      # Tenant management
│   │   ├── courts/       # Courts management
│   │   └── ...
│   └── api/              # API routes (if any)
├── components/
│   ├── dashboard/        # Dashboard-specific components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── hooks/                # Custom React hooks
├── lib/
│   ├── api/              # API client and module-specific APIs
│   ├── auth/             # Auth utilities (cookies, session)
│   └── types/            # TypeScript types
└── middleware.ts         # Next.js middleware for route protection
```

---

## API Layer

### Base API Client

**File**: `lib/api/api-client.ts`

```typescript
export const apiClient = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
}
```

### Module-Specific APIs

Pattern: One API file per backend module

```typescript
// lib/api/courts.ts
export const courtsApi = {
  list(params?: QueryParams): Promise<CourtListResponse>
  get(id: string): Promise<CourtResponse>
  create(data: CreateCourtDto): Promise<CourtResponse>
  update(id: string, data: UpdateCourtDto): Promise<CourtResponse>
  delete(id: string): Promise<void>
}
```

### Type Definitions

Pattern: Types mirror backend DTOs

```typescript
// lib/types/court.ts
export interface Court {
  id: string;
  name: string;
  description: string | null;
  status: CourtStatus;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Data Fetching

### React Query Hooks

Pattern: One hook file per module

```typescript
// hooks/courts.ts
export function useCourts(params?: QueryParams) {
  return useQuery({
    queryKey: ['courts', params],
    queryFn: () => courtsApi.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCourt(id: string) {
  return useQuery({
    queryKey: ['court', id],
    queryFn: () => courtsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCourt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourtDto) => courtsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courts'] });
    },
  });
}
```

---

## Authentication

### Token Storage

- **Access Token**: Cookie (`access_token`), NOT HttpOnly (readable by JS)
- **Refresh Token**: HttpOnly cookie (set by backend, not accessible by JS)

### Auth Flow

1. **Login**: POST to `/auth/login` → tokens set as cookies → access token stored in-memory
2. **API Calls**: Authorization header from in-memory token
3. **Token Refresh**: Automatic via interceptor (when enabled)
4. **Logout**: POST to `/auth/logout` → cookies cleared → session cleared

### Session Manager

**File**: `lib/auth/session-manager.ts`

```typescript
export function establishSession(accessToken: string)
export function updateSession(accessToken: string)
export function clearSession()
```

---

## Middleware

**File**: `middleware.ts`

- Validates JWT on protected routes
- Redirects unauthenticated users to `/login`
- Prevents authenticated users from accessing auth pages

---

## UI Components

### Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
<Sidebar>
  <Navigation />
</Sidebar>
<Header>
  <UserMenu />
  <TenantSelector /> {/* For superadmin */}
</Header>
<main>{children}</main>
```

### Component Patterns

- **Form Components**: Use React Hook Form + Zod validation
- **Data Tables**: Sortable, filterable tables with actions
- **Dialogs**: shadcn/ui Dialog for create/edit forms
- **Loading States**: React Query `isLoading` for async operations

---

## Design System

### Color Palette

Utilitarian, professional dashboard aesthetic. Avoid saturated defaults.

### Spacing

Use Tailwind spacing scale consistently:
- `gap-4` for component spacing
- `p-6` for card padding
- `space-y-4` for vertical stacking

### Typography

- **Headers**: `text-xl font-semibold` for page titles
- **Body**: `text-sm` for data, `text-base` for forms
- **Labels**: `text-xs uppercase tracking-wide` for field labels

---

## Development Commands

```bash
# Development server
npm run dev              # Start Next.js dev server

# Building
npm run build            # Production build
npm run start            # Start production server

# Linting
npm run lint             # ESLint
npm run format           # Prettier

# Type checking
npm run type-check       # TypeScript type checking
```

---

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

---

## Known Issues & TODO

1. **Refresh Interceptor**: Currently commented out, needs to be enabled (Task 6)
2. **X-Tenant-ID Header**: Needs to be removed after backend JWT changes (Task 5)
3. **Type Generation**: Consider generating types from Swagger instead of manual duplication
4. **Superadmin Tenant Selector**: UI needs to be built for Task 4
5. **Hook Standardization**: Ensure all modules follow the same hook pattern

---

## Module Status

| Module | Backend | Frontend | Status |
|--------|---------|----------|--------|
| Auth | ✅ | ✅ | Complete |
| Tenants | ✅ | ✅ | Complete |
| Courts | ✅ | ✅ | Complete (incl. slot-length config) |
| Pricing Rules | ✅ | ✅ | Complete |
| Slots | ✅ | ✅ | Complete (generation, auto-pilot, holidays, settings) |
| Bookings | ❌ | ❌ | Not started (consumes slots; 2h booking = 2 consecutive slots) |
| Payments | ❌ | ❌ | Not started |
| Customers | ❌ | ❌ | Not started |
| Invitations | ✅ | ✅ | Complete |

Legend: ✅ Complete, 🔄 In Progress, ❌ Not Started
