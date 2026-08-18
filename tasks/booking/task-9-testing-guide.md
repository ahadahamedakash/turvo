# Task 9: Testing & Verification Guide — Bookings Feature

**Scope**: End-to-end verification of Tasks 1–8 (races, permissions, isolation, UX flows)
**Status**: TODO
**Priority**: Required before marking the feature done
**Depends on**: Tasks 1–8 complete

---

## How to Use This Guide

Backend checks run against Swagger (`http://localhost:5000/api`) or curl with a staff JWT. Frontend checks run at `http://localhost:3000/dashboard/bookings` (ideally **two browsers/profiles** for concurrency tests — the whole point of this feature is that two staff members can work simultaneously).

**Feature "done" criteria** (CLAUDE.md): every section below passes, plus Swagger complete, DTOs validated, no tenant-scope bypass, audit/events written transactionally, races protected at DB level.

---

## Part 1: Race Conditions (the critical section)

### 1.1 Double-book — same slot, two staff
- Two windows, both open the create dialog on the same available slot
- Submit both as close to simultaneously as possible (or two parallel `POST /bookings` curls with the same `slotIds`)
- **Expected**: exactly ONE 201; the other gets **409**. Loser's dialog closes with the conflict toast and the grid shows a single booked block

### 1.2 Partial-overlap multi-slot
- A books 18:00–19:00 (2 × 30-min slots). B attempts 18:30–19:30 (overlapping) or 19:00–20:00 racing A's commit
- **Expected**: B gets 409 (the single `updateMany` count gate caught the taken slot)

### 1.3 Cancel vs concurrent cancel
- Two tabs both open the same booking's cancel dialog; both submit
- **Expected**: first succeeds; second gets **409 "modified by someone else"**; slots released exactly once

### 1.4 Record payment vs concurrent payment
- Two tabs record payments on the same booking at once
- **Expected**: both succeed ONLY if combined ≤ due; otherwise the second gets **409 "balance changed"**; `paidAmount` never exceeds `total`

### 1.5 Cancel vs concurrent payment
- Tab A cancels while tab B records payment
- **Expected**: one wins (409 to the loser); no state where a Cancelled booking gained a payment or a paid booking silently cancelled without refund path

---

## Part 2: Money Math

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 2.1 | Full pay at creation | create with payment = total | paidAmount = total, paymentStatus Paid, PaymentReceived event |
| 2.2 | Partial advance | create with payment 500 / total 1500 | due 1000, Partial chip; payment type Advance |
| 2.3 | Pay rest later | record 1000 on 2.2 | Paid; payment type Due |
| 2.4 | Overpay rejected | record payment > due | 400 inline error |
| 2.5 | Discount | discount 100 on subtotal 1600 | total 1500 everywhere (list, sheet, stats) |
| 2.6 | Discount > subtotal | discount 2000 on 1600 | 400 |
| 2.7 | Refund on cancel | cancel 2.3 with refund 1500 | Refund payment row, paidAmount 0, `GET /bookings` paymentStatus Unpaid with Refunded payment present |
| 2.8 | Refund > paid | refund 2000 on paid 1500 | 400 |
| 2.9 | Refund unpaid booking | refund toggle on due-only booking | section hidden in UI; server 400 if forced |

---

## Part 3: Lifecycle Guards

| Action | On status | Expected |
|---|---|---|
| confirm | Confirmed | 409 |
| confirm | Cancelled | 409 |
| complete | Pending | 409 |
| complete | Completed | 409 |
| no-show | Completed | 409 |
| record payment | Cancelled | 409 |
| cancel | Completed | 409 |
| cancel | NoShow | 409 |

Happy transitions: Pending→Confirmed→Completed; Pending/Confirmed→Cancelled (slots released); Pending/Confirmed→NoShow. Every transition writes a `StatusChanged` BookingEvent + AuditLog **in the same transaction** (verify rows exist after each call).

---

## Part 4: Validation & Input Guards

- Non-consecutive slotIds (`10:00` + `12:00` skipping `11:00`) → 400 "Slots must be consecutive"
- Cross-court slotIds → 400; cross-date slotIds → 400
- >8 slots → 400; empty array → 400; non-UUID → 400
- Slot deleted by cleanup mid-dialog → submit gets 404, dialog shows error, grid refreshes
- Booking a `Blocked`/`Booked` slot directly via API → 409
- Held slot (created via `POST /slots/:id/hold` for test purposes) → booking it **succeeds** (Available|Held gate) and clears hold fields

---

## Part 5: Tenant Isolation & Permissions

- Booking id from tenant B used in tenant A's JWT → **404** on every `/bookings/:id*` route (findFirst tenant-scoped, never leaks)
- `GET /bookings?customer=` never returns other tenants' customers
- Role WITHOUT `Booking.update` → 403 on confirm/cancel/complete/no-show; UI hides those buttons (verify both layers)
- Role WITHOUT `Payment.create` → 403 on record payment; button hidden
- Superadmin → all routes pass (bypass)
- `GET /customers` scoped; soft-deleted customers never matched

---

## Part 6: Day-View & Calendar UX

- Day-view payload: one request returns courts + slots + booking summaries + stats; `isStart` true ONLY on each booking's first slot; continuation slots carry `isStart: false` + same booking id
- Stats: `bookingsCount` = distinct bookings that date; `utilizationPct` = bookedSlots/totalSlots; `collected` = Σ paidAmount
- Merged block rendering: 2-slot booking = one block, both cells occupied, single click target
- Now-line: today only, positioned by client clock; past cells dimmed + unclickable
- Held countdown (test via hold endpoint): amber cell ticks mm:ss; on expiry the grid refetches and the slot returns to Available
- Empty date beyond `autoGenerateDaysAhead` → Generate CTA creates slots for that date and grid fills
- Weekend/holiday flags on date-strip chips (verify vs tenant `weekendDays` + holidays table)
- **Two-browser freshness**: book in A → appears in B within ≤60s (polling); focus-refetch triggers on tab activation

---

## Part 7: Frontend Hygiene Gates

- `npm run lint` + type-check clean; `npm run build` succeeds (frontend)
- `npm run start:dev` compiles (backend)
- No `new Date()` during render in any new file (purity rule — module-scope defaults + effects only)
- Dark mode: grid cells, badges, chips, sheet, dialogs all carry `.dark:` pairs
- Mobile viewport: columns scroll horizontally; sheet/dialog remain usable

---

## Part 8: Regression (schema reshape fallout)

- `/dashboard/slots` still lists/generates/blocks/cleanups (Task 1's `cleanupExpired` relation swap is the risk point)
- `DELETE /slots/cleanup` does NOT delete slots referenced by `booking_slots`
- Booking a slot → Slots page shows it Booked; cancel → Available (cross-module invalidation)
- `npx prisma db push` re-run → "already in sync"
- RBAC settings page (`/dashboard/superadmin/settings`) unaffected

---

## Part 9: Acceptance Smoke (the 5 user moments)

1. **Morning scan**: open `/bookings` → today's full grid, zero clicks, stats strip accurate
2. **Phone call**: click Friday, scan Turf B column → answer availability in <3s
3. **Walk-in**: click free slot → phone → pick customer → Save → block appears — under 30 seconds
4. **"Is my booking confirmed?"**: search phone in List tab → row shows status + payment; click → sheet with full timeline
5. **No-show / collect cash**: click block → Record payment (or No-show) → one action, money/state correct everywhere
