# Task 1: Prisma Schema Reshape + Slots Service Touch-ups

**Scope**: Backend Prisma schema + minimal slots service changes
**Status**: ✅ Complete (August 17, 2026)
**Priority**: CRITICAL (blocks all other booking tasks)
**Depends on**: Nothing

---

## Context

The current `Booking` model has a **single required `slotId` FK**, but bookings must support **multi-slot consecutive bookings** (a 2h booking = 2 consecutive slot rows — documented in CLAUDE.md). This task introduces a `BookingSlot` join table, denormalizes list-filter fields onto `Booking`, and makes `Customer.email` nullable (phone-first customers — confirmed product decision).

The `bookings` and `customers` tables are empty (no module exists), so the reshape is free.

**DB workflow**: this project has NO migrations directory — apply with `npx prisma db push`, regenerate with `npx prisma generate`. Prisma schema is multi-file (one model per file under `backend/prisma/`).

---

## Part 1: Files to Create

### `backend/prisma/booking-slot.prisma` (NEW)

```prisma
model BookingSlot {
    id        String   @id @default(uuid()) @db.Uuid
    tenantId  String   @db.Uuid
    bookingId String   @db.Uuid
    slotId    String   @db.Uuid
    price     Decimal  @db.Decimal(10, 2) // price snapshot at booking time
    createdAt DateTime @default(now())

    booking Booking @relation(fields: [bookingId], references: [id])
    slot    Slot    @relation(fields: [slotId], references: [id])
    tenant  Tenant  @relation(fields: [tenantId], references: [id])

    @@unique([bookingId, slotId])
    @@index([slotId])
    @@index([tenantId, slotId])
    @@map("booking_slots")
}
```

---

## Part 2: Files to Modify

### `backend/prisma/booking.prisma`

**Remove**:
- `slotId String @db.Uuid` field
- `slot Slot @relation(...)` relation
- `@@index([slotId])`

**Add**:
- `bookingSlots BookingSlot[]` relation
- Denormalized fields (with a code comment explaining why — see Rationale):

```prisma
    // Denormalized for server-side date-range + payment-status filtering in
    // GET /bookings (maintained transactionally by BookingsService; a future
    // standalone payments module MUST also maintain paidAmount).
    date       DateTime @db.Date
    startTime  DateTime @db.Time(6)
    endTime    DateTime @db.Time(6)
    paidAmount Decimal  @default(0) @db.Decimal(10, 2)

    @@index([tenantId, date, startTime])
```

- `date` = first slot's date; `startTime` = first slot's start; `endTime` = last slot's end; `paidAmount` = net paid (inflows − refunds).

**Rationale (DEVIATION — documented in code)**: `GET /bookings` filters (date range) and `paymentStatus` (Paid/Partial/Unpaid) must be server-side and paginated. Without `date`, date filtering requires a join through `bookingSlots → slots` inside both `count` and `findMany`; without `paidAmount`, payment-status filtering is a per-row aggregate Prisma cannot express in a `where`.

### `backend/prisma/slot.prisma`

Replace `bookings Booking[]` relation with `bookingSlots BookingSlot[]`.

### `backend/prisma/customer.prisma`

`email String` → `email String?` (nullable).

- **db push implication**: Postgres runs `ALTER COLUMN ... DROP NOT NULL` — non-breaking. `@@unique([tenantId, email])` stays valid (Postgres treats NULLs as distinct → multiple phone-only customers coexist).
- **Before push**: check for existing empty-string emails. If any exist, run `UPDATE customers SET email = NULL WHERE email = ''` first, or future `''` inserts will collide on the unique index.

### `backend/src/modules/slots/slots.service.ts`

Two changes (both required for compilation / correctness):

1. **`cleanupExpired`**: the where-clause references the old relation — change `bookings: { none: {} }` → `bookingSlots: { none: {} }`. (Compile-breaking otherwise: the `bookings` relation no longer exists on `Slot`.)
2. **`releaseExpiredHolds`**: change `private` → `public` (same name/signature). `BookingsService.getDayView` (Task 3) calls it lazily before reading the grid, mirroring what `findAll`/`findOne` already do.

**Also grep** the whole backend for `booking.slotId` and `slot.bookings` usages — `slots.service.ts` should be the only file referencing the old shape; fix anything else found.

---

## Part 3: Decisions Evaluated (do NOT do these now)

- **Audit-log helper extraction to common/**: keep the per-service private `createAuditLog` (courts, slots, pricing each have one). Bookings will add a 4th private copy for consistency. Extraction = separate cleanup task.
- **Held-expiry cron**: NOT needed. Staff flow never creates holds (Task 3 books directly `Available → Booked`); lazy release in `findAll`/`findOne`/day-view covers all read paths. Revisit when the public `/book` wizard lands.

---

## Part 4: Apply & Verify

```bash
cd backend
# 0. (if needed) clear empty-string emails: see Part 2
npx prisma db push
npx prisma generate
npm run start:dev   # must compile cleanly
```

**Verification checklist**:

1. `npx prisma db push` succeeds; re-running reports "already in sync" (idempotent)
2. Backend compiles — zero references to the old `Booking.slotId` shape
3. Slots module regression: `GET /slots` list, block/unblock, cleanup endpoint still work (the cleanup where-clause change is the risk point)
4. `DELETE /slots/cleanup` does NOT delete slots referenced by `booking_slots` (relation swap preserved the guard)
5. Existing slots page (`/dashboard/slots`) loads and operates normally
