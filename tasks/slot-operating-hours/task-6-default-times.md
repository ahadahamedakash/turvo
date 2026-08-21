# Task 6: Update Default Time Presets in Pricing Dialog

## Context

The current time presets in the pricing dialog are:
- Morning (6AM-12PM)
- Evening (12PM-6PM)  
- Night (6PM-12AM)

These presets don't align with typical turf court operating hours (often 9AM-11PM). This task updates the presets to be more useful for the target market.

## Current State

**File**: `frontend/components/dashboard/pricing/pricing-rule-dialog.tsx` (lines 43-47)

```typescript
const timePresets = [
  { label: "Morning (6AM-12PM)", start: "06:00", end: "12:00" },
  { label: "Evening (12PM-6PM)", start: "12:00", end: "18:00" },
  { label: "Night (6PM-12AM)", start: "18:00", end: "00:00" },
];
```

**Default form state** (lines 34-40):

```typescript
const defaultFormState = {
  courtId: "",
  dayType: DayType.Weekday,
  startTime: "09:00",   // ← 9 AM
  endTime: "18:00",     // ← 6 PM (why not 11:30 PM?)
  price: "",
};
```

## Problem

The default endTime of 18:00 (6 PM) is the root cause of the user's issue. Courts typically operate until 10-11 PM, but the default stops at 6 PM.

## Changes

### Option A: More Practical Presets (Recommended)

Update presets to match typical turf court hours:

```typescript
const timePresets = [
  { label: "Morning (9AM-12PM)", start: "09:00", end: "12:00" },
  { label: "Afternoon (12PM-5PM)", start: "12:00", end: "17:00" },
  { label: "Evening (5PM-10PM)", start: "17:00", end: "22:00" },
  { label: "Full Day (9AM-11PM)", start: "09:00", end: "23:00" },
];
```

**Reasoning**:
- Turfs are busiest from 9 AM onwards (morning sports)
- Full day preset covers typical operating hours
- Evening extends to 10 PM (prime time for sports)

### Option B: Smart Presets Based on Court Hours

Make presets dynamic based on the selected court's operating hours:

```typescript
const timePresets = useMemo(() => {
  if (!courtHours?.openingTime || !courtHours?.closingTime) {
    // Default presets when no court hours set
    return [
      { label: "Morning (9AM-12PM)", start: "09:00", end: "12:00" },
      { label: "Afternoon (12PM-5PM)", start: "12:00", end: "17:00" },
      { label: "Evening (5PM-10PM)", start: "17:00", end: "22:00" },
    ];
  }

  const open = courtHours.openingTime;
  const close = courtHours.closingTime;

  return [
    { 
      label: `Morning (${open}-12PM)`, 
      start: open, 
      end: "12:00" 
    },
    { 
      label: `Afternoon (12PM-6PM)`, 
      start: "12:00", 
      end: "18:00" 
    },
    { 
      label: `Full Day (${open}-${close})`, 
      start: open, 
      end: close 
    },
  ];
}, [courtHours]);
```

### Update Default Form State

Change the default endTime to a more reasonable value:

```typescript
const defaultFormState = {
  courtId: "",
  dayType: DayType.Weekday,
  startTime: "09:00",
  endTime: "23:00",     // Changed from "18:00" to "23:00"
  price: "",
};
```

## Recommended Approach: Option A (Static Practical Presets)

For the initial implementation, use **Option A** because:
- ✅ Simpler to implement (no useMemo dependency)
- ✅ Predictable for all users
- ✅ Covers typical turf court hours
- ✅ "Full Day" preset is most useful for quick setup

**Option B** can be added later as an enhancement.

## Completion Criteria

- [ ] Time presets updated to practical values
- [ ] Default endTime changed to "23:00"
- [ ] Preset labels are clear and accurate
- [ ] At least one preset covers full typical day (9 AM - 11 PM)
- [ ] TypeScript compilation succeeds
- [ ] Testing: Create pricing rule using each preset
- [ ] Testing: Verify slots generate correct time ranges
