# Task 4: Add Operating Hours to Court Dialog UI

## Context

The court creation/edit dialog needs UI fields for setting operating hours. These should be optional with sensible defaults.

## Current State

**File**: `frontend/components/dashboard/courts/court-dialog.tsx`

The dialog currently has:
- Name
- Description  
- Status
- Slot interval minutes

## Changes

Add a new "Operating Hours" section with time inputs.

### File: `frontend/components/dashboard/courts/court-dialog.tsx`

#### 1. Add to the form schema (if using zod) or form state:

```typescript
const defaultFormState = {
  name: "",
  description: "",
  status: CourtStatus.Active,
  slotIntervalMinutes: 60,
  openingTime: "06:00",      // NEW
  closingTime: "23:59",     // NEW
};
```

#### 2. Add the UI section:

```tsx
{/* Operating Hours Section */}
<div className="space-y-2">
  <Label htmlFor="openingTime">
    Operating Hours <span className="text-muted-foreground text-xs">(Optional)</span>
  </Label>
  <div className="flex items-center gap-2">
    <div className="flex-1">
      <Input
        id="openingTime"
        type="time"
        value={form.openingTime}
        onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
        className="text-xs"
      />
    </div>
    <span className="text-muted-foreground text-sm">to</span>
    <div className="flex-1">
      <Input
        id="closingTime"
        type="time"
        value={form.closingTime}
        onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
        className="text-xs"
      />
    </div>
  </div>
  <p className="text-[11px] text-muted-foreground">
    Slots will only be generated within these hours. Leave as default for 6 AM - 11:59 PM.
  </p>
</div>
```

#### 3. Add quick preset buttons (optional enhancement):

```tsx
{/* Quick Presets for Operating Hours */}
<div className="flex flex-wrap gap-1.5 mb-2">
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="h-7 text-[11px] px-2"
    onClick={() => {
      setForm({ ...form, openingTime: "06:00", closingTime: "23:59" });
    }}
  >
    All Day (6AM-12AM)
  </Button>
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="h-7 text-[11px] px-2"
    onClick={() => {
      setForm({ ...form, openingTime: "09:00", closingTime: "22:00" });
    }}
  >
    Standard (9AM-10PM)
  </Button>
  <Button
    type="button"
    variant="outline"
    size="sm"
    className="h-7 text-[11px] px-2"
    onClick={() => {
      setForm({ ...form, openingTime: "08:00", closingTime: "00:00" });
    }}
  >
    Extended (8AM-12AM)
  </Button>
</div>
```

### Position in Dialog

Add this section **after** the Slot Interval field and **before** the Status field for logical flow:

```
1. Name (required)
2. Description (optional)
3. Slot Interval (optional)
4. Operating Hours (optional) ← NEW
5. Status (required)
```

## Type Updates

**File**: `frontend/lib/types/court.ts`

Update the Court interface to include the new fields:

```typescript
export interface Court {
  id: string;
  name: string;
  description: string | null;
  status: CourtStatus;
  slotIntervalMinutes: number;
  openingTime?: string | null;   // NEW
  closingTime?: string | null;   // NEW
  tenantId: string;
  // ... other fields
}
```

## Completion Criteria

- [ ] Operating hours section added to court dialog
- [ ] Two time input fields (opening, closing)
- [ ] Default values: 06:00 and 23:59
- [ ] Helper text explains purpose
- [ ] Optional preset buttons added (optional)
- [ ] Court type interface updated
- [ ] TypeScript compilation succeeds
- [ ] Form submission includes new fields
