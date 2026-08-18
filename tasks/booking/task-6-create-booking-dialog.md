# Task 6: Create-Booking Dialog + Customer Typeahead

**Scope**: Frontend — the staff booking creation flow (one dialog, <30 seconds)
**Status**: ✅ Complete (August 18, 2026) — `create-booking-dialog.tsx` + `customer-search-field.tsx`; tsc/lint/build pass
**Priority**: CRITICAL
**Depends on**: Task 5 (grid provides `createContext`)

---

## Context

Staff are proxies for the customer AND the authority on inventory — the 6-step public wizard (booking-flow.md Part 1) is wrong for them. ONE dialog, three sections: What (pre-filled) / Who (phone-first lookup) / Payment (optional). Established dialog convention: **React Hook Form + zodResolver + `components/forms/form-field.tsx` helpers** (`RHFInput`, `RHFTextarea`, `RHFSwitch`; `RHFSelect` only for payment method; duration = plain Button chips). Reference implementation: `components/dashboard/slots/generate-slots-dialog.tsx`.

---

## Part 1: Files to Create

```
frontend/components/dashboard/bookings/
├── create-booking-dialog.tsx
└── customer-search-field.tsx
```

**Props**: `{ open, onOpenChange, court: { id, name, slotIntervalMinutes }, date: string, slots: DayViewSlot[] }` — `slots` = the clicked slot + all following slots of that court, sorted (page passes them from its day-view cache).

---

## Part 2: Dialog Layout (top to bottom)

### 1. Prefill header (read-only chips)

`{court.name} · {formatted date} · {start time}` — never editable here; changing = close and click another cell (one obvious way).

### 2. Duration chips (the price of the dialog — get this right)

- Chips `1× · 2× · 3× · 4×` (cap 8 internally; show up to 4 by default)
- Chip **N enabled** iff `consecutiveRunSlots(slots, 0) >= N` — i.e. the first N slots are chained (`endTime[i] === startTime[i+1]`), all `Available`, and all future. Disabled chips get `title="Not available"`
- Chip labels show wall-clock duration: `{N × slotIntervalMinutes}` minutes → "1 hr" / "1.5 hr" / "2 hr" (computed — courts differ)
- Selected N → `slotIds`; **live price preview** updates: `৳ (Σ Number(price) − discount)`
- Default selection: 1×

### 3. Customer — phone-first (customer-search-field.tsx)

- Debounced (300ms) input wired to `useCustomerSearch(term)` (Task 4); dropdown lists matches (`name · phone`); arrow-key + enter support
- **Pick** → fills `customerId`; name/phone/email shown read-only with "Use different customer" reset link
- **No match / free text mode** → `RHFInput firstName` + `lastName` + `phone` + optional `email` — auto-created on save
- Validation per `createBookingSchema` (Task 4): name required for new; phone-or-customerId required
- Strip non-digits before sending phone searches (`01711` matches `+880 1711-…`)

### 4. Extras

- `RHFSwitch` **"Save as tentative"** → `status: "Pending"` (helper text: "Slot is held for the customer; confirm later")
- `RHFInput type="number"` **Discount (৳)** — submit handler rejects `discount > subtotal` via `form.setError("discount")`
- `RHFTextarea` **Notes** (optional, ≤1000)

### 5. Payment (optional)

- `RHFSwitch` **"Collect cash now"**; when on → `RHFInput amount` (default = total) + `RHFSelect method` (Cash default; Card/MobileBanking listed but v1 is cash-first)
- Partial amount allowed → rest becomes Due; submit handler rejects `amount > total` via `form.setError`

### Footer

Running total (subtotal − discount) + `[Save booking]` primary. Button shows loading state during mutation (anti double-click).

---

## Part 3: Submit & Error Handling

`useCreateBooking().mutate(...)` (Task 4 hook — invalidations live there):

- **Success**: `toast.success("Booking created", { description: "Rahim · Fri 7:00–8:00 PM · Turf B" })` (customer + human time range — staff recognize these), close dialog, grid refreshes via invalidation
- **409 conflict** (another staff took a slot): component `onError` checks status === 409 → `toast.error("Slot was just taken", { description: "Another staff member booked it. The calendar has been refreshed." })`, close dialog, explicit `queryClient.invalidateQueries(bookingKeys.dayViews())` (hook `onSuccess` did NOT run — the component must refresh)
- **400** (validation drift, e.g. discount): map to `form.setError` on the offending field when identifiable, else generic `toast.error("Failed to create booking", { description: message })`
- **403**: generic error toast (permission) — backend is the enforcement point

---

## Part 4: UX Micro-Details

- Dialog opens with focus on the **customer phone field** (duration defaults to 1×) — the fastest walk-in path is type-phone → pick/create → Save
- Chip/price preview re-renders instantly (all from props — no fetches)
- Reset form state on close (`form.reset`) — no stale customer leaks into the next booking
- Keyboard: Enter submits (RHF default), Esc closes (Dialog default)

---

## Part 5: Verify

1. Walk-in happy path (target <30s): click available slot → type 3+ phone digits → existing customer appears → Save → merged block appears on grid
2. New customer: no match → enter name+phone → Save → customer auto-created (verify via `/customers?search=`)
3. Duration chips: book 2× on a court with two free consecutive slots → one 2-row block; chip 3× disabled when the 3rd slot is booked
4. Tentative: switch on → block shows amber "TENTATIVE" mini-badge, booking status Pending
5. Cash at creation: full → Paid chip; partial (500 of 800) → Partial chip "Due ৳300"; over-total amount rejected inline
6. Discount: 100 off 800 → total 700; discount > subtotal rejected inline
7. Conflict: hold the same slot open in a second tab's dialog, complete in first → second gets the 409 toast and closes with a refreshed grid
8. Cancel dialog mid-form → nothing created, form clean on reopen
