# Task 3: Update Court DTOs

**Status**: ✅ Complete

## Context

The Create and Update DTOs for Courts need to include the new `openingTime` and `closingTime` fields.

## Current State

**Files**: 
- `backend/src/modules/courts/dto/create-court.dto.ts`
- `backend/src/modules/courts/dto/update-court.dto.ts`

## Changes Made

### File: `backend/src/modules/courts/dto/create-court.dto.ts`

Added the optional time fields with validation:

```typescript
@ApiProperty({
  description: 'Court opening time in HH:mm format (24-hour)',
  example: '06:00',
  required: false,
})
@IsString({ message: 'Opening time must be a string in HH:mm format' })
@IsOptional()
@Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
  message: 'Opening time must be in HH:mm format (e.g., 06:00, 09:30)',
})
openingTime?: string;

@ApiProperty({
  description: 'Court closing time in HH:mm format (24-hour)',
  example: '23:59',
  required: false,
})
@IsString({ message: 'Closing time must be a string in HH:mm format' })
@IsOptional()
@Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
  message: 'Closing time must be in HH:mm format (e.g., 23:59, 00:00)',
})
closingTime?: string;
```

### File: `backend/src/modules/courts/dto/update-court.dto.ts`

No changes needed - `UpdateCourtDto` extends `PartialType(CreateCourtDto)`, so the fields are automatically available as optional.

### File: `backend/src/modules/courts/courts.service.ts`

Added time string parsing in both `create()` and `update()` methods:

**Create method:**
```typescript
const { name, description, status = CourtStatus.Available, slotIntervalMinutes = 60, openingTime, closingTime } = createCourtDto;

// Parse time strings to Date objects if provided
const parsedOpeningTime = openingTime ? this.parseTimeString(openingTime) : null;
const parsedClosingTime = closingTime ? this.parseTimeString(closingTime) : null;

// Create with parsed times
const newCourt = await tx.court.create({
  data: {
    name,
    description,
    status,
    slotIntervalMinutes,
    tenantId,
    createdBy: userId,
    openingTime: parsedOpeningTime,
    closingTime: parsedClosingTime,
  },
});
```

**Update method:**
```typescript
// Parse time strings to Date objects if provided
let parsedOpeningTime: Date | null | undefined = undefined;
let parsedClosingTime: Date | null | undefined = undefined;

if (updateCourtDto.openingTime !== undefined) {
  parsedOpeningTime = updateCourtDto.openingTime
    ? this.parseTimeString(updateCourtDto.openingTime)
    : null;
}
if (updateCourtDto.closingTime !== undefined) {
  parsedClosingTime = updateCourtDto.closingTime
    ? this.parseTimeString(updateCourtDto.closingTime)
    : null;
}

// Build update data without spreading DTO (avoids type conflicts)
const updateData: Prisma.CourtUncheckedUpdateInput = {
  updatedBy: userId,
};
if (updateCourtDto.name !== undefined) updateData.name = updateCourtDto.name;
if (updateCourtDto.description !== undefined) updateData.description = updateCourtDto.description;
if (updateCourtDto.status !== undefined) updateData.status = updateCourtDto.status;
if (updateCourtDto.slotIntervalMinutes !== undefined) updateData.slotIntervalMinutes = updateCourtDto.slotIntervalMinutes;
if (parsedOpeningTime !== undefined) updateData.openingTime = parsedOpeningTime;
if (parsedClosingTime !== undefined) updateData.closingTime = parsedClosingTime;
```

**Helper method added:**
```typescript
/**
 * Parse time string (HH:mm) to Date object
 * Uses UTC to ensure consistent storage regardless of server timezone
 * @private
 */
private parseTimeString(time: string): Date {
  return new Date(`1970-01-01T${time}:00Z`);
}
```

## Validation Pattern

The regex `/^([01]\d|2[0-3]):([0-5]\d)$/` validates:
- Hours: 00-23 (24-hour format)
- Minutes: 00-59
- Format: HH:mm (e.g., "09:30", "18:45")

## Completion Criteria

- [x] `openingTime` added to CreateCourtDto
- [x] `closingTime` added to CreateCourtDto  
- [x] Fields are optional with proper decorators
- [x] Time validation regex added
- [x] Swagger documentation added
- [x] `parseTimeString()` helper added to courts service
- [x] `create()` method parses time strings
- [x] `update()` method parses time strings
- [x] TypeScript compilation succeeds
- [x] Linting passes (no errors in courts module)

## Implementation Notes

- `UpdateCourtDto` automatically inherits the fields via `PartialType(CreateCourtDto)`
- Time strings are parsed to UTC Date objects for consistent storage
- The update method manually assigns fields to avoid type conflicts with spreading
- `CourtUncheckedUpdateInput` type is used for the update operation to allow scalar field updates
