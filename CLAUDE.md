# Turvo - Multi-Tenant Turf Booking SaaS

## Overview

Turvo is a multi-tenant turf booking platform built with:

- **Backend**: NestJS + Prisma ORM + NeonDB (PostgreSQL)
- **Frontend**: Next.js 16 + Tailwind CSS v4 + shadcn/ui components
- **Documentation**: Swagger/OpenAPI for backend API

**Monorepo Structure**:

```
/backend  - NestJS backend (port 3001)
/frontend - Next.js frontend (port 3000)
```

---

## Architecture & Module Boundaries

### Core Modules

| Module          | Scope                                        | Key Models                                                 |
| --------------- | -------------------------------------------- | ---------------------------------------------------------- |
| **Auth**        | JWT-based authentication with refresh tokens | `User`, `RefreshToken`                                     |
| **Tenants**     | Multi-tenant organization management         | `Tenant`, `TenantMember`                                   |
| **RBAC**        | Role-based access control                    | `Role`, `Permission`, `UserRole`                           |
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
  │   └── customers/
  └── api/
```

#### Anti-Patterns (DO NOT USE)

- Generic shadcn demo layouts without customization
- Unstyled Tailwind defaults (buttons, cards, forms)
- Stock hero-section clichés
- Inconsistent spacing, colors, or typography across modules

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

## Explicit Deferments (Tracked)

1. **Payment Gateway Integration**: Manual entry only. Live gateways (SSLCommerz, Bkash, Nagad, Stripe) are schema-ready but not implemented.
2. **RLS at Database Level**: Tenant isolation enforced at application layer. RLS policies MUST be added before production deployment.
3. **Partial Unique Index for Invitations**: Schema notes that true "one pending invite per (tenantId, email)" needs a partial unique index. Currently only an index exists - constraint must be added.
4. **Email Service**: Nodemailer configured but SMTP provider selection pending (consider Gmail SMTP for dev, transactional service for prod).

---

## Current Development Focus

**Active Features**:

1. **Auth Module**: JWT-based authentication with refresh token rotation
2. **Invitation Module**: Team member onboarding via email with token-based acceptance

These modules serve as the foundation for all subsequent features and establish patterns for:

- Tenant-scoped queries
- Audit logging
- Swagger documentation
- Transaction boundaries
- Race condition handling
