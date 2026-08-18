# Task 5: Bookings Page — Day-View Calendar UI

**Scope**: Frontend — `/dashboard/bookings` page shell + the day grid (the heart of the product)
**Status**: ✅ Complete — verified August 18, 2026 (tsc/lint/build pass; grid geometry = minutes × 1.5px column-stack)
**Priority**: CRITICAL
**Depends on**: Task 4 (hooks/types); sidebar already links `/dashboard/bookings` ("Live" badge — page file missing)

---

## Context

Staff land here to answer "what's today look like?" in one screen. The grid IS the app: rows = time, columns = courts, one cell per slot, merged blocks for multi-slot bookings, live now-line, past-dimming. This task delivers the page skeleton, calendar tab, and all cell rendering. Booking creation (click → dialog) and detail sheet (click booked → sheet) are wired as handlers here but their UI ships in Tasks 6–7 (stub with console/TODO until then is acceptable ONLY if Tasks 6–7 immediately follow).

**Design reference**: `tasks/booking/README.md` "UX Design Summary".

---

## Part 1: Files to Create

```
frontend/app/dashboard/bookings/page.tsx            # "use client" BookingsPage
frontend/components/dashboard/bookings/
├── date-strip.tsx            # horizontal day chips + ◀ ▶ + Today
├── day-stats-strip.tsx       # bookings · utilization % · collected ৳
├── booking-calendar.tsx      # the grid (gutter + columns + now-line)
├── slot-cell.tsx             # all 5 cell variants + merged booked block + filler
├── held-countdown.tsx        # mm:ss ticker
├── now-line.tsx              # 2px teal indicator (today only)
├── empty-day-state.tsx       # generate-slots CTA / pricing-rules pointer
├── booking-status-badge.tsx  # Pending/Confirmed/Completed/Cancelled/NoShow
├── payment-chip.tsx          # Paid / Partial (Due ৳x) / Unpaid
└── grid-utils.ts             # pure helpers (no Date during render)
```

## Part 2: Component Tree

```
page.tsx
├── Header (title + live pulse dot; search input arrives with Task 8's needs — skip for now)
├── Tabs defaultValue="calendar"                     ← shadcn Tabs (added in Task 4)
│   ├── TabsTrigger "Calendar" | "List"             (List content = Task 8 placeholder)
│   ├── TabsContent calendar
│   │   ├── DateStrip                               # selectedDate state lives here in page
│   │   ├── DayStatsStrip                           # from dayView.stats
│   │   ├── BookingCalendar
│   │   │   ├── TimeGutter (56px fixed, hourly labels)
│   │   │   ├── NowLine (absolute overlay, today only)
│   │   │   └── CourtColumn × N (min-w ~200px each, horizontal scroll)
│   │   └── EmptyDayState (when slots.length === 0)
│   └── TabsContent list → <BookingsDataTable /> (Task 8)
├── <CreateBookingDialog />   (Task 6)
└── <BookingDetailSheet />    (Task 7)
```

Page state: `selectedDate` (default = module-scope `DEFAULT_TODAY = toISODate(new Date())` — REACT PURITY: never `new Date()` during render), `createContext: { court, date, slot } | null`, `detailBookingId: string | null`.

---

## Part 3: Grid Geometry — column-stack, NOT an HTML table `[DEVIATION from literal rowspan — same visual]`

Courts have different `slotIntervalMinutes` (30/45/60/90/120) → shared table rows cannot align across columns. Instead:

- Outer: `flex` — fixed 56px `TimeGutter` + `flex-1 overflow-x-auto` row of `CourtColumn`s
- Each column: vertical stack of slot blocks; **height ∝ minutes**: `style={{ height: minutes * 1.5 }}` (px per minute = 1.5; single constant exported from `grid-utils.ts`)
- A multi-slot booking renders **ONE block** of summed height (`totalMinutes × 1.5`) starting at its first slot; continuation slots render an empty `bg-blue-50/60 dark:bg-blue-950/40` filler (no border, not clickable)
- Gutter labels hourly from the day's min slot start to max end (compute from data, not assumptions)
- **NowLine**: absolutely positioned 2px teal line at `top = minutesSinceDayStart(now) × 1.5`; `nowMinute` from a `useEffect` interval (60s). Only rendered when viewing today
- **Past**: `isPast(date, slot.endTime)` vs client clock (venue staff run in venue tz; times are wall-clock strings) → `opacity-50 pointer-events-none`

### `grid-utils.ts` (pure functions — string math, no Date objects)

```
minutesOf("09:30") → 570
fmtHHmm(570) → "09:30"
addMinutes("09:30", 45) → "10:15"
toISODate(date: Date) → "YYYY-MM-DD"              // only called at module scope / in effects
isPast(dateIso, endTime, nowMinute) → boolean
buildDayModel(dayView) → per-court array of blocks: AvailableBlock | BookedBlock(start + fillers) | HeldBlock | BlockedBlock
  // buildDayModel consumes consecutive runs: iterate a court's slots, when slot.booking?.isStart
  // open a merged block spanning that booking's slotCount, mark following slots as fillers
consecutiveRunSlots(slots, startIndex) → max N where slots[start..start+N) are chained
  (endTime[i] === startTime[i+1]) AND status Available AND future — used by Task 6 duration chips
```

---

## Part 4: Cell Rendering Rules

| Slot state | Render | Click |
|---|---|---|
| `Available` (future) | price `৳{Number(price).toLocaleString()}`, subtle green tint, hover ring + "Book" affordance | opens `CreateBookingDialog` (sets `createContext`) |
| `Available` (past) | dimmed price, `cursor-not-allowed` | none |
| `Booked` (isStart) | ONE merged block: customer name, mini `BookingStatusBadge` (Pending = amber "TENTATIVE"), `PaymentChip` (Paid / Due ৳x) | opens `BookingDetailSheet` (sets `detailBookingId`) |
| `Booked` (continuation) | empty filler (part of the visual block above) | click anywhere on block → sheet |
| `Held` | amber striped + `HeldCountdown` (1s interval from `heldUntil`; on expiry → `invalidateQueries(bookingKeys.dayView(date))`) | none |
| `Blocked` | gray/red tint + `Lock` icon + "Blocked" | none (unblock stays on the Slots page — its permission domain) |

**Colorblind-safe rule**: status is never color alone — booked solid / held striped / blocked hatched, plus text labels everywhere. Palette families reuse `slot-status-badge.tsx` (green Available / blue Booked / amber Held / red Blocked / gray Expired) with `.dark:` pairs.

**Status badge palettes** (`booking-status-badge.tsx`): Pending amber · Confirmed blue · Completed green · Cancelled gray · NoShow red. **Payment chip**: Paid green · Partial amber ("Due ৳x") · Unpaid gray.

---

## Part 5: DateStrip & Stats

- `DateStrip`: horizontal chips — 7-day window ending at selected date (or centered on it), each chip = weekday short + day number; today highlighted; weekend/holiday dates flagged (holiday check via existing `useSlotHolidays` if exported, else weekend from `useSlotSettings.weekendDays` — verify hook names in `hooks/slots.ts` and reuse, don't duplicate); `◀ ▶` shifts the window; **Today** button jumps back; native `<input type="date">` affordance for arbitrary jump (no calendar lib)
- `DayStatsStrip`: from `dayView.stats` — Bookings count · Utilization % · Collected ৳. Styled like the slots page's stat cards but compact (one line, 3 quiet cards — no vanity dashboard)

## Part 6: EmptyDayState (when `slots.length === 0`)

Two branches:
1. **Date beyond generation horizon** (compare against `useSlotSettings`'s `autoGenerateDaysAhead`): "No slots for this date yet" + **[Generate slots]** button → existing `useGenerateSlots().mutate({ startDate: date, endDate: date })` + component-level `queryClient.invalidateQueries(bookingKeys.dayViews())` + toast with `generated` count. Do NOT modify `hooks/slots.ts` — cross-module invalidation stays in this component (repo convention)
2. **Date within horizon but empty** → "No slots yet — pricing rules may be missing" + link to `/dashboard/pricing-rules`

---

## Part 7: States & Conventions

- Loading: skeleton grid (gutter + gray placeholder blocks — no spinner-only)
- Error: inline retry row above the grid
- `useDayView(selectedDate)` — the 60s-polling hook from Task 4
- Dark mode: every new component carries `.dark:` pairs (match existing badge styles)
- All money rendered via `৳{Number(x).toLocaleString()}`

---

## Part 8: Verify

1. `/dashboard/bookings` loads on today; grid renders all courts × slots from real data
2. Merged blocks: book 2 consecutive slots (via Swagger from Task 3) → ONE block spanning 2 slot-heights with name + chip; `isStart` only on first
3. Now-line visible on today, absent on other dates; past cells dimmed and unclickable
4. Date strip: navigate days, Today jump, weekend flag; empty date beyond horizon → Generate CTA works and grid fills
5. Dark mode + mobile viewport (horizontal column scroll works)
6. `npm run lint` + type-check + `npm run build`; no `new Date()` during render (purity lint)
7. Two-browser smoke: book in window A (Swagger) → appears in window B within ≤60s (polling)
