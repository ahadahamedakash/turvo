# Task 5: Settings UI for Booking Amount Configuration

**Priority**: MEDIUM
**Status**: ✅ COMPLETE
**Dependencies**: [Task 1](./task-1-schema-addition.md) (backend schema must exist)

## Objective

Add a settings UI component that allows tenant admins to configure the `bookingAmount`.

## Changes Required

### 1. Option A: Extend Existing Slot Settings Card

**File**: `frontend/components/dashboard/slots/slot-settings-card.tsx`

Add booking amount field to the existing card:

```tsx
// In the settings form section
<div className="space-y-4">
  {/* Existing: Weekend days, auto-generation, etc. */}

  <Separator />

  <div className="space-y-2">
    <h3 className="font-medium">Payment Settings</h3>

    <RHFInput
      control={control}
      name="bookingAmount"
      label="Booking Amount (৳)"
      type="number"
      placeholder="e.g., 500"
      helper="Minimum amount to collect at booking time. Leave empty to disable."
    />

    {watchBookingAmount > 0 && (
      <div className="text-sm text-muted-foreground">
        When creating a booking, staff will see an option to collect ৳{watchBookingAmount} as the booking amount.
      </div>
    )}
  </div>
</div>
```

### 2. Option B: Create Separate Component

If the slot settings card is getting too large, create a dedicated component:

**New File**: `frontend/components/dashboard/slots/booking-payment-settings-card.tsx`

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { RHFInput } from '@/components/forms/rhf-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { useUpdateTenantSettings } from '@/hooks/tenants';

const bookingPaymentSchema = z.object({
  bookingAmount: z.number().min(0).optional(),
});

type BookingPaymentValues = z.infer<typeof bookingPaymentSchema>;

export function BookingPaymentSettingsCard() {
  const { data: tenant } = useTenantSettings();
  const { mutate: updateSettings, isPending } = useUpdateTenantSettings();

  const form = useForm<BookingPaymentValues>({
    resolver: zodResolver(bookingPaymentSchema),
    defaultValues: {
      bookingAmount: tenant?.bookingAmount ? Number(tenant.bookingAmount) : undefined,
    },
  });

  const onSubmit = (values: BookingPaymentValues) => {
    updateSettings(
      { bookingAmount: values.bookingAmount },
      {
        onSuccess: () => toast.success('Settings updated'),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Payment Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFInput
              control={control}
              name="bookingAmount"
              label="Booking Amount (৳)"
              type="number"
              placeholder="e.g., 500"
              helper="Minimum amount to collect at booking time. Leave empty to disable."
            />

            <Button type="submit" disabled={isPending}>
              Save Settings
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

Then import and use in the slots page:

**File**: `frontend/app/dashboard/slots/page.tsx`

```tsx
import { BookingPaymentSettingsCard } from '@/components/dashboard/slots/booking-payment-settings-card';

// In the page component, alongside other cards:
<div className="grid gap-4">
  <SlotSettingsCard />
  <BookingPaymentSettingsCard /> {/* NEW */}
  {/* ... other cards */}
</div>
```

### 3. API Hook

**File**: `frontend/hooks/tenants.ts`

Add mutation for updating tenant settings:

```typescript
export function useUpdateTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { bookingAmount?: number }) =>
      tenantApi.updateSettings(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.current() });
    },
  });
}

// Also ensure tenantKeys.current() exists:
export const tenantKeys = {
  all: ['tenant'] as const,
  current: () => [...tenantKeys.all, 'current'] as const,
};
```

### 4. API Function

**File**: `frontend/lib/api/tenant.ts`

Add the update settings function:

```typescript
export async function updateSettings(data: { bookingAmount?: number }) {
  const response = await fetch('/api/tenants/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update settings');
  }

  return response.json();
}
```

### 5. Backend Endpoint (if not exists)

**File**: `backend/src/modules/tenants/tenants.controller.ts`

Ensure endpoint exists:

```typescript
@Patch('settings')
@ApiOperation({ summary: 'Update tenant settings' })
@ApiOkResponse({ type: TenantResponseDto })
updateSettings(
  @CurrentTenant() tenant: Tenant,
  @Body() dto: UpdateTenantSettingsDto,
) {
  return this.tenantsService.updateSettings(tenant.id, dto);
}
```

## Recommendation

**Use Option A (extend existing card)** if:
- Slot settings card has space
- Want all slot-related settings in one place

**Use Option B (separate component)** if:
- Slot settings card is already crowded
- Want to group all payment-related settings together
- Plan to add more payment settings in the future

## Verification

1. Navigate to `/dashboard/slots`
2. Find booking amount input field
3. Enter value (e.g., 500)
4. Click save → toast success appears
5. Refresh page → value persists
6. Create a booking → "Booking: ৳500" option appears
7. Set to empty/0 → booking amount option disappears from dialog

## Next

After this task, proceed to [Task 6](./task-6-testing-guide.md) for comprehensive testing.
