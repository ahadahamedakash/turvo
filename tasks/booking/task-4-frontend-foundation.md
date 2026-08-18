# Task 4: Frontend Foundation (Types, Schemas, API, Hooks)

**Scope**: Frontend — everything the bookings UI needs except visible UI
**Status**: ✅ Complete (August 17, 2026) — build/lint/type-check pass; API shapes verified live against the Task 3 backend (day-view, create, cancel, list, customer search)
**Priority**: High
**Depends on**: Task 3 (backend endpoints exist to type against)

---

## Context

Lays the data layer for Tasks 5–8 following the established patterns: query-key factories (`hooks/slots.ts`), zod schemas (`lib/schemas/slot.ts`), API clients (`lib/api/`), types with money-as-string (`lib/types/slot.ts`).

---

## Part 1: shadcn Addition

```bash
cd frontend && npx shadcn@latest add tabs
```

Only `tabs`. Do NOT add popover/calendar/scroll-area (date nav = native chips; dialogs = existing Dialog/Sheet; grid scroll = `overflow-auto`). Do NOT add a date library — all grid times are `HH:mm` strings; pure string/number helpers go in `components/dashboard/bookings/grid-utils.ts` (Task 5).

---

## Part 2: Types

### `frontend/lib/types/enums.ts` — add

```typescript
export type BookingEventType = "Created" | "Updated" | "StatusChanged" | "Rescheduled" | "Cancelled" | "PaymentReceived";
```

(`BookingStatus`, `PaymentStatus`, `PaymentType`, `PaymentMethod` already exist there.)

### `frontend/lib/types/booking.ts` (NEW) — mirror backend DTOs exactly, money as `string`

```typescript
export interface CustomerInfo { customerId?: string; firstName: string; lastName: string; phone?: string; email?: string }
export interface CreatePaymentInfo { amount: number; method: PaymentMethod; referenceNumber?: string; type?: PaymentType }
export interface CreateBookingDto { slotIds: string[]; customer: CustomerInfo; status?: 'Pending' | 'Confirmed';
                                    discount?: number; notes?: string; payment?: CreatePaymentInfo }
export interface QueryBookingsParams { dateFrom?: string; dateTo?: string; courtId?: string; status?: BookingStatus;
                                       paymentStatus?: 'Paid' | 'Partial' | 'Unpaid'; customer?: string; page?: number; limit?: number }
export interface BookingListItem { id, date, startTime, endTime, courtId, courtName, customerId, customerName,
                                    customerPhone, slotCount, durationLabel, status: BookingStatus, subTotal, discount,
                                    total, paidAmount, due: string; paymentStatus: 'Paid'|'Partial'|'Unpaid'; createdAt: string }
export interface BookingListResponse { data: BookingListItem[]; total: number; page: number; limit: number; totalPages: number }
export interface PaymentRecord { id, amount, method, type, status, referenceNumber?, createdAt, issuedByName: string }
export interface BookingEventRecord { id, eventType: BookingEventType, createdAt, issuedByName, summary: string }
export interface BookingDetail extends BookingListItem {
  notes?: string; customer: { id, firstName, lastName, phone?, email? };
  slots: { id, startTime, endTime, price: string, status: SlotStatus }[];
  payments: PaymentRecord[]; events: BookingEventRecord[];
  createdByName: string; cancelledByName?: string; cancelledAt?: string;
}
export interface DayViewBooking { id, customerName, customerPhone, status: BookingStatus, paymentStatus,
                                  total, paidAmount, due: string; slotCount: number; isStart: boolean }
export interface DayViewSlot { id, courtId, startTime, endTime, price: string, status: SlotStatus,
                               heldUntil?: string; booking?: DayViewBooking }
export interface DayViewResponse { date: string; courts: { id, name, slotIntervalMinutes }[];
                                   slots: DayViewSlot[]; stats: { bookingsCount, totalSlots, bookedSlots,
                                   utilizationPct: number; collected: string } }
```

### `frontend/lib/types/customer.ts` (NEW)

`CustomerOption { id, firstName, lastName, phone?, email? }`

---

## Part 3: Zod Schemas — `frontend/lib/schemas/booking.ts` (NEW)

**Repo rule: use `message` in options objects, NEVER `errorMap`.**

```typescript
export const createBookingSchema = z.object({
  slotIds: z.array(z.string().uuid()).min(1, "Select at least one slot").max(8),
  customer: z.object({
    customerId: z.string().uuid().optional(),
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    phone: z.string().regex(/^[0-9+\-\s]{6,20}$/, "Enter a valid phone").optional().or(z.literal("")),
    email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  }).refine(c => c.customerId || c.phone || c.email,
            { message: "Phone is required for new customers", path: ["phone"] }),
  status: z.enum(["Pending", "Confirmed"]).default("Confirmed"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  notes: z.string().max(1000).optional(),
  payment: z.object({ amount: z.coerce.number().min(1, "Amount must be positive"),
                      method: z.enum(["Cash", "Card", "MobileBanking"]).default("Cash") }).optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be positive"),
  method: z.enum(["Cash", "Card", "MobileBanking"]).default("Cash"),
  referenceNumber: z.string().max(100).optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(255),
  refund: z.object({ amount: z.coerce.number().min(1), method: z.enum(["Cash", "Card", "MobileBanking"]).default("Cash") }).optional(),
});
```

Amount-vs-total / amount-vs-due checks need live slot prices → run them in the **submit handler** (`form.setError`), NOT in the schema.

---

## Part 4: API Clients

### `frontend/lib/api/bookings.ts` (NEW)

```typescript
bookingsApi = {
  list: (params?) => apiClient.get<BookingListResponse>("/bookings", { params }),
  get: (id) => apiClient.get<BookingDetail>(`/bookings/${id}`),
  dayView: (date) => apiClient.get<DayViewResponse>("/bookings/day-view", { params: { date } }),
  create: (data: CreateBookingDto) => apiClient.post<BookingDetail>("/bookings", data),
  confirm: (id) => apiClient.post<BookingDetail>(`/bookings/${id}/confirm`),
  complete: (id) => apiClient.post<BookingDetail>(`/bookings/${id}/complete`),
  noShow: (id) => apiClient.post<BookingDetail>(`/bookings/${id}/no-show`),
  cancel: (id, data: CancelBookingDto) => apiClient.post<BookingDetail>(`/bookings/${id}/cancel`, data),
  recordPayment: (id, data) => apiClient.post<PaymentRecord>(`/bookings/${id}/payments`, data),
};
```

### `frontend/lib/api/customers.ts` (NEW)

`customersApi.search(search)` → `GET /customers?search=&limit=10` → `{ data: CustomerOption[] }` (strip non-digits from numeric input before sending so `01711` matches `+880 1711-…`).

---

## Part 5: Hooks

### `frontend/hooks/bookings.ts` (NEW)

Key factory (mirror `slotKeys` in `hooks/slots.ts`):

```typescript
export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (params?) => [...bookingKeys.lists(), params] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id) => [...bookingKeys.details(), id] as const,
  dayViews: () => [...bookingKeys.all, "day-view"] as const,
  dayView: (date) => [...bookingKeys.dayViews(), date] as const,
};
```

Queries:
- **`useDayView(date)`** — THE override point: `staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true` (globals are 5 min / false — live multi-staff calendar needs freshness)
- `useBookings(params)` — staleTime 30s (like `useSlots`)
- `useBooking(id)` — `enabled: !!id`

Mutations — invalidation map (hooks invalidate; **toasts stay in components**, repo convention):

| Mutation | Invalidates |
|---|---|
| `useCreateBooking` | `bookingKeys.dayViews()`, `bookingKeys.lists()`, **`slotKeys.lists()`** |
| `useConfirmBooking` / `useCompleteBooking` / `useNoShowBooking` | `bookingKeys.detail(id)`, `.lists()`, `.dayViews()` |
| `useCancelBooking` | detail + lists + dayViews + **`slotKeys.lists()`** |
| `useRecordPayment` | detail + lists + dayViews |

The `slotKeys` cross-invalidation is deliberate: booking mutations change slot statuses the Slots page shows.

### `frontend/hooks/customers.ts` (NEW)

`useCustomerSearch(term)` — `customerKeys.search(term)` key; `enabled: term.replace(/\D/g, "").length >= 3 || term.length >= 2`; staleTime 30s; no polling. Debounce (300ms) lives in the input component (Task 6) so the key changes once typing settles.

### `frontend/hooks/use-permissions.ts` (NEW) + `frontend/lib/jwt.ts` (MODIFY) — `[DEVIATION: 2-line type change]`

The JWT already carries `tenantContext.permissions` (verified in backend `jwt.strategy.ts`/`tenant.guard.ts`); the frontend `JWTPayload` type just doesn't surface it. Extend:

```typescript
tenantContext?: { tenantId: string; tenantMemberId: string; permissions: string[] }
```

```typescript
export function usePermissions() {
  // → { hasPermission: (p: string) => boolean }
  // direct match | `${module}.all` wildcard | isSuperAdmin bypass
}
```

UX-only gating (hide/disable buttons); the backend remains the enforcement point and 403s are still toasted.

---

## Part 6: Verify

1. `npm run lint` + type-check pass; `npm run build` succeeds
2. `useDayView(todayIso)` in a throwaway render returns data (backend from Task 3 running)
3. Verify query-devtools shows `["bookings", "day-view", "<date>"]` key and 60s refetch interval
4. No `new Date()` during render anywhere (react-hooks/purity rule) — module-scope defaults only
