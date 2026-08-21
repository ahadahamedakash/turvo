# Task 2: Add Pricing Rule Validation Against Court Operating Hours

**Status**: ✅ Complete

## Context

Pricing rules should not be allowed to define time ranges that fall outside the court's operating hours. This prevents creating bookable slots for times when the venue is closed.

## Current State

**File**: `backend/src/modules/pricing/pricing.service.ts`

The `create()` method currently validates:
- Court exists and belongs to tenant
- No overlapping pricing rules
- Price is positive

But does NOT validate against court operating hours.

## Changes

### File: `backend/src/modules/pricing/pricing.service.ts`

Added validation to both `create()` and `update()` methods:

**In `create()` method:**
```typescript
// Fetch court with operating hours
const court = await this.prisma.court.findFirst({
  where: { id: courtId, tenantId, deletedAt: null },
  select: {
    id: true,
    tenantId: true,
    openingTime: true,
    closingTime: true,
  },
});

// Validate pricing rule times are within court operating hours
if (court.openingTime && court.closingTime) {
  const courtOpen = this.parseTimeString(
    this.formatTimeToHHmm(court.openingTime),
  );
  const courtClose = this.parseTimeString(
    this.formatTimeToHHmm(court.closingTime),
  );

  // Handle midnight closing time (00:00 treated as 24:00)
  if (endTime === '00:00') {
    courtClose.setHours(24, 0, 0, 0);
  }

  if (parsedStartTime < courtOpen || parsedEndTime > courtClose) {
    throw new BadRequestException(
      `Pricing rule time range (${startTime} - ${endTime}) must be within court operating hours (${this.formatTimeToHHmm(court.openingTime)} - ${this.formatTimeToHHmm(court.closingTime)})`,
    );
  }
}
```

**In `update()` method:**
```typescript
// Fetch existing rule with court operating hours
const existingRule = await this.prisma.pricingRule.findFirst({
  where: { id, tenantId, deletedAt: null },
  include: {
    court: {
      select: {
        openingTime: true,
        closingTime: true,
      },
    },
  },
});

// Similar validation as create()...
```

## Helper Functions Used

- `parseTimeString(time: string)`: Converts "HH:mm" to UTC Date
- `formatTimeToHHmm(date: Date)`: Converts Date to "HH:mm" string

Both methods already exist in the service and are reused for validation.

## Validation Logic

1. **Fetch court** with `openingTime` and `closingTime`
2. **Parse times** to Date objects for comparison
3. **Handle midnight** (00:00 is treated as 24:00)
4. **Validate range**: `ruleStart >= courtOpen` AND `ruleEnd <= courtClose`
5. **Throw error** with descriptive message if validation fails

## Error Message Example

```
Pricing rule time range (06:00 - 12:00) must be within court operating hours (09:00 - 23:30)
```

## Completion Criteria

- [x] Validation added to `create()` method
- [x] Validation added to `update()` method
- [x] Court fetched with operating hours
- [x] Time comparison logic handles midnight correctly
- [x] Error message is clear and actionable
- [x] TypeScript compilation succeeds
- [x] Existing pricing rules still work (backward compatible)
- [x] `bulkCreate()` automatically inherits validation (calls `create()`)

## Implementation Notes

- The `bulkCreate()` method didn't need separate changes since it calls `create()` for each rule
- Validation only applies when both `openingTime` and `closingTime` are set on the court
- Time parsing uses the existing `parseTimeString()` helper which pins to UTC
