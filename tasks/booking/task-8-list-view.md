# Task 8: Bookings List View (Table + Filters)

**Scope**: Frontend — the "List" tab of `/dashboard/bookings`
**Status**: ✅ Complete (August 18, 2026) — `booking-filters.tsx` + `bookings-data-table.tsx` + `hooks/use-debounce.ts`; tsc/lint/build pass
**Priority**: Medium
**Depends on**: Task 4 (hooks), Task 5 (tab shell), Task 7 (row click → detail sheet)

---

## Context

The calendar runs the day; the **List** answers "show me all bookings for next week / that customer / every unpaid booking". Mirrors the existing data-table pattern from the slots page (`components/dashboard/slots/slots-data-table.tsx`) so the two pages feel like one product.

---

## Part 1: Files to Create

```
frontend/components/dashboard/bookings/
├── booking-filters.tsx
└── bookings-data-table.tsx
```

## Part 2: Filters (`booking-filters.tsx`)

State lives in `page.tsx` list branch (or a small `useState` cluster passed down — follow the slots page's pattern):

| Filter | Control | Values |
|---|---|---|
| Date from / to | two native `<Input type="date">` | default: today → +7 days |
| Court | Select from `useCourts({ limit: 100 })` | All courts + each court |
| Status | Select | All / Pending / Confirmed / Completed / Cancelled / NoShow |
| Payment | Select | All / Paid / Partial / Unpaid |
| Customer | text input, debounced 400ms, min 2 chars | name or phone |

**Any filter change resets `page` to 1** (slots-page behavior).

## Part 3: Data Table (`bookings-data-table.tsx`)

shadcn `Table` inside a `Card` (slots-page style). Columns:

| Column | Content |
|---|---|
| Date | formatted date (existing `formatDate` helper pattern — no TZ shift) |
| Time | `{start} – {end}` (12h format helper) |
| Court | court name |
| Customer | name + phone stacked |
| Duration | `durationLabel` (e.g. "2 slots · 2h") |
| Total / Paid / Due | `৳` amounts; Due amber when > 0 |
| Status | `BookingStatusBadge` (Task 5) |
| Payment | `PaymentChip` (Task 5) |

- **Row click → `BookingDetailSheet`** (Task 7 — same sheet instance as the calendar; one source of truth for detail)
- Footer: `Page x of y` + prev/next buttons (slots-table pagination style)
- Loading: skeleton rows; empty: "No bookings match these filters" + **[Clear filters]** button
- Data via `useBookings(params)` (staleTime 30s — no polling here; mutations invalidate)

## Part 4: Conventions

- Reuse `BookingStatusBadge` / `PaymentChip` from Task 5 — do NOT create list-specific variants
- Money formatting identical to the grid (`৳{Number(x).toLocaleString()}`)
- Dark-mode pairs; dense but readable (this is the "professional ops tool" aesthetic — no oversized paddings)

## Part 5: Verify

1. Default load: today → +7d list appears with pagination
2. Each filter narrows correctly (spot-check against `GET /bookings?...` in Swagger — esp. `paymentStatus=Unpaid` and customer phone search)
3. Filter change mid-pagination resets to page 1
4. Row click opens the same detail sheet used by the calendar; actions from the sheet reflect back in the table after invalidation (e.g. status changes to Cancelled)
5. Empty state + Clear filters round-trip works
6. Mobile: table scrolls horizontally inside its card (matches slots page)
