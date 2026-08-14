# Turvo - Multi-Tenant Turf Booking SaaS

## Overview

Turvo is a multi-tenant turf booking platform built with:

- **Backend**: NestJS + Prisma ORM + NeonDB (PostgreSQL)
- **Frontend**: Next.js 16 + Tailwind CSS v4 + shadcn/ui components
- **Documentation**: Swagger/OpenAPI for backend API

**Monorepo Structure**:

```
/backend  - NestJS backend (port 5000)
/frontend - Next.js frontend (port 3000)
```

---

## Architecture & Module Boundaries

### Core Modules

| Module          | Scope                                        | Key Models                                                 |
| --------------- | -------------------------------------------- | ---------------------------------------------------------- |
| **Auth**        | JWT-based authentication with refresh tokens | `User`, `RefreshToken`                                     |
| **Tenants**     | Multi-tenant organization management         | `Tenant`, `TenantMember`                                   |
| **RBAC**        | Role-based access control                    | `Role`, `Permission`, `RolePermission`, `UserRole`        |
| **Courts**      | Physical venue/court management              | `Court`, `CourtStatus`                                     |
| **Pricing**     | Time-based pricing rules                     | `PricingRule`, `DayType`                                   |
| **Slots**       | Time slot generation & availability          | `Slot`, `SlotStatus`                                       |
| **Bookings**    | Booking lifecycle & state management         | `Booking`, `BookingStatus`, `BookingEvent`                 |
| **Payments**    | Payment tracking (manual entry)              | `Payment`, `PaymentType`, `PaymentMethod`, `PaymentStatus` |
| **Customers**   | Customer management per tenant               | `Customer` (optional `User` linkage)                       |
| **Invitations** | Team member onboarding via email             | `Invitation`, `InvitationStatus`                           |
| **Audit**       | Comprehensive audit trail                    | `AuditLog`                                                 |

### Tenant Isolation Model (NON-NEGOTIABLE)

**Every query must be tenant-scoped.** The schema enforces tenancy through:

- `tenantId` column on all tenant-scoped models (except RBAC base models)
- Unique constraints including `tenantId` (e.g., `@@unique([tenantId, name])` on courts)
- Session-based tenant context (decorator/guard pattern)

**Rule**: Never use ad-hoc `WHERE tenantId = ?` as a substitute for proper session-scoped queries. All tenant-scoped queries must work through a tenant context that's:

1. Extracted from the JWT/session during authentication
2. Made available through a decorator (e.g., `@TenantContext()`)
3. Applied consistently at the repository/service layer

**Critical**: RLS (Row-Level Security) is not currently implemented at the database level. Tenant isolation MUST be enforced at the application layer. RLS policies MUST be added before production deployment.

---

## Data Lifecycle Invariants

### Booking Lifecycle

```
Slot: Available → Held (optional, during payment) → Booked
Booking: Pending → Confirmed → Completed | Cancelled | NoShow
```

**Rules**:

1. **Slot hold window**: When a customer starts booking, the slot can be marked `Held` with `heldUntil` timeout. If payment/booking isn't completed within the window, the hold expires.
2. **No duplicate slots**: `@@unique([courtId, date, startTime])` prevents double-booking.
3. **Booking creates events**: Every booking state change MUST write a `BookingEvent` record in the same transaction.

### Payment Flow

```
PaymentType: Advance | Due | Refund
PaymentMethod: Cash
PaymentGateway: (nullable as this will for version 2) SSLCommerz | Bkash | Nagad | Stripe | Manual
```

**Rules**:

1. **Manual entry only**: No live payment gateway integration yet. `issuedBy` tracks which tenant staff recorded the payment.
2. **Bkash transactions**: If `PaymentMethod` is `MobileBanking` with `PaymentGateway` = `Bkash`, the `transactionId` field MUST be populated.
3. **Audit trail**: All payment mutations (create/update/refund) must write `AuditLog` + `BookingEvent` in the same transaction.

### Invitation Flow

```
InvitationStatus: Pending → Accepted | Revoked | Expired
```

**Rules**:

1. **One pending invite per email**: The schema has an index but the true constraint requires a partial unique index on `(tenantId, email)` WHERE `status = 'Pending'` - this is a known technical debt that must be resolved.
2. **Token-based acceptance**: Invitations contain a unique `token` for email-based acceptance.
3. **Revocation tracking**: Both `invitedBy` and `revokedBy` (nullable) track who issued/revoked the invitation.
4. **Race condition**: Accepting an invitation must atomically:
   - Create `TenantMember`
   - Create appropriate `UserRole` entries
   - Mark `Invitation` as `Accepted`
   - All in ONE transaction with proper isolation level

### RBAC: Role Permissions Lifecycle

**Hard Delete Pattern**:

The `RolePermission` junction table uses **hard delete** (not soft-delete):

```
RolePermission: Created via PUT /permissions/roles/:roleId
               Deleted via PUT /permissions/roles/:roleId (permissionIds excludes removed IDs)
```

**Rules**:

1. **Junction table hard delete**: `RolePermission` has NO `deletedAt` field. Removing a permission = `DELETE` from DB.
2. **Atomic updates**: `updateRolePermissions()` runs in a transaction:
   - Calculate `toAdd` (permissionIds not in current role permissions)
   - Calculate `toDelete` (current role permissions not in permissionIds)
   - `createMany()` for additions
   - `deleteMany()` for removals
3. **No soft-delete filtering**: Queries for `rolePermissions` MUST NOT filter by `deletedAt: null`

**Schema**:
```prisma
model RolePermission {
    id           String     @id @default(uuid()) @db.Uuid
    roleId       String     @db.Uuid
    permissionId String     @db.Uuid
    createdAt    DateTime   @default(now())
    updatedAt    DateTime   @updatedAt

    @@unique([roleId, permissionId])
    @@map("role_permissions")
}
```

---

## Development Standards (REQUIRED)

### 1. Code Quality Rules

| Rule                          | Description                                                                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Explicit > Clever**         | Prefer readable, explicit code over clever abstractions. This codebase will be maintained by others who didn't write it.                                                                             |
| **No silent TODOs**           | If something is deferred, explicitly comment with the reason. No "TODO and move on."                                                                                                                 |
| **Component splitting**       | Consider splitting components at ~150 lines, but follow industry best practices — don't split blindly. Cohesion > arbitrary line counts.                                                             |
| **Transaction boundaries**    | Any state-changing operation (financial or access-control) MUST write audit/event records in the SAME transaction as the mutation.                                                                   |
| **Race condition protection** | Use DB-level guarantees (conditional updates, unique/partial-unique indexes, or proper transactions) for slot holds, booking creation, invitation acceptance. No check-then-act in application code. |
| **DTO Validation**            | All API inputs MUST use class-validator DTOs with explicit validation rules. No raw Prisma queries with user input.                                                                                  |

### 2. Backend Module Structure

Each module should follow this pattern:

```
modules/<module-name>/
  ├── <module-name>.module.ts
  ├── <module-name>.controller.ts       # Swagger-decorated endpoints
  ├── <module-name>.service.ts          # Business logic
  ├── dto/
  │   ├── create-<entity>.dto.ts       # Input validation
  │   ├── update-<entity>.dto.ts
  │   ├── query-<entity>.dto.ts         # Filter/pagination
  │   └── response-<entity>.dto.ts      # Response shaping
  ├── (strategies/ as needed)
  └── (guards/ as needed)
```

### 3. API Documentation Standards (Swagger)

**Every endpoint MUST have**:

- `@ApiTags()` for module grouping
- `@ApiOperation()` with clear description
- `@ApiResponse()` for all response codes (200, 201, 400, 401, 403, 404, 500)
- `@ApiParam()` / `@ApiQuery()` for parameters
- `@ApiBody()` for request bodies
- DTO properties decorated with `@ApiProperty()` and descriptions

**Example**:

```typescript
@ApiOperation({ summary: 'Create a new court' })
@ApiCreatedResponse({ type: CourtResponseDto })
@ApiBadRequestResponse({ description: 'Invalid input' })
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@Post()
create(@Body() dto: CreateCourtDto) { ... }
```

### 4. Frontend Standards

#### Design Direction

**Visual Identity**: Minimal, utilitarian dashboard aesthetic. Think "professional operations tool" rather than "consumer marketing site."

- Clean, data-dense layouts with clear hierarchy
- Subtle, professional color palette (avoid saturated defaults)
- Purposeful whitespace — not sparse, not cramped
- Consistent spacing using Tailwind's spacing scale
- Typography optimized for readability and data scanning

**Component Structure**: Mirror backend module boundaries

```
frontend/app/
  ├── (auth)/
  ├── (dashboard)/
  │   ├── tenants/
  │   ├── courts/
  │   ├── slots/
  │   ├── bookings/
  │   ├── payments/
  │   ├── customers/
  │   └── superadmin/
  │       └── settings/           # RBAC management
  └── api/
```

#### React Query Patterns (CRITICAL)

**Query Key Factory Pattern**:

```typescript
// hooks/permissions.ts
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: () => [...permissionKeys.lists()] as const,
  detail: (id: string) => [...permissionKeys.all, 'detail', id] as const,
  role: (id: string) => [...permissionKeys.all, 'roles', id] as const,
};
```

**Optimistic Updates with Rollback**:

```typescript
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, data }) => permissionsApi.updateRolePermissions(roleId, data),

    // Optimistic update
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: permissionKeys.role(variables.roleId) });
      const previousData = queryClient.getQueryData(permissionKeys.role(variables.roleId));

      // Update cache immediately
      if (previousData) {
        queryClient.setQueryData(permissionKeys.role(variables.roleId), {
          ...previousData,
          permissions: /* new permissions */,
        });
      }

      return { previousData };
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(permissionKeys.role(variables.roleId), context.previousData);
      }
      toast.error('Failed to update');
    },

    // Always refetch to ensure consistency
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.role(variables.roleId) });
    },

    onSuccess: () => {
      toast.success('Updated successfully');
    },
  });
}
```

**Key Points**:
- Cancel outgoing queries before optimistic update
- Snapshot previous data for rollback
- Use `onSettled` (not just `onSuccess`) for invalidation
- Show loading states during mutations

#### Zod Schema Validation Pattern

**Enum Validation**:

```typescript
// CORRECT
export const createPermissionSchema = z.object({
  module: z.enum(Object.values(PermissionModule) as [string, ...string[]], {
    message: "Module is required",
  }),
  // ...
});

// WRONG - errorMap doesn't exist on z.enum()
module: z.enum(..., {
  errorMap: () => ({ message: "..." })  // TypeScript error
})
```

Use `message` directly in the options object, not `errorMap`.

#### Anti-Patterns (DO NOT USE)

- Generic shadcn demo layouts without customization
- Unstyled Tailwind defaults (buttons, cards, forms)
- Stock hero-section clichés
- Inconsistent spacing, colors, or typography across modules
- Managing optimistic state locally in components (use React Query's onMutate instead)

### 5. Testing & Migration Standards

**Feature "Done" Criteria**:

1. ✅ Code implements the feature per schema lifecycle
2. ✅ Swagger documentation complete for all endpoints
3. ✅ DTOs with proper validation rules
4. ✅ Tests cover happy path + edge cases
5. ✅ Migration reviewed for RLS implications
6. ✅ No bypass of tenant-scoped query patterns
7. ✅ Audit/event records written for mutations
8. ✅ Race conditions protected at DB level

If a feature intentionally deviates from the schema's intended lifecycle, it MUST be flagged with a `// DEVIATION: <explanation>` comment.

---

## Key Enum Definitions

```typescript
// Core Status Enums
SlotStatus: Available | Held | Booked | Blocked | Expired;
BookingStatus: Pending | Confirmed | Completed | Cancelled | NoShow;
PaymentStatus: Pending | Paid | Failed | Refunded;
PaymentType: Advance | Due | Refund;
PaymentMethod: Cash | Card | MobileBanking(Card and MobileBanking for version 2);
InvitationStatus: Pending | Accepted | Revoked | Expired;

// RBAC
PermissionModule: Booking | Customer | Court | Payment | Reports | Users;

// Entity States
CourtStatus: Available | Maintenance | Inactive;
TenantStatus: Active | Inactive | Suspended;
DayType: Weekday | Weekend | Holiday;
```

---

## Technology Stack Notes

### Backend

- **NestJS**: Progressive Node.js framework with TypeScript
- **Prisma**: Type-safe ORM with migration-based schema management
- **NeonDB**: PostgreSQL-compatible serverless database
- **JWT**: Access tokens (15min default) + Refresh tokens (rotation)
- **Swagger**: API documentation with `@nestjs/swagger`
- **Nodemailer**: Email delivery for invitations

### Frontend

- **Next.js 16**: Latest with React 19 (App Router)
- **Tailwind CSS v4**: Latest version with new PostCSS plugin
- **shadcn/ui**: Component primitives (NOT pre-built templates)
- **lucide-react**: Icon library
- **TanStack Query (React Query)**: Server state management with optimistic updates
- **Zod**: Schema validation

---

## Session Commands

```bash
# Backend
cd backend && npm run start:dev  # Watch mode
cd backend && npm run start:debug # Debug mode

# Frontend
cd frontend && npm run dev       # Next.js dev server

# Database
cd backend && npm run prisma:migrate
cd backend && npm run prisma:generate

# Swagger
# Access at http://localhost:3001/api
```

---

## Completed Work

### RBAC/Permissions Management (August 2025)

**Status**: ✅ Complete

Implemented a complete role-based access control system with proper UI synchronization and hard-delete pattern.

**Key Implementations**:

1. **Frontend Optimistic Updates** (`frontend/hooks/permissions.ts`)
   - React Query mutations with `onMutate` for instant UI feedback
   - Automatic rollback on error using `onError` context
   - Proper query invalidation with `onSettled`
   - Query key factory pattern for cache management

2. **Backend Hard Delete Pattern** (`backend/src/modules/permissions/`)
   - `RolePermission` junction table uses hard DELETE (no `deletedAt`)
   - Atomic permission updates in single transaction
   - Efficient diffing: only add new permissions, delete removed ones
   - Removed all `deletedAt: null` filters from queries

3. **UI Components** (`frontend/app/dashboard/superadmin/settings/page.tsx`)
   - Settings page with role and permission management
   - Modal-based permission assignment with instant feedback
   - Visual loading states during mutations
   - Proper error handling with toast notifications

4. **API Endpoints** (All Swagger-documented):
   - `GET /permissions` - List all permissions
   - `GET /permissions/roles/:roleId` - Get role permissions
   - `PUT /permissions/roles/:roleId` - Update role permissions
   - `GET /permissions/members/:tenantMemberId` - Get member permissions
   - `PUT /permissions/members/:tenantMemberId/roles` - Update member roles

**Files Modified**:
- `frontend/hooks/permissions.ts` - React Query hooks with optimistic updates
- `frontend/app/dashboard/superadmin/settings/page.tsx` - Settings UI
- `frontend/lib/schemas/permission.ts` - Zod validation schemas
- `backend/src/modules/permissions/permissions.service.ts` - Business logic
- `backend/src/modules/auth/auth.service.ts` - Removed deletedAt filters
- `backend/prisma/role-permission.prisma` - Hard delete schema

**Testing**: See `tasks/TESTING_GUIDE.md` for comprehensive test cases.

---

## Completed Work: Slots Module & Slot UX Simplification (August 2026)

### Status: ✅ Complete

Full slot inventory system: backend module (`backend/src/modules/slots/`) + admin UI (`frontend/app/dashboard/slots/`), plus a UX simplification pass that made day-types visible/correct and eliminated manual generation.

### API Endpoints (all Swagger-documented, tenant-scoped)

```
POST   /slots/generate          # Generate slots (omit courtId = ALL courts)
GET    /slots                   # List (filters: courtId, status, date, pagination)
GET    /slots/:id               # Single slot
POST   /slots/:id/hold          # 15-min checkout hold (Booking.create)
POST   /slots/:id/release       # Release hold (Booking.create)
POST   /slots/:id/block         # Close slot, reason required (Court.update)
POST   /slots/:id/unblock       # Reopen slot (Court.update)
DELETE /slots/cleanup           # Hard-delete stale non-booked slots before date
GET    /slots/settings          # Weekend days, timezone, auto-gen config
PUT    /slots/settings          # Update those settings (Court.update)
GET    /slots/holidays          # Holiday calendar
POST   /slots/holidays          # Mark date as holiday (one per date)
DELETE /slots/holidays/:id      # Remove holiday
```

### Day-Type Classification (CRITICAL — do not regress)

`SlotsService.getDayType()` classifies each date, in priority order:

1. **Holiday** — date is in the tenant's `holidays` table
2. **Weekend** — date's weekday **in the tenant's timezone** is in `Tenant.weekendDays` (JSON int array, **default `[5, 6]` = Friday + Saturday — the Bangladesh weekend**). Weekday is computed by probing the date at 12:00 UTC and formatting via a cached `Intl.DateTimeFormat` in the tenant's timezone.
3. **Weekday** — everything else

**History**: this was originally hardcoded Sat+Sun (the Western weekend) and ignored `Tenant.timezone` — backwards for the BD target market. Fixed August 2026.

### Slot Generation Invariants

1. **Configurable interval**: each court has `slotIntervalMinutes` (30/45/60/90/120, default 60). Generation tiles each pricing rule's time range with that interval; a trailing partial window is dropped.
2. **Empty-date rule (mixed-interval safety)**: generation only fills dates that have ZERO existing slots for that court. Prevents overlapping tiles when a court's interval changes later — the unique constraint `(courtId, date, startTime)` only catches identical start times, not overlaps.
3. **Race safety**: single `createMany({ skipDuplicates: true })` per court rides the unique constraint; no check-then-act.
4. **Price snapshot**: slot price is copied from the pricing rule at creation time.
5. **Range cap**: max 90 days per request.

### Auto-Generation (auto-pilot)

- `SlotsScheduler` (`slots-scheduler.provider.ts`) runs hourly (`@Cron('17 * * * *')`, `@nestjs/schedule` + `ScheduleModule.forRoot()` in app.module).
- For every tenant with `autoGenerateEnabled`, fills `[today, today + autoGenerateDaysAhead]` (computed in THAT tenant's timezone) for all courts via `SlotsService.runAutoGeneration()`.
- Idempotent (empty-date rule) → hourly runs are harmless. Audit attributed to the tenant's first member.

### Schema Additions (this work)

- `Tenant.weekendDays Json @default("[5,6]")`, `autoGenerateEnabled Boolean`, `autoGenerateDaysAhead Int @default(14)`
- `Court.slotIntervalMinutes Int @default(60)`
- New `Holiday` model (`@@unique([tenantId, date])`); seed adds fixed-date BD national holidays per year

**DB workflow note**: this project has NO migrations directory — schema changes are applied with `npx prisma db push` (schema-first), client regenerated with `npx prisma generate`.

### Key Files

- Backend: `backend/src/modules/slots/{slots.service,slots.controller,slots-scheduler.provider}.ts` + `dto/` (generate, query, block, response, slot-settings, holiday)
- Frontend: `frontend/app/dashboard/slots/page.tsx`, `frontend/components/dashboard/slots/*` (data table, generate/block/cleanup dialogs, status badge, **slot-settings-card** = auto-pilot toggle + weekend-day chips + holidays manager), `frontend/hooks/slots.ts`, `frontend/lib/{api,types,schemas}/slot*.ts`
- Frontend dialog convention: **React Hook Form + zodResolver** using the `components/forms/` helpers (`RHFInput`, `RHFSelect`, `RHFTextarea`) — NOT the plain-useState pattern the older pricing dialog uses. Default dates are computed at module scope (React purity rule forbids `new Date()` during render).

### Accepted Trade-off (virtual-slots fork, rejected for now)

Bookings remain slot-based: a 2h booking = 2 consecutive slot rows. Arbitrary-length/merged bookings would require dropping materialized slots for on-demand availability computation + PostgreSQL GIST range-exclusion constraints — revisit only if flexible durations become a hard requirement.

---

## Current Work: Auth & Tenant Isolation Architecture Fix

### Status: In Progress

**Problem Identified**:
- Backend relies on frontend passing `X-Tenant-ID` header for tenant context
- JWT payload doesn't contain tenant context (only `{ sub: userId, email }`)
- GET `/courts` returns 401 because frontend doesn't send header for GET requests
- Courts controller missing `PermissionGuard` in guard chain

**Solution Being Implemented**:
1. Include tenant context directly in JWT payload (one user = one tenant)
2. Simplify TenantGuard to read from JWT instead of extracting from header
3. Add superadmin tenant selection endpoints
4. Remove `X-Tenant-ID` header dependency from frontend
5. Enable refresh token interceptor

### Task Breakdown

See `/tasks/` directory for detailed implementation guides:

| Task | Priority | Status | Description |
|------|----------|--------|-------------|
| [Task 1](../tasks/task-1-critical-fix-courts-controller.md) | CRITICAL | PENDING | Add `PermissionGuard` to courts controller |
| [Task 2](../tasks/task-2-jwt-tenant-context.md) | HIGH | PENDING | Include tenant context in JWT payload |
| [Task 3](../tasks/task-3-simplify-tenant-guard.md) | HIGH | PENDING | Simplify TenantGuard to read from JWT |
| [Task 4](../tasks/task-4-superadmin-tenant-selection.md) | MEDIUM | PENDING | Add superadmin tenant selection endpoints |
| [Task 5](../tasks/task-5-remove-tenant-header-frontend.md) | LOW | PENDING | Remove `X-Tenant-ID` header from frontend |
| [Task 6](../tasks/task-6-enable-refresh-token-interceptor.md) | LOW | PENDING | Enable refresh token interceptor |

**Dependencies**: Task 1 is independent. Tasks 2-3 must be done sequentially. Tasks 4-5 depend on 2-3. Task 6 is independent.

### Key Design Decisions

1. **One User = One Tenant**: Regular users belong to exactly one tenant (no multi-tenant membership)
2. **Superadmin Tenant Selection**: Superadmin can view all tenants, then select one to operate on
3. **JWT Contains Tenant Context**: Backend derives tenant from JWT, not from frontend headers
4. **Stateless Design**: No session-based tenant storage (except for superadmin selection endpoint)

---

## Explicit Deferments (Tracked)

1. **Payment Gateway Integration**: Manual entry only. Live gateways (SSLCommerz, Bkash, Nagad, Stripe) are schema-ready but not implemented.
2. **RLS at Database Level**: Tenant isolation enforced at application layer. RLS policies MUST be added before production deployment.
3. **Partial Unique Index for Invitations**: Schema notes that true "one pending invite per (tenantId, email)" needs a partial unique index. Currently only an index exists - constraint must be added.
4. **Email Service**: Nodemailer configured but SMTP provider selection pending (consider Gmail SMTP for dev, transactional service for prod).
5. **Lunar Holidays (Slots)**: The seed adds only fixed-date BD national holidays. Lunar holidays (Eid, Durga Puja, etc.) shift yearly and must be added per year by the tenant admin via the Holidays manager (`/dashboard/slots`).
6. **Variable-Length Bookings**: Bookings are consecutive-slot sequences (a 2h booking = 2 slots). Arbitrary-length/merged bookings were considered and rejected — see "Accepted Trade-off" under the Slots module section.

---

## Current Development Focus

**Completed foundations**: Auth, Tenants, Courts, Pricing Rules, RBAC/Permissions, Invitations, **Slots (backend + admin UI + auto-generation)**.

**Active/Next**:

1. **Bookings Module (next)**: consumes slots — multi-slot consecutive booking, `SlotsService.bookSlot(tenantId, slotId, tx?)` is the integration point (conditional update, Available|Held → Booked).
2. **Auth & Tenant Isolation Fix**: see "Current Work" section above (tasks 1–6, pending).
3. **Payments**: manual entry after bookings exist.

Established patterns to follow:

- Tenant-scoped queries via `@CurrentTenant()`
- Audit/event records written in the SAME transaction as mutations
- Swagger documentation on every endpoint
- Race-condition protection via DB-level guarantees (conditional `updateMany`, unique constraints)
- React Query key-factory hooks (`hooks/slots.ts` is a clean reference)
