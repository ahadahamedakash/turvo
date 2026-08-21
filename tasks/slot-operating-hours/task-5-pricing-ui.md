# Task 5: Update Pricing Dialog with Court Hours Display

## Context

When creating or editing pricing rules, users should see the court's operating hours as a reference. This helps them set appropriate time ranges and understand why certain times might be invalid.

## Current State

**File**: `frontend/components/dashboard/pricing/pricing-rule-dialog.tsx`

The dialog shows:
- Court selection
- Day type
- Time range with presets
- Price

## Changes

### File: `frontend/components/dashboard/pricing/pricing-rule-dialog.tsx`

#### 1. Fetch court data when courtId changes:

```typescript
const [courtHours, setCourtHours] = useState<{ openingTime?: string; closingTime?: string } | null>(null);

// Add effect to fetch court hours when court changes
useEffect(() => {
  if (form.courtId && courts) {
    const selectedCourt = courts.data.find(c => c.id === form.courtId);
    if (selectedCourt) {
      setCourtHours({
        openingTime: selectedCourt.openingTime || undefined,
        closingTime: selectedCourt.closingTime || undefined,
      });
    } else {
      setCourtHours(null);
    }
  }
}, [form.courtId, courts]);
```

#### 2. Add court hours info section:

Add this **after** the Court Selection section and **before** the Time Range section:

```tsx
{/* Court Operating Hours Info */}
{courtHours && (
  <div className="bg-muted/50 rounded-lg p-3 text-[11px]">
    <div className="flex items-center gap-2">
      <Building2 className="h-3.5 w-3.5 text-teal-600" />
      <span className="font-medium text-foreground">
        Court Hours: {courtHours.openingTime || "06:00"} - {courtHours.closingTime || "23:59"}
      </span>
    </div>
    <p className="text-muted-foreground mt-1">
      Pricing time range must be within court operating hours
    </p>
  </div>
)}
```

#### 3. Add time validation warning:

Add this **inside** the Time Range section, after the preset buttons:

```tsx
{/* Time Validation Warning */}
{courtHours && (
  <div className="flex items-center gap-1.5 mt-1 text-[10px]">
    {form.startTime < (courtHours.openingTime || "00:00") || 
     form.endTime > (courtHours.closingTime || "23:59") ? (
      <>
        <AlertCircle className="h-3 w-3 text-amber-500" />
        <span className="text-amber-600 dark:text-amber-400">
          Warning: Times outside court hours may be rejected
        </span>
      </>
    ) : (
      <>
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span className="text-muted-foreground">
          Within court operating hours
        </span>
      </>
    )}
  </div>
)}
```

#### 4. Update validation function:

Add validation against court hours in the `validateForm()` function:

```typescript
const validateForm = () => {
  const newErrors: Record<string, string | undefined> = {};

  // ... existing validations ...

  // NEW: Validate against court operating hours
  if (courtHours?.openingTime && courtHours?.closingTime) {
    if (form.startTime < courtHours.openingTime || 
        form.endTime > courtHours.closingTime) {
      newErrors.endTime = 
        `Time range must be within court hours (${courtHours.openingTime} - ${courtHours.closingTime})`;
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Import Statement

Add the required imports:

```typescript
import { Building2, CheckCircle, AlertCircle } from "lucide-react";
```

## Visual Hierarchy in Dialog

```
1. Court Selection (required)
2. Court Operating Hours Info ← NEW (info card)
3. Day Type (required)
4. Time Range with Presets ← NEW (validation status)
5. Price per Hour (required)
6. Info Box (existing note)
7. Action Buttons
```

## Completion Criteria

- [ ] Court hours fetched when court is selected
- [ ] Info card shows court operating hours
- [ ] Validation warning shows when times are outside court hours
- [ ] Checkmark shows when times are within court hours
- [ ] `validateForm()` includes court hours validation
- [ ] Error message is clear and actionable
- [ ] TypeScript compilation succeeds
- [ ] Backend validation rejects out-of-bounds rules
