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
- **`useWatch({ control })`, never `form.watch()`, to read values during render** — the react-hooks compiler lint flags `form.watch` (bookings dialogs follow this).
- **Mount dialogs keyed per open** (parent conditionally renders `<Dialog key={…} open …>`) so form state starts clean — no reset effects, no stale-field leaks (bookings create/cancel/record-payment dialogs).
- **Never call `new Date()`/`Date.now()` during render** (react-hooks/purity rule). Compute default dates at module scope or in event handlers.
- `Slot.price` is typed `string` — the backend serializes Prisma `Decimal` to a JSON string; format with `Number(price).toLocaleString()`.
- Generate dialog: quick-range presets (7/30/90 days), "All courts" sentinel (`"all"` → `courtId: undefined` on submit`).

---

## Completed Work: Slot Operating Hours Feature (August 2026)

### Status: ✅ Complete

Court-level operating hours UI to constrain slot generation and improve user experience.

**Problem Solved**: Users can now set operating hours per court, and pricing rules validate against these hours to prevent creating slots for times when the venue is closed.

### Type Updates (`lib/types/court.ts`)

```typescript
export interface Court {
  // ... existing fields
  openingTime: string | null;
  closingTime: string | null;
}

export interface CreateCourtDto {
  // ... existing fields
  openingTime?: string;
  closingTime?: string;
}

export interface UpdateCourtDto {
  // ... existing fields
  openingTime?: string;
  closingTime?: string;
}
```

### Court Dialog (`components/dashboard/courts/court-dialog.tsx`)

**Operating Hours Section**:
- Two time input fields (opening/closing) with default values: 06:00 and 23:59
- Helper text: "Slots will only be generated within these hours. Default is 6 AM - 11:59 PM."
- Quick preset buttons:
  - **All Day (6AM-12AM)** - 06:00 to 23:59
  - **Standard (9AM-10PM)** - 09:00 to 22:00
  - **Extended (8AM-12AM)** - 08:00 to 00:00
- Positioned between Slot Interval and Status fields

**Form State**:
```typescript
interface CourtFormState {
  name: string;
  description: string;
  status: CourtStatus | "";
  slotIntervalMinutes: number;
  openingTime: string;    // NEW
  closingTime: string;    // NEW
}
```

### Pricing Dialog (`components/dashboard/pricing/pricing-rule-dialog.tsx`)

**Court Hours Display**:
- Info card shows selected court's operating hours after court selection
- Visual indicator with `Building2` icon and formatted time range
- Helper text: "Pricing time range must be within court operating hours"

**Time Validation Warning**:
- Shows after preset buttons in Time Range section
- Amber `AlertCircle` icon when times are outside court hours
- Green `CheckCircle` icon when times are within court hours
- Real-time validation as user changes times

**Form Validation** (`validateForm()`):
```typescript
// Validate against court operating hours
if (courtHours?.openingTime && courtHours?.closingTime) {
  const courtOpen = parseTime(courtHours.openingTime);
  const courtClose = parseTime(courtHours.closingTime);

  // Treat midnight closing as 24:00
  const effectiveClose = courtHours.closingTime === "00:00" ? 1440 : courtClose;

  if (start < courtOpen || end > effectiveClose) {
    newErrors.endTime =
      `Time range must be within court hours (${courtHours.openingTime} - ${courtHours.closingTime})`;
  }
}
```

### Updated Time Presets

**Before**:
- Morning (6AM-12PM)
- Evening (12PM-6PM)
- Night (6PM-12AM)

**After**:
- Morning (9AM-12PM)
- Afternoon (12PM-5PM)
- Evening (5PM-10PM)
- Full Day (9AM-11PM)

**Default Form State**:
- Changed `endTime` from "18:00" to "23:00" for more practical default

### Files Modified
- `lib/types/court.ts` — Added openingTime/closingTime to interfaces
- `components/dashboard/courts/court-dialog.tsx` — Operating hours UI section
- `components/dashboard/pricing/pricing-rule-dialog.tsx` — Court hours display + validation + updated presets

**See also**: `tasks/slot-operating-hours/` for detailed implementation guides.

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
| Bookings | ✅ | ✅ | Complete (day-view calendar, create dialog, detail sheet, list; see `tasks/booking/`) |
| Payments | 🔄 | ✅ | Cash recording via bookings done; full ledger module not started |
| Customers | ✅ | ✅ | Complete for booking typeahead scope; full CRUD deferred |
| Invitations | ✅ | ✅ | Complete |

Legend: ✅ Complete, 🔄 In Progress, ❌ Not Started
