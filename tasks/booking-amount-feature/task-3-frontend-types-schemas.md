# Task 3: Frontend Types & Zod Schemas

**Priority**: HIGH
**Status**: PENDING
**Dependencies**: [Task 2](./task-2-backend-dto-service.md) (for API contract reference)

## Objective

Add `paymentMode` to frontend TypeScript types and Zod validation schemas.

## Changes Required

### 1. Update Booking Types

**File**: `frontend/lib/types/booking.ts`

Add the payment mode enum and extend booking types:

```typescript
export enum PaymentMode {
  NONE = 'none',
  BOOKING = 'booking',
  FULL = 'full',
  CUSTOM = 'custom',
}

export interface CreateBookingInput {
  courtId: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };
  customerId?: string;
  slotIds: string[];
  status?: 'Pending' | 'Confirmed';
  discount?: number;
  notes?: string;

  // NEW: Payment mode
  paymentMode?: PaymentMode;

  payment?: {
    amount: number;
    method: 'Cash' | 'Card' | 'MobileBanking';
  };
}
```

### 2. Update Zod Schema

**File**: `frontend/lib/schemas/booking.ts`

Add payment mode with validation:

```typescript
import { PaymentMode } from '@/lib/types/booking';

export const createBookingSchema = z.object({
  courtId: z.string().uuid(),
  customer: z.object({
    name: z.string().min(2, 'Name too short'),
    phone: z.string().regex(/^[0-9+\-\s]{6,20}$/, 'Invalid phone'),
    email: z.string().email().optional().or(z.literal('')),
  }).optional(),
  customerId: z.string().uuid().optional(),
  slotIds: z.array(z.string().uuid()).min(1, 'Select at least one slot'),
  status: z.enum(['Pending', 'Confirmed']).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),

  // NEW: Payment mode with conditional validation
  paymentMode: z.enum(['none', 'booking', 'full', 'custom']).optional(),

  payment: z.object({
    amount: z.number().min(0),
    method: z.enum(['Cash', 'Card', 'MobileBanking']),
  }).optional(),
}).refine(
  (data) => {
    // If paymentMode is 'custom', payment.amount is required
    if (data.paymentMode === 'custom') {
      return data.payment?.amount !== undefined && data.payment.amount > 0;
    }
    return true;
  },
  {
    message: 'Custom payment amount is required',
    path: ['payment', 'amount'],
  }
).refine(
  (data) => {
    // If paymentMode is 'none', payment should not be provided
    if (data.paymentMode === 'none' && data.payment) {
      return false;
    }
    return true;
  },
  {
    message: 'Payment should not be provided when mode is "none"',
    path: ['payment'],
  }
);
```

### 3. Type Exports

**File**: `frontend/lib/types/booking.ts`

Ensure types are properly exported for use in components and hooks:

```typescript
export type { CreateBookingInput, Booking, BookingListItem, /* ... */ };
export { PaymentMode };
```

## Notes

- Zod refinements provide runtime validation for conditional fields
- `paymentMode: 'none'` is effectively the current "no payment" behavior
- `paymentMode: 'booking'` and `'full'` don't require manual `amount` input
- `paymentMode: 'custom'` requires manual `amount` input (validated by refinement)

## Verification

1. TypeScript compiles without errors in types file
2. Zod schema validates correctly for all payment modes
3. Refinement errors show appropriate messages
4. Form validation works in booking dialog (next task)

## Next

After this task, proceed to [Task 4](./task-4-booking-dialog-ui.md) for the booking dialog UI implementation.
