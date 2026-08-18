# Task 3: Bookings Module (Backend)

**Scope**: Backend — bookings module: creation (multi-slot), lifecycle, payments, day-view
**Status**: ✅ Complete (August 17, 2026)
**Priority**: CRITICAL
**Depends on**: Task 1 (schema), Task 2 (CustomersService)

---

## Context

The core service of the platform. Every mutation runs in ONE transaction with a **conditional-`updateMany` race gate** and writes **BookingEvent + AuditLog in the same transaction** (repo invariants). Staff bookings skip the Held phase entirely: slots transition `Available → Booked` atomically; the booking is `Confirmed` by default or `Pending` when saved as tentative.

Pattern sources — follow exactly:
- `backend/src/modules/slots/slots.service.ts` — conditional updateMany + `assertSlotExists` + private `createAuditLog(tx, {...})` in-transaction pattern, `PrismaTransaction` type
- `backend/src/modules/slots/slots.controller.ts` — guard chain, throttle decorators, Swagger style, route-order comments

---

## Part 1: Files to Create

```
backend/src/modules/bookings/
├── bookings.module.ts          # imports PrismaModule, SlotsModule, CustomersModule
├── bookings.controller.ts
├── bookings.service.ts
└── dto/
    ├── create-booking.dto.ts
    ├── query-bookings.dto.ts
    ├── day-view.dto.ts
    ├── booking-response.dto.ts
    ├── record-payment.dto.ts
    └── cancel-booking.dto.ts
```

Register `BookingsModule` in `app.module.ts`.

**⚠️ Route order**: declare `GET /bookings/day-view` **BEFORE** `GET /bookings/:id` (same pitfall the slots controller documents for settings/holidays — add the same explanatory comment).

---

## Part 2: DTOs

### `create-booking.dto.ts`

```typescript
class CreateBookingDto {
  slotIds: string[]          // @IsArray @ArrayMinSize(1) @ArrayMaxSize(8) @IsUUID('4', { each: true }); service dedupes
  customer: CustomerInfoDto  // @ValidateNested @Type(() => CustomerInfoDto) — shape from Task 2
  status?: BookingStatus     // @IsIn([Pending, Confirmed]) optional, service default = Confirmed ('tentative' → Pending)
  discount?: number          // @IsNumber @Min(0) @Max(9999999) optional, default 0
  notes?: string             // @IsString @MaxLength(1000) optional
  payment?: CreatePaymentDto // @ValidateNested optional — cash at creation
}
```

### `record-payment.dto.ts` (reused as `CreateBookingDto.payment`)

```typescript
class CreatePaymentDto {
  amount: number            // @IsNumber @Min(0.01) @Max(9999999)
  method: PaymentMethod     // @IsEnum(PaymentMethod), default Cash
  referenceNumber?: string  // @IsString @MaxLength(100) optional
  type?: PaymentType        // @IsIn([Advance, Due]) optional — service infers if absent
}
```

### `cancel-booking.dto.ts`

```typescript
class CancelBookingDto {
  reason: string   // @IsString @IsNotEmpty @MaxLength(255) — REQUIRED
  refund?: {       // @ValidateNested optional — only if paidAmount > 0
    amount: number         // @Min(0.01)
    method?: PaymentMethod // default Cash
  }
}
```

Reason lives in `BookingEvent.newValue.reason` + AuditLog — **no new column** (the timeline is the display surface; deliberate non-addition, comment it).

### `query-bookings.dto.ts`

```typescript
dateFrom?: string       // @Matches(/^\d{4}-\d{2}-\d{2}$/) — against Booking.date denorm
dateTo?: string         // same
courtId?: string        // @IsUUID
status?: BookingStatus  // @IsEnum(BookingStatus)
paymentStatus?: 'Paid' | 'Partial' | 'Unpaid'  // @IsIn — translated to paidAmount vs total comparisons
customer?: string       // free text → customer: { OR: [firstName contains, lastName contains, phone contains] } insensitive
page?: number           // @Type(() => Number) @IsInt @Min(1), default 1
limit?: number          // @Type(() => Number) @IsInt @Min(1) @Max(100), default 20
```

`paymentStatus` translation (Prisma coerces plain numbers for Decimal comparisons):
- `Paid` → `paidAmount >= total`
- `Partial` → `paidAmount > 0 AND paidAmount < total`
- `Unpaid` → `paidAmount = 0`

### `day-view.dto.ts`

`date: string` required, `@Matches(/^\d{4}-\d{2}-\d{2}$/)`.

---

## Part 3: Endpoints

Controller: `@ApiTags('bookings') @Controller('bookings') @UseGuards(JwtAuthGuard, TenantGuard, PermissionGuard) @ApiBearerAuth()`. Full Swagger on every handler (200/201/400/401/403/404/409 as applicable).

| Endpoint | Permission | Throttle | Success |
|---|---|---|---|
| `POST /bookings` | `Booking.create` | `@ThrottleMedium()` | 201 `BookingDetailDto` |
| `GET /bookings` | `Booking.view` | `@ThrottlePermissive()` | 200 paginated |
| `GET /bookings/day-view?date=` | `Booking.view` | `@ThrottlePermissive()` | 200 `DayViewDto` |
| `GET /bookings/:id` | `Booking.view` | `@ThrottlePermissive()` | 200 `BookingDetailDto` |
| `POST /bookings/:id/confirm` | `Booking.update` | `@ThrottleMedium()` | 200 |
| `POST /bookings/:id/cancel` | `Booking.update` | `@ThrottleMedium()` | 200 |
| `POST /bookings/:id/complete` | `Booking.update` | `@ThrottleMedium()` | 200 |
| `POST /bookings/:id/no-show` | `Booking.update` | `@ThrottleMedium()` | 200 |
| `POST /bookings/:id/payments` | `Payment.create` | `@ThrottleMedium()` | 201 |

Permissions are already seeded (`Booking.*`, `Payment.*`; wildcard `{module}.all` + superadmin bypass handled by PermissionGuard). Handlers receive `@CurrentTenant() tenantId`, `@GetUser('id') userId`, `@CurrentMember() memberId` (Payment.issuedBy references TenantMember).

**Response DTOs** (`booking-response.dto.ts`) — money → `string` (`Decimal.toString()`), date → `YYYY-MM-DD`, times → `HH:mm` (replicate the private format helpers from slots/pricing):

- `BookingListItemDto`: `id, date, startTime, endTime, courtId, courtName, customerId, customerName, customerPhone, slotCount, durationLabel, status, subTotal, discount, total, paidAmount, due, paymentStatus, createdAt` (paymentStatus derived: paid ≥ total → Paid; paid > 0 → Partial; else Unpaid)
- `BookingDetailDto` adds: `notes, customer {id, firstName, lastName, phone, email}, slots [{id, startTime, endTime, price, status}], payments [{id, amount, method, type, status, referenceNumber?, createdAt, issuedByName}], events [{id, eventType, createdAt, issuedByName, summary}], createdByName, cancelledByName?, cancelledAt?`
- `DayViewDto`: see Part 5-F

---

## Part 4: Transaction Outlines (the heart of this task)

### A. `create(tenantId, dto, { userId, memberId })`

```
$transaction:
 1. slotIds = [...new Set(dto.slotIds)]
    slots = tx.slot.findMany({ where: { id: { in: slotIds }, tenantId, deletedAt: null } })
    slots.length !== slotIds.length → 404 'Slot not found'
    all same courtId → else 400 'Slots must be on the same court'
    all same date    → else 400 'Slots must be on the same date'
    sort by startTime; every slots[i].startTime === slots[i-1].endTime → else 400 'Slots must be consecutive'
 2. RACE GATE — ONE atomic statement (NOT per-slot bookSlot calls; single statement = smallest critical section):
    updated = tx.slot.updateMany({
      where: { id: { in: slotIds }, tenantId, deletedAt: null, status: { in: [Available, Held] } },
      data: { status: Booked, heldAt: null, heldBy: null, heldUntil: null } })
    updated.count !== slotIds.length → 409 'One or more slots were just taken — refresh and try again'
 3. customer = customersService.findOrCreate(tenantId, dto.customer, tx)
 4. subTotal = Σ slot.price ; discount = dto.discount ?? 0
    discount > subTotal → 400
    total = subTotal − discount
 5. status = dto.status ?? Confirmed
    if payment: amount > total → 400
 6. booking = tx.booking.create({ tenantId, courtId, customerId, status, subTotal, discount, total,
      paidAmount: payment?.amount ?? 0, notes, createdBy: userId,
      date: slots[0].date, startTime: slots[0].startTime, endTime: last.endTime })   // denorms
 7. tx.bookingSlot.createMany({ data: slots.map(s => ({ tenantId, bookingId, slotId: s.id, price: s.price })) })
 8. if payment: tx.payment.create({ tenantId, bookingId, amount, method, status: Paid,
      type: amount < total ? Advance : Due, issuedBy: memberId, paidBy: userId, paidAt: now, referenceNumber })
 9. tx.bookingEvent.create({ eventType: Created, newValue: {slotIds, date, startTime, endTime, total}, issuedBy: userId })
    if Confirmed → bookingEvent StatusChanged { old: null, new: 'Confirmed' }
    if payment   → bookingEvent PaymentReceived { newValue: { amount, method, type } }
10. createAuditLog(tx, { entityType: 'Booking', entityId: booking.id, action: 'Create', newValue: {...} })
Return BookingDetailDto (re-read with relations).
```

### B. `cancel(tenantId, id, dto, { userId, memberId })`

```
$transaction:
 1. booking = tx.booking.findFirst({ id, tenantId, deletedAt: null, include: { bookingSlots: true } }) → 404
 2. status ∈ [Pending, Confirmed] → else 409 'Only pending or confirmed bookings can be cancelled'
 3. RACE GATE: tx.booking.updateMany({ where: { id, tenantId, status: booking.status },
      data: { status: Cancelled, cancelledBy: userId, cancelledAt: now, updatedBy: userId } })
    count === 0 → 409 'Booking was modified by someone else'
 4. Release slots conditionally (safe if an admin Blocked one mid-flight — it stays Blocked, correct):
    tx.slot.updateMany({ where: { id: { in: bookingSlot.slotIds }, status: Booked }, data: { status: Available } })
 5. if dto.refund:
      paidAmount > 0 → else 400 'Nothing paid to refund'
      refund.amount ≤ paidAmount → else 400
      tx.payment.create({ type: Refund, status: Refunded, amount, method, issuedBy: memberId, paidBy: userId })
      tx.booking.update({ paidAmount: paidAmount − refund.amount, updatedBy: userId })
 6. tx.bookingEvent.create({ eventType: Cancelled, oldValue: { status }, newValue: { reason, refund? }, issuedBy: userId })
 7. createAuditLog(tx, { entityType: 'Booking', action: 'Update', newValue: { status: 'Cancelled', reason } })
```

### C. `recordPayment(tenantId, id, dto, { userId, memberId })`

```
$transaction:
 1. booking = tx.booking.findFirst({ id, tenantId, deletedAt: null }) → 404
 2. status ∈ [Pending, Confirmed, Completed] → else 409 'Cannot record payment on this booking'
 3. due = total − paidAmount ; dto.amount ≤ due → else 400 'Amount exceeds remaining due'
 4. RACE GATE (optimistic on denorm):
    tx.booking.updateMany({ where: { id, tenantId, paidAmount: booking.paidAmount },
      data: { paidAmount: booking.paidAmount + dto.amount, updatedBy: userId } })
    count === 0 → 409 'Booking balance changed, refresh'
 5. payment = tx.payment.create({ ..., status: Paid, type: dto.type ?? (amount >= due ? Due : Advance),
      issuedBy: memberId, paidBy: userId, paidAt: now })
 6. bookingEvent PaymentReceived { newValue: { amount, method, type } }
 7. createAuditLog(tx, { entityType: 'Payment', entityId: payment.id, action: 'Create', ... })
```

### D. `transitionStatus` helper — confirm / complete / no-show

```
allowed-from map: confirm: [Pending] → Confirmed
                  complete: [Confirmed] → Completed
                  no-show: [Pending, Confirmed] → NoShow

$transaction:
 1. findFirst tenant-scoped → 404
 2. current ∈ allowed-from → else 409
 3. RACE GATE: updateMany({ where: { id, tenantId, status: current }, data: { status: to, updatedBy } })
    count 0 → assert-exists → 409 'Booking is not in a state that allows this action'
 4. bookingEvent StatusChanged + AuditLog
(No slot changes — slots are Booked from creation in the staff flow.)
```

### E. `list(tenantId, query)` — read-only

Build `where` from the DTO (date range on `Booking.date` denorm; customer OR-filter; paidAmount/total for paymentStatus), `Promise.all([findMany, count])` with `skip/take`, enrich rows via `include: { court: { select: { name } }, customer: true }`. Return `{ data, total, page, limit, totalPages }` exactly like `SlotsService.findAll`.

### F. `getDayView(tenantId, date)`

```
1. await slotsService.releaseExpiredHolds(tenantId)   // made public in Task 1
2. courts = prisma.court.findMany({ tenantId, deletedAt: null }, orderBy name)
3. slots = prisma.slot.findMany({
     where: { tenantId, date, deletedAt: null },
     orderBy: [{ courtId: 'asc' }, { startTime: 'asc' }],
     include: { bookingSlots: { include: { booking: { include: { customer: { select: { firstName, lastName, phone } } } } } } } })
```

Response:

```jsonc
{
  "date": "YYYY-MM-DD",
  "courts": [{ "id", "name", "slotIntervalMinutes" }],
  "slots": [{
    "id", "courtId", "startTime", "endTime", "price", "status", "heldUntil?",
    "booking?": { "id", "customerName", "customerPhone", "status", "paymentStatus",
                  "total", "paidAmount", "due", "slotCount", "isStart" }
  }],
  "stats": { "bookingsCount", "totalSlots", "bookedSlots",
             "utilizationPct", "collected" }   // collected = Σ booking.paidAmount; pct = booked/total*100, 0 when total=0
}
```

`isStart: true` on each booking's chronologically first slot on that date (merged-block label position in the UI); continuation slots repeat the booking object with `isStart: false` (needed to occupy grid cells).

**Why purpose-built (not client-side join of `/slots` + `/bookings`)** — document in the controller:
1. `/slots` is paginated — the calendar needs ALL slots of ALL courts (breaks at ~8 courts × 30-min intervals ≈ 224 rows)
2. Booked cells need customer + payment summary — client join means N+1 detail fetches
3. Server marks booking block starts (`isStart`)
4. One request = one polling loop = one invalidation key

---

## Part 5: Verify

1. `npm run start:dev` compiles; all 9 endpoints + `/customers` in Swagger with response codes
2. Happy path via Swagger/curl: generate slots → `POST /bookings` (2 consecutive slots, payment) → 201; `GET /bookings/day-view?date=` shows merged booking (`isStart` on first slot only, `slotCount: 2`, stats updated); `GET /bookings/:id` shows events (Created, StatusChanged, PaymentReceived) + payment
3. `due` math: book without payment → due = total; record partial payment → Partial; record remainder → Paid
4. Slots released after cancel (verify `GET /slots?date=`); booking shows Cancelled event with reason
5. Edge cases from `task-9-testing-guide.md` sections 1–9 (races, guards, tenant isolation)

**Explicit DEVIATION comment to leave in code**: Booking denorm fields (`date/startTime/endTime/paidAmount`) — maintained transactionally here; a future standalone payments module MUST also maintain `paidAmount`.
