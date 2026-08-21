# Task 2: Backend DTO & Service Changes

**Priority**: CRITICAL
**Status**: PENDING
**Dependencies**: [Task 1](./task-1-schema-addition.md) must be complete

## Objective

Update backend DTOs and booking service to support the new payment mode system (`booking`, `full`, `custom`) and handle booking amount calculations.

## Changes Required

### 1. Update Tenant DTO

**File**: `backend/src/modules/tenants/dto/update-tenant.dto.ts`

Add `bookingAmount` with validation:

```typescript
@ApiPropertyOptional({
  description: 'Minimum required booking amount (advance/deposit)',
  example: 500
})
@IsOptional()
@IsPositive({ message: 'Booking amount must be positive' })
bookingAmount?: number;

// Transform to Decimal in service
```

### 2. Update CreateBookingDto

**File**: `backend/src/modules/bookings/dto/create-booking.dto.ts`

Add payment mode enum:

```typescript
export enum PaymentMode {
  NONE = 'none',
  BOOKING = 'booking',      // Collect configured booking amount
  FULL = 'full',            // Collect full payment
  CUSTOM = 'custom',        // Custom manual amount
}

@ApiPropertyOptional({
  description: 'Payment collection mode',
  enum: PaymentMode,
  example: PaymentMode.BOOKING
})
@IsOptional()
@IsEnum(PaymentMode, { message: 'Invalid payment mode' })
paymentMode?: PaymentMode;
```

### 3. Update BookingsService

**File**: `backend/src/modules/bookings/bookings.service.ts`

Modify `create()` method to handle payment modes:

```typescript
async create(dto: CreateBookingDto, actor: ActorInfo) {
  return this.prisma.$transaction(async (tx) => {
    // ... existing slot booking logic ...

    const subTotal = slots.reduce((sum, s) => sum.add(s.price), new Prisma.Decimal(0));
    const discount = new Prisma.Decimal(dto.discount ?? 0);
    const total = subTotal.sub(discount);

    // NEW: Payment calculation based on mode
    let paymentData;
    if (dto.paymentMode && dto.paymentMode !== PaymentMode.NONE) {
      let amount: Prisma.Decimal;

      switch (dto.paymentMode) {
        case PaymentMode.BOOKING:
          // Collect configured booking amount (capped at total)
          const bookingAmount = tenant.bookingAmount ?? new Prisma.Decimal(0);
          amount = bookingAmount.gt(total) ? total : bookingAmount;
          break;

        case PaymentMode.FULL:
          // Collect full amount
          amount = total;
          break;

        case PaymentMode.CUSTOM:
          // Manual amount from dto.payment
          if (!dto.payment?.amount) {
            throw new BadRequestException('Payment amount required for custom mode');
          }
          amount = new Prisma.Decimal(dto.payment.amount);
          if (amount.gt(total)) {
            throw new BadRequestException('Payment amount exceeds booking total');
          }
          break;

        default:
          throw new BadRequestException('Invalid payment mode');
      }

      paymentData = {
        amount,
        method: dto.payment?.method ?? PaymentMethod.Cash,
        type: amount.lt(total) ? PaymentType.Advance : PaymentType.Due,
      };
    }

    // ... rest of existing booking creation logic ...
  });
}
```

### 4. Update Swagger Documentation

**File**: `backend/src/modules/bookings/bookings.controller.ts`

Ensure `@ApiBody()` includes the new `paymentMode` field with proper documentation.

### 5. Add Tenant Query for Booking Amount

The service will need to query the tenant's `bookingAmount` when processing a booking. Ensure `@CurrentTenant()` decorator provides access to tenant data including the new field.

## Verification

1. Create booking with `paymentMode: 'booking'` → verify payment amount equals configured booking amount
2. Create booking with `paymentMode: 'full'` → verify payment amount equals booking total
3. Create booking with `paymentMode: 'custom'` → verify custom amount is used
4. Create booking with `paymentMode: 'none'` → verify no payment record created
5. Test with `bookingAmount > total` → verify amount is capped at total
6. Test with `bookingAmount = null` → verify 'booking' mode defaults to 0

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| `bookingAmount` not set | Payment mode 'booking' collects 0 (effectively 'none') |
| `bookingAmount > total` | Cap at total (same as 'full' mode) |
| `paymentMode: 'custom'` without amount | 400 Bad Request |
| Invalid `paymentMode` | 400 Bad Request |

## Next

After this task, proceed to [Task 3](./task-3-frontend-types-schemas.md) for frontend types and schemas.
