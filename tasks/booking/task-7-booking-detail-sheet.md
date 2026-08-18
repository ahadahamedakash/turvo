# Task 7: Booking Detail Sheet + Lifecycle Actions

**Scope**: Frontend — right-side detail sheet, event timeline, record-payment & cancel dialogs
**Status**: ✅ Complete (August 18, 2026) — `booking-detail-sheet.tsx` + `record-payment-dialog.tsx` + `cancel-booking-dialog.tsx`; tsc/lint/build pass
**Priority**: High
**Depends on**: Task 5 (grid opens the sheet via `detailBookingId`)

---

## Context

Clicking any booked block opens a **side Sheet** (shadcn `Sheet side="right"`, `sm:max-w-md`) so the calendar stays visible — staff keep context of the day while working a booking. The sheet is the operational cockpit: money math, history, and every lifecycle action.

---

## Part 1: Files to Create

```
frontend/components/dashboard/bookings/
├── booking-detail-sheet.tsx
├── record-payment-dialog.tsx
└── cancel-booking-dialog.tsx
```

Props: `{ bookingId: string | null, onOpenChange }` — data via `useBooking(bookingId)` (Task 4; enabled only when id set).

---

## Part 2: Sheet Layout (top → bottom)

1. **Header**: `Booking {shortId}` + `BookingStatusBadge`; close button
2. **Customer card**: avatar initials, name, phone (tap-to-call `tel:` link), email if present, notes if present
3. **When/where**: court name · date · `{start}–{end}` · duration label (`slotCount` slots)
4. **Price breakdown**:
   ```
   Subtotal      ৳ 1,600
   Discount     −৳ 100
   Total         ৳ 1,500
   Paid          ৳ 500
   Due           ৳ 1,000   ← highlighted (amber) when > 0
   ```
5. **Payments list**: one row per payment — method badge, type (Advance/Due/Refund), amount (refunds negative/red), date, `issuedByName`
6. **Event timeline** (`events`, newest first): vertical dot list; icon per `BookingEventType` (Created ✓, StatusChanged →, PaymentReceived ৳, Cancelled ✕, Updated ✎); `Cancelled` event renders the reason from `newValue`; each entry shows `issuedByName` + relative/timestamp
7. **Action bar** (contextual — see Part 3)

## Part 3: Action Bar — status × permission matrix

Visibility = booking status AND `usePermissions().hasPermission(...)` (Task 4 hook):

| Action | Shown when status is | Permission | Behavior |
|---|---|---|---|
| Confirm | Pending | `Booking.update` | `useConfirmBooking` → blue block turns solid |
| Record payment | Pending, Confirmed, Completed | `Payment.create` | opens RecordPaymentDialog |
| Mark completed | Confirmed | `Booking.update` | `useCompleteBooking` |
| Mark no-show | Pending, Confirmed | `Booking.update` | `useNoShowBooking` |
| Cancel | Pending, Confirmed | `Booking.update` | opens CancelBookingDialog (destructive styling) |

Completed/Cancelled/NoShow bookings show a muted "No actions" note instead of the bar. Buttons carry loading states; success toasts include customer + outcome ("Cancelled · Rahim · Fri 7–8pm · slots released").

## Part 4: RecordPaymentDialog

- `RHFInput amount` **default = remaining due**; `RHFSelect method` (Cash default); optional `RHFInput referenceNumber`
- Client guard: amount > due → inline error (server also enforces)
- Server 409 "balance changed" (concurrent payment) → toast + invalidate detail & day-view; dialog stays open with refreshed due
- Success → toast ("৳1,000 received · Cash"), dialog closes, sheet money rows update

## Part 5: CancelBookingDialog

- `RHFTextarea reason` **required** (≤255) — always, no exceptions
- If `paidAmount > 0`: refund section appears — `RHFSwitch "Refund advance"` + `RHFInput amount` (max = paidAmount, client-clamped; server enforces) + method
- Pre-submit summary line: "Turf B · Fri 7–8 PM · ৳1,500 · refund ৳500 — slots will be released"
- Success toast explicitly mentions released slots (staff's mental model: canceling frees inventory)
- 409 "modified by someone else" → toast + close + invalidate

---

## Part 6: Conventions

- All mutations from Task 4 hooks (invalidation handled there); toasts in these components
- Money via `৳{Number(x).toLocaleString()}`; dark-mode `.dark:` pairs throughout
- Sheet overlays the grid — do not cover full width; max-w keeps 2–3 court columns visible on desktop
- Refund rows in payments list render red/negative so the ledger reads correctly at a glance

---

## Part 7: Verify

1. Click booked block → sheet opens with correct customer/money/timeline (compare against `GET /bookings/:id` in Swagger)
2. Confirm flow: tentative block (amber) → Confirm → block turns solid blue, event added, sheet updates
3. Record payment: partial → Due shrinks, Partial chip updates on grid; full → Paid chip
4. 409 path: record payment in two tabs simultaneously → second gets "balance changed" toast, amounts stay correct
5. Cancel with refund: slots return to Available on the grid (visible immediately), refund row appears in payments, Cancelled event carries the reason
6. Cancel unpaid → no refund section shown
7. Action matrix: Pending shows Confirm+Cancel+Record payment; Completed shows only Record payment; Cancelled shows none
8. Permission gating: staff role without `Booking.update` → action bar buttons hidden (backend still 403s on direct API call)
