# Task 4: Booking Dialog UI Implementation

**Priority**: HIGH
**Status**: ✅ COMPLETE
**Dependencies**: [Task 3](./task-3-frontend-types-schemas.md) must be complete

## Objective

Update `create-booking-dialog.tsx` to replace the single "Collect cash" switch with a segmented control for payment modes and add live calculation preview.

## Changes Required

### File: `frontend/components/dashboard/bookings/create-booking-dialog.tsx`

### 1. Import Payment Mode

```typescript
import { PaymentMode } from '@/lib/types/booking';
```

### 2. Add to Form Schema

```typescript
const form = useForm<z.input<typeof createBookingSchema>, unknown, z.output<typeof createBookingSchema>>({
  resolver: zodResolver(createBookingSchema),
  defaultValues: {
    paymentMode: PaymentMode.NONE,
    // ... other defaults
  },
});
```

### 3. Fetch Tenant Booking Amount

Add a hook to fetch tenant settings including `bookingAmount`:

```typescript
const { data: tenant } = useTenantSettings();
const configuredBookingAmount = tenant?.bookingAmount ?? 0;
```

### 4. Replace "Collect Cash" Switch

**Current UI**:
```tsx
<Switch
  checked={collectCash}
  onCheckedChange={setCollectCash}
  label="Collect cash"
/>
```

**New UI** - Segmented Control:

```tsx
<RadioGroup
  value={paymentMode ?? PaymentMode.NONE}
  onValueChange={(value) => {
    const mode = value as PaymentMode;
    setValue('paymentMode', mode);

    // Auto-set payment amount based on mode
    if (mode === PaymentMode.BOOKING) {
      const amount = Math.min(configuredBookingAmount, total);
      setValue('payment.amount', amount);
      setValue('payment.method', 'Cash');
    } else if (mode === PaymentMode.FULL) {
      setValue('payment.amount', total);
      setValue('payment.method', 'Cash');
    } else if (mode === PaymentMode.NONE) {
      setValue('payment', undefined);
    }
  }}
>
  <div className="flex gap-2">
    <RadioGroupItem value={PaymentMode.NONE}>
      <span>No payment</span>
    </RadioGroupItem>

    {configuredBookingAmount > 0 && (
      <RadioGroupItem value={PaymentMode.BOOKING}>
        <span>Booking: ৳{configuredBookingAmount}</span>
      </RadioGroupItem>
    )}

    <RadioGroupItem value={PaymentMode.FULL}>
      <span>Full: ৳{total}</span>
    </RadioGroupItem>

    <RadioGroupItem value={PaymentMode.CUSTOM}>
      <span>Custom</span>
    </RadioGroupItem>
  </div>
</RadioGroup>
```

### 5. Custom Amount Input (Conditional)

Only show when `paymentMode === 'custom'`:

```tsx
{watchPaymentMode === PaymentMode.CUSTOM && (
  <RHFInput
    control={control}
    name="payment.amount"
    label="Amount (৳)"
    type="number"
    placeholder="Enter amount"
  />
)}
```

### 6. Live Calculation Preview

Add a summary section that shows booking vs due amounts:

```tsx
{watchPaymentMode && watchPaymentMode !== PaymentMode.NONE && (
  <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
    <div className="flex justify-between">
      <span className="text-muted-foreground">Booking amount:</span>
      <span className="font-medium">৳{paymentAmount}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-muted-foreground">Due amount:</span>
      <span className="font-medium text-orange-600">৳{dueAmount}</span>
    </div>
    {paymentAmount < total && (
      <div className="text-xs text-muted-foreground mt-1">
        Payment status: Partial
      </div>
    )}
  </div>
)}
```

### 7. Payment Method Selection

Keep existing payment method dropdown, but conditionally show based on payment mode:

```tsx
{(watchPaymentMode === PaymentMode.BOOKING ||
  watchPaymentMode === PaymentMode.FULL ||
  watchPaymentMode === PaymentMode.CUSTOM) && (
  <RHFSelect
    control={control}
    name="payment.method"
    label="Payment method"
    options={[
      { value: 'Cash', label: 'Cash' },
      { value: 'Card', label: 'Card (v2)' },
      { value: 'MobileBanking', label: 'Mobile banking (v2)' },
    ]}
  />
)}
```

### 8. Calculation Logic

Add memoized calculations:

```typescript
const paymentAmount = useMemo(() => {
  const mode = watchPaymentMode;
  if (!mode || mode === PaymentMode.NONE) return 0;
  if (mode === PaymentMode.CUSTOM) return watch('payment.amount') ?? 0;
  if (mode === PaymentMode.BOOKING) {
    return Math.min(configuredBookingAmount, total);
  }
  if (mode === PaymentMode.FULL) return total;
  return 0;
}, [watchPaymentMode, configuredBookingAmount, total, watch]);

const dueAmount = Math.max(total - paymentAmount, 0);
```

## UX Guidelines

1. **Visual hierarchy**: Payment mode selection should be prominent and clear
2. **Default behavior**: Default to `PaymentMode.NONE` for fastest walk-in path
3. **Hide when not configured**: Don't show "Booking amount" option if `configuredBookingAmount === 0`
4. **Live feedback**: Show calculation preview immediately on mode change
5. **Accessibility**: Use semantic RadioGroup with proper labels

## Notes

- Maintain existing form validation (discount checks, etc.)
- Keep keyed mounting for clean form state per slot
- Preserve auto-focus on phone input for fast workflow
- Payment method selection only appears when a payment mode is selected

## Verification

1. Click slot → dialog opens with "No payment" selected
2. Select "Booking: ৳500" → preview shows "Booking: ৳500 | Due: ৳700"
3. Select "Full: ৳1200" → preview shows "Booking: ৳1200 | Due: ৳0"
4. Select "Custom" → amount input appears, enter ৳800 → preview updates
5. Submit booking → verify correct payment recorded in backend
6. Test with discount applied → calculations adjust correctly

## Next

After this task, proceed to [Task 5](./task-5-settings-ui.md) for the settings UI implementation.
