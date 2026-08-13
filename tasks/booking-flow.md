# Booking Flow Overview

**Type**: Reference Document (Not a Task)
**Purpose**: Explain the complete booking lifecycle for future implementation

---

## The Booking Flow

This document explains how a customer booking flows through the system, from slot selection to completion.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Pricing Rules  │────▶│      Slots      │────▶│     Bookings    │
│  (Admin Setup)  │     │  (Inventory)    │     │  (Transactions) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Part 1: Customer-Facing Booking Flow

### The Quick Book Wizard

**Route**: `/book` (public-facing, no auth required for viewing)

**UX Flow**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Select Court                                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  Turf A     │  │  Turf B     │  │  Turf C     │           │
│  │  5-a-side   │  │  7-a-side   │  │  Indoor     │           │
│  │  From 500   │  │  From 800   │  │  From 1000  │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Select Date                                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Thu, Aug 15                                    ▼           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: Select Duration                                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │  1 hr   │  │ 1.5 hr  │  │ 2 hrs   │  │ Custom  │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Available Start Times                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  9:00 AM  →  Total: 500 BDT      [Quick Book]              ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  10:00 AM →  Total: 500 BDT      [Quick Book]              ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  11:00 AM →  Total: 500 BDT      [Quick Book]              ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  2:00 PM  →  Total: 800 BDT      [Quick Book]              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Showing only available start times for your selection         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: Customer Information                                  │
├─────────────────────────────────────────────────────────────────┤
│  Name: ________________                                         │
│  Email: ________________                                        │
│  Phone: ________________                                        │
│                                                                 │
│  [Continue to Payment]                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: Payment                                               │
├─────────────────────────────────────────────────────────────────┤
│  Total: 500 BDT                                                │
│                                                                 │
│  Payment Method:                                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │  Cash         │  │  Bkash        │  │  Card         │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                                 │
│  [Complete Booking]                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Booking Confirmed!                                           │
│  Thank you! Your booking has been confirmed.                   │
│  Booking ID: #12345                                            │
│  Check your email for details.                                 │
│                                                                 │
│  [View Booking]  [Book Another]                                │
└─────────────────────────────────────────────────────────────────┘
```

### What Happens Behind the Scenes

**When customer clicks "Quick Book" on a time slot**:

```typescript
// Frontend calls backend
POST /bookings/hold
{
  "slotId": "uuid",
  "duration": 1, // hours
}

// Backend responds with hold
{
  "bookingId": "uuid",
  "holdUntil": "2025-08-15T09:15:00Z", // 15 min from now
  "total": 500
}
```

**When customer completes payment**:

```typescript
// Frontend calls backend
PUT /bookings/:bookingId/confirm
{
  "customerInfo": { ... },
  "payment": { method: "Cash", amount: 500 }
}

// Backend processes in ONE transaction:
// 1. Update booking status: Pending → Confirmed
// 2. Update slot status: Held → Booked
// 3. Create payment record
// 4. Create booking events
// 5. Send confirmation email
```

---

## Part 2: Backend Booking Service

### Key Methods

```typescript
// Hold slot and create pending booking
async initiateBooking(tenantId: string, slotId: string, duration: number): Promise<Booking>

// Confirm booking with customer and payment
async confirmBooking(
  tenantId: string,
  bookingId: string,
  customerInfo: CreateCustomerDto,
  payment: CreatePaymentDto
): Promise<Booking>

// Cancel booking
async cancelBooking(tenantId: string, bookingId: string, userId: string): Promise<Booking>

// Release booking hold (timeout or customer cancel)
async releaseBookingHold(tenantId: string, bookingId: string): Promise<Booking>
```

### Transaction Flow

```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Check slot availability
  const slot = await tx.slot.findUnique({
    where: { id: slotId, status: SlotStatus.Available },
  });

  if (!slot) {
    throw new ConflictException('Slot not available');
  }

  // 2. Hold slot
  const heldUntil = new Date();
  heldUntil.setMinutes(heldUntil.getMinutes() + 15);

  await tx.slot.update({
    where: { id: slotId },
    data: {
      status: SlotStatus.Held,
      heldAt: new Date(),
      heldBy: userId,
      heldUntil,
    },
  });

  // 3. Create pending booking
  const booking = await tx.booking.create({
    data: {
      tenantId,
      courtId: slot.courtId,
      slotId,
      status: BookingStatus.Pending,
      subTotal: slot.price * duration,
      total: slot.price * duration,
      createdBy: userId,
    },
  });

  // 4. Create booking event
  await tx.bookingEvent.create({
    data: {
      tenantId,
      bookingId: booking.id,
      eventType: BookingEventType.Created,
      newValue: booking,
      issuedBy: userId,
    },
  });

  return booking;
});
```

---

## Part 3: Booking Lifecycle States

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Pending  │────▶│  Held     │────▶│ Confirmed │────▶│ Completed │
│  (created)│     │ (payment) │     │  (paid)   │     │ (session) │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                      │
                      ▼
                 ┌───────────┐
                 │ Cancelled │
                 │ NoShow    │
                 └───────────┘
```

**State Transitions**:

| From | To | Trigger | Creates Event |
|------|-----|---------|---------------|
| - | Pending | Booking created | Created |
| Pending | Held | Payment started | StatusChanged |
| Held | Confirmed | Payment received | PaymentReceived, StatusChanged |
| Held | Pending | Hold expired (no payment) | StatusChanged |
| Confirmed | Completed | Session time passed | StatusChanged |
| Pending/Held/Confirmed | Cancelled | Admin/ Customer cancel | Cancelled |
| Confirmed | NoShow | Session time passed, no show | StatusChanged |

---

## Part 4: Admin Booking Management

**Route**: `/dashboard/bookings` (admin-only)

Admin can:
- View all bookings with filters (date, court, status, customer)
- View booking details with full history
- Cancel bookings
- Mark no-shows
- Process refunds
- View booking events timeline

**Booking Events Timeline**:
```
┌─────────────────────────────────────────────────────────────┐
│  Booking #12345 Timeline                                     │
├─────────────────────────────────────────────────────────────┤
│  ● Aug 15, 09:00 - Created by Admin                         │
│  ● Aug 15, 09:05 - Status: Pending → Held                   │
│  ● Aug 15, 09:10 - Payment received: 500 BDT (Cash)          │
│  ● Aug 15, 09:10 - Status: Held → Confirmed                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 5: Future Enhancements

### 5.1 Multi-Slot Booking

Allow booking consecutive slots in one transaction:

```
Customer selects: 2:00 PM, Duration: 2 hours
Backend checks:
- Slot at 2:00 PM: Available ✓
- Slot at 3:00 PM: Available ✓
→ Creates booking for both slots
```

### 5.2 Recurring Bookings

Allow booking same time slot for multiple weeks:

```
Customer selects: Every Saturday, 2:00 PM, for 4 weeks
Backend creates:
- Booking for Aug 17 (Sat), 2:00 PM
- Booking for Aug 24 (Sat), 2:00 PM
- Booking for Aug 31 (Sat), 2:00 PM
- Booking for Sep 07 (Sat), 2:00 PM
```

### 5.3 Waitlist

If slot is held but not booked within hold period:
- Automatically release hold
- Optionally notify waitlisted customers

### 5.4 Payment Gateway Integration

Replace manual payment entry with:
- SSLCommerz redirect
- Bkash payment
- Nagad payment
- Stripe (for international)

---

## Summary

**The Booking Flow**:
1. Customer browses → Quick Book Wizard
2. Selects court, date, duration → See available times
3. Clicks time → Slot held for 15 minutes
4. Enters info → Proceeds to payment
5. Completes payment → Booking confirmed
6. Backend → One transaction creates booking + payment + events

**Admin Flow**:
- View all bookings
- Cancel / refund / mark no-show
- View full event timeline

**Key Design Principles**:
- Atomic transactions for state changes
- Events for audit trail
- Holds prevent double-booking
- Price snapshots preserve historical accuracy
