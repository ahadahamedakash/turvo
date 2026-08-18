# Bookings Feature — Master Plan & Task Index

**Type**: Overview / Reference Document
**Created**: August 17, 2026
**Status**: Tasks 1–8 complete (backend + full `/dashboard/bookings` UI). Task 9 (live E2E verification) remains manual — run it against a running backend before shipping.

---

## Context

Bookings are the revenue-critical core of Turvo. Slots (inventory) exist end-to-end; `SlotsService.bookSlot()` (`backend/src/modules/slots/slots.service.ts`) is the documented integration point. This feature adds the **Bookings module (backend)** + **`/dashboard/bookings` staff calendar UI (frontend)**, following `tasks/booking-flow.md`.

## Confirmed Product Decisions (Aug 17, 2026)

1. **Scope**: staff dashboard `/bookings` only — this is the turf-owner/staff dashboard; staff book on behalf of customers. Public `/book` wizard deferred.
2. **Payments**: cash recording in scope now (optional at booking creation + "Record payment" later). Full Payments ledger module = later task.
3. **Customer identity**: phone-first (required), email optional — schema change required.
4. **Tentative bookings**: staff can save as Confirmed (default) or Pending ("tentative", e.g. unconfirmed phone reservations).
5. **Staff bookings skip the 15-min Held phase**: slots go `Available → Booked` directly via one atomic conditional update. Slot `Held` stays reserved for the future public wizard. Concurrent staff race → loser gets 409.

---

## UX Design Summary — `/bookings`

**The user**: front-desk staff, high frequency, low patience. Their moments: morning scan ("what's today look like?"), phone call ("is Friday 7pm free on Turf B?" — answer in <3s), walk-in booking (<30s: click slot → phone + name → save), "is my booking confirmed?" (search by phone), no-show/cancel/collect-cash (one click on the block).

**Design rule**: the calendar grid IS the app. Everything else serves it and gets out of the way.

### Primary view: Day Grid ("court sheet")

Rows = time, columns = courts (Playtomic/Skedda-style). Staff spatially memorize "the 7pm column".

```
┌──────────────────────────────────────────────────────────────────────┐
│ Bookings      [🔍 name or phone…]                  [Calendar │ List] │
│ ◀  Today  ▶   Mon 17 · Tue 18 · Wed 19 · Thu 17 Aug ▾   ← date strip│
│ ── Today: 12 bookings · 68% full · ৳9,500 collected ──────────────── │
├──────────┬─────────────────────┬─────────────────────┬──────────────┤
│ Time     │ Turf A (5-a-side)   │ Turf B (7-a-side)   │ Turf C       │
├──────────┼─────────────────────┼─────────────────────┼──────────────┤
│ 06:00    │  ৳500               │  ████████████████   │  🔒 blocked  │
│          │  (available)        │  Karim · PAID       │              │
│ 07:00    │  ████████████████   │  ৳800               │  ৳650        │
│          │  Rahim +5 · DUE     │  (available)        │  (available) │
│ 08:00    │  ▓▓ held 12:43 ▓▓   │  ...                │              │
│ ┈┈ now ┈┈┴┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┴┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┴┈┈┈┈┤              │
└──────────┴─────────────────────┴─────────────────────┴──────────────┘
```

- **Available**: quiet cell, price visible (staff quote prices on calls), hover ring → click opens create dialog
- **Booked**: one merged block per booking spanning consecutive slots; customer name + payment chip (PAID / DUE ৳x) → click opens detail sheet
- **Held**: amber striped + live mm:ss countdown (defensive — staff flow never creates holds)
- **Blocked**: gray + lock icon
- **Past**: dimmed ~40%, not clickable
- **"now" line**: 2px teal, only on today
- Weekend/holiday dates flagged in the date strip (they price differently)

### Booking creation — ONE dialog, not a wizard

Staff are proxies for the customer AND authority on inventory. The 6-step public wizard is wrong for staff. One dialog, three sections:

1. **What** (pre-filled from clicked cell): court • date • start chips + **duration chips** (1×–4× = N consecutive slots; enabled only if consecutive + available + future). Live price preview.
2. **Who**: **phone-first** field, debounced 300ms lookup → existing customer auto-fills; new = name + phone (email optional). Auto-create on save.
3. **Payment (optional)**: "Collect cash now" switch → amount (defaults to total; partial allowed → rest is Due), Cash. Plus discount, notes, "Save as tentative" switch → Pending.

### Booking detail — side sheet (calendar stays visible)

Customer card, price breakdown (subtotal − discount = total; paid; due highlighted), payments list + inline Record payment, **BookingEvent timeline** (newest first), contextual actions: Confirm (Pending) · Record payment · Complete (Confirmed) · No-show · Cancel (reason required, refund toggle if paid).

### Secondary: List tab

`Calendar | List` tabs. Filters: date range (default today→+7d), court, status, payment status (Paid/Partial/Unpaid), customer search, pagination. Row click → detail sheet.

### Professional-details checklist

- Empty date beyond generation horizon → "Generate slots" CTA (reuses existing endpoint); within horizon → points to pricing rules
- 60s polling + refetch-on-focus + invalidation after mutations (two staff, one screen, no surprises)
- Status = color + pattern + text (colorblind-safe; booked solid / held striped / blocked hatched)
- Today stats strip: bookings · utilization % · collected ৳ (one quiet line)
- Cancel requires reason; loading states on all mutating buttons; success toasts carry customer + time
- Mobile: columns scroll horizontally; sheet stays usable
- Skeleton loading; inline error retry
- React purity: no `new Date()` during render — module-scope defaults + effect-driven clocks

---

## Architecture Summary

### Schema reshape (Task 1)

- **New `BookingSlot` join model** (`booking_slots`): replaces single `Booking.slotId` FK — enables multi-slot consecutive bookings (2h = 2 slots). `@@unique([bookingId, slotId])`, price snapshot per slot.
- **Booking denormalized fields** `[DEVIATION]`: `date` (first slot's), `startTime`/`endTime` (first start / last end), `paidAmount` (net paid) + `@@index([tenantId, date, startTime])` — makes date-range and Paid/Partial/Unpaid filters server-side and paginable. All payment writes flow through BookingsService (must maintain `paidAmount`; comment in code).
- **`Customer.email` → nullable** (phone-first; Postgres unique index treats NULLs as distinct).
- `slots.service.ts`: `cleanupExpired` relation swap (`bookings` → `bookingSlots` — compile-breaking otherwise); `releaseExpiredHolds` private → public.
- Workflow: `npx prisma db push` (no migrations dir) — `bookings` table is empty, reshape is free.

### Backend (Tasks 2–3)

| Endpoint | Permission | Notes |
|---|---|---|
| `POST /bookings` | `Booking.create` | multi-slot create, optional payment |
| `GET /bookings` | `Booking.view` | filters: dateFrom/dateTo, courtId, status, paymentStatus, customer, page/limit |
| `GET /bookings/day-view?date=` | `Booking.view` | purpose-built calendar payload |
| `GET /bookings/:id` | `Booking.view` | detail + events + payments + slots |
| `POST /bookings/:id/confirm` | `Booking.update` | Pending→Confirmed |
| `POST /bookings/:id/cancel` | `Booking.update` | reason required; releases slots; optional refund |
| `POST /bookings/:id/complete` | `Booking.update` | Confirmed→Completed |
| `POST /bookings/:id/no-show` | `Booking.update` | Pending\|Confirmed→NoShow |
| `POST /bookings/:id/payments` | `Payment.create` | record cash payment |
| `GET /customers?search=&limit=` | `Customer.view` | typeahead (phone/name) |

**Race safety** — every mutation is one transaction with a conditional-`updateMany` race gate:
- **Create**: single `updateMany` books ALL slotIds atomically (`count !== N` → 409) — smallest critical section, beats N sequential updates
- **Cancel**: conditional on current status → Cancelled; releases slots conditionally (`Booked → Available`)
- **Record payment**: optimistic gate on `paidAmount` expected value → 409 "balance changed"
- **Transitions** (confirm/complete/no-show): conditional on current status
- AuditLog + BookingEvent written in the SAME transaction always

**Day-view payload** (one request, no client-side join — `/slots` pagination caps and N+1 customer fetches make client joins infeasible):

```jsonc
{ "date": "YYYY-MM-DD",
  "courts": [{ "id", "name", "slotIntervalMinutes" }],
  "slots": [{ "id", "courtId", "startTime", "endTime", "price", "status", "heldUntil?",
              "booking?": { "id", "customerName", "customerPhone", "status", "paymentStatus",
                            "total", "paidAmount", "due", "slotCount", "isStart" } }],
  "stats": { "bookingsCount", "totalSlots", "bookedSlots", "utilizationPct", "collected" } }
```

`isStart: true` marks each booking's first slot (merged-block label position); continuation slots repeat the booking with `isStart: false` (occupies cells).

### Frontend (Tasks 4–8)

- Only `tabs` added via shadcn (no popover/calendar/date lib — native chips + string time math)
- Query key factory `bookingKeys` (mirror `slotKeys`); `useDayView` overrides globals (staleTime 30s, refetchInterval 60s, refetchOnWindowFocus true)
- **Grid geometry `[DEVIATION from literal rowspan]`**: courts have different `slotIntervalMinutes` (30–120) → HTML tables can't align. Column-stack with **height ∝ minutes** (`minutes × 1.5px`); multi-slot booking = ONE block of summed height
- RHF + zodResolver dialogs via `components/forms/form-field.tsx` (repo convention)
- `use-permissions.ts` UX-only gating (extends `lib/jwt.ts` type with `tenantContext.permissions`; backend remains enforcement point)

---

## Task Index (execute in order)

| Task | File | Scope | Depends on |
|---|---|---|---|
| 1 | [task-1-schema-reshape.md](./task-1-schema-reshape.md) | Prisma: BookingSlot join, Booking denorms, Customer email nullable, slots service touch-ups | — |
| 2 | [task-2-customers-module.md](./task-2-customers-module.md) | Minimal customers module (search + find-or-create) | 1 |
| 3 | [task-3-bookings-backend.md](./task-3-bookings-backend.md) | Bookings module: 9 endpoints, transactions, day-view | 1, 2 |
| 4 | [task-4-frontend-foundation.md](./task-4-frontend-foundation.md) | tabs, types, zod schemas, API clients, hooks, use-permissions | 3 |
| 5 | [task-5-calendar-ui.md](./task-5-calendar-ui.md) | Page shell, date strip, stats, day grid + cells + now-line + empty states | 4 |
| 6 | [task-6-create-booking-dialog.md](./task-6-create-booking-dialog.md) | Create dialog + customer typeahead + duration chips + 409 handling | 5 |
| 7 | [task-7-booking-detail-sheet.md](./task-7-booking-detail-sheet.md) | Detail sheet + timeline + record-payment + cancel dialogs | 5 |
| 8 | [task-8-list-view.md](./task-8-list-view.md) | List tab: filters + data table | 4 |
| 9 | [task-9-testing-guide.md](./task-9-testing-guide.md) | Edge cases, races, permissions, end-to-end verification | all |

## Explicit Deferments

Public `/book` wizard (holds + hold-expiry cron revisit then) · full Payments ledger module · full Customers CRUD · audit-helper extraction to common/ · recurring bookings & waitlist (`booking-flow.md` §5) · RLS.
