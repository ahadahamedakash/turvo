# Booking Amount & Due Calculation Feature - Overview

## Objective

Add a configurable "booking amount" (minimum advance/deposit) feature that allows staff to:
1. Configure a required minimum booking amount per tenant (e.g., 500৳)
2. Choose between "collect booking amount" vs "collect full cash" during booking creation
3. Automatically calculate and track due amounts

## Current State

- Payment type (Advance vs Due) is auto-derived from `amount < total`
- No minimum booking amount configuration
- Single "Collect cash" switch in booking dialog with manual amount entry
- Due amount calculated as `total - paidAmount`

## Desired State

- Configurable `bookingAmount` field per tenant (default: null)
- Booking dialog with clear options:
  - **Collect booking amount** (shows configured minimum, e.g., "500৳")
  - **Collect full cash** (shows total, e.g., "1,200৳")
  - **Custom amount** (manual entry)
- Live preview of booking amount vs due amount
- Settings UI for configuring the booking amount

## Task Breakdown

| Task | Priority | Status | Description |
|------|----------|--------|-------------|
| [Task 1](./task-1-schema-addition.md) | CRITICAL | PENDING | Add `bookingAmount` field to Tenant schema |
| [Task 2](./task-2-backend-dto-service.md) | CRITICAL | PENDING | Update DTOs and booking service for payment modes |
| [Task 3](./task-3-frontend-types-schemas.md) | HIGH | PENDING | Add payment mode to frontend types and Zod schemas |
| [Task 4](./task-4-booking-dialog-ui.md) | HIGH | PENDING | Implement booking dialog UI with payment modes |
| [Task 5](./task-5-settings-ui.md) | MEDIUM | PENDING | Create settings UI for booking amount configuration |
| [Task 6](./task-6-testing-guide.md) | LOW | PENDING | Testing and verification guide |

## Dependencies

- Tasks 1 → 2 must be sequential (schema first, then DTO/service)
- Tasks 3 → 4 must be sequential (types first, then UI)
- Tasks 5 → 6 can run in parallel with 3 → 4 (settings UI independent of booking dialog)

## Design Decision: Per-Tenant vs Per-Court

**Decision**: Per-Tenant configuration (`Tenant.bookingAmount`)

**Rationale**:
- Simpler for most use cases (one policy across all courts)
- Reduces UI complexity
- Can be extended to per-court later if needed
- Courts typically share the same booking policy within a tenant

## Files to Modify

### Backend
- `backend/prisma/tenant.prisma` - Add `bookingAmount` field
- `backend/src/modules/tenants/dto/update-tenant.dto.ts` - Add to DTO
- `backend/src/modules/bookings/dto/create-booking.dto.ts` - Add `paymentMode`
- `backend/src/modules/bookings/bookings.service.ts` - Handle payment modes
- `backend/src/modules/bookings/bookings.controller.ts` - Swagger docs

### Frontend
- `frontend/lib/types/booking.ts` - Add `paymentMode` type
- `frontend/lib/schemas/booking.ts` - Update Zod schema
- `frontend/components/dashboard/bookings/create-booking-dialog.tsx` - UI changes
- `frontend/components/dashboard/slots/slot-settings-card.tsx` - Settings UI
- `frontend/lib/api/tenant.ts` - API for updating booking amount
- `frontend/hooks/tenants.ts` - React Query hooks
