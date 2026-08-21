# Task 1: Add Operating Hours to Court Schema

**Status**: ✅ Complete

## Context

The `Court` model currently has no operating hours fields. Slots are generated based solely on `PricingRule` time ranges, which can lead to confusion when court operating hours don't match the generated slot times.

## Current State

**File**: `backend/prisma/court.prisma`

```prisma
model Court {
    id                  String        @id @default(uuid()) @db.Uuid
    name                String
    description         String?
    status              CourtStatus   @default(Available)
    slotIntervalMinutes Int           @default(60)
    tenantId            String        @db.Uuid
    // ... other fields
}
```

## Changes

### File: `backend/prisma/court.prisma`

Add two optional time fields to the Court model:

```prisma
model Court {
    id                  String        @id @default(uuid()) @db.Uuid
    name                String
    description         String?
    status              CourtStatus   @default(Available)
    slotIntervalMinutes Int           @default(60)
    // Operating hours (optional, defaults handled at application level: 06:00 - 23:59)
    openingTime         DateTime?     @db.Time(6)
    closingTime         DateTime?     @db.Time(6)
    tenantId            String        @db.Uuid
    // ... existing fields ...
}
```

### Field Details

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `openingTime` | `DateTime?` | Application default: 06:00 | When the court opens for bookings (optional) |
| `closingTime` | `DateTime?` | Application default: 23:59 | When the court closes for bookings (optional) |

### Why No Database Defaults?

- Prisma `@default()` doesn't support string values for `@db.Time` fields
- Defaults are handled at the application level in DTOs/Forms
- Optional fields ensure backward compatibility

## Database Migration

Run these commands to apply the schema changes:

```bash
cd backend
npx prisma db push
npx prisma generate
```

## Completion Criteria

- [x] Schema updated with `openingTime` and `closingTime` fields
- [x] Fields are optional
- [x] Database migration successful (`npx prisma db push`)
- [x] Prisma client regenerated (`npx prisma generate`)
- [x] TypeScript compilation succeeds

## Implementation Notes

- Fields are nullable to allow existing courts without operating hours
- Application-level defaults will be implemented in Task 3 (DTOs) and Task 4 (UI)
