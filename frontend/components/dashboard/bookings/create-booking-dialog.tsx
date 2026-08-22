"use client";

/**
 * Create-booking dialog — ONE dialog, three sections (What / Who / Payment),
 * designed for the <30s walk-in: duration defaults to 1×, focus lands on the
 * customer phone search, everything else is optional.
 *
 * Mounted keyed per clicked slot (page unmounts on close), so the form starts
 * clean every time — no stale customer leaks into the next booking.
 *
 * Amount-vs-total checks need the live slot prices, which the schema can't
 * see — they run here in the submit handler via `form.setError` (Task 4 note).
 */

import { useRef, useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { BadgePlus, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  RHFInput,
  RHFSelect,
  RHFTextarea,
} from "@/components/forms/form-field";
import { bookingKeys, useCreateBooking } from "@/hooks/bookings";
import { useTenant } from "@/hooks/tenants";
import { useCurrentTenant } from "@/hooks/use-tenant-selection";
import { handleApiError } from "@/lib/api/api-client";
import {
  createBookingSchema,
  type CreateBookingForm,
} from "@/lib/schemas/booking";
import type {
  CreateBookingDto,
  DayViewCourt,
  DayViewSlot,
} from "@/lib/types/booking";
import { PaymentMode } from "@/lib/types/booking";
import type { CustomerOption } from "@/lib/types/customer";
import { CustomerSearchField } from "./customer-search-field";
import {
  consecutiveRunSlots,
  formatDateLabel,
  formatDuration,
  formatTaka,
  formatTime12,
} from "./grid-utils";

/** Form-value shape (schema INPUT — defaults/coercion resolve at submit). */
type CreateBookingInput = z.input<typeof createBookingSchema>;

interface CreateBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Court of the clicked cell. */
  court: DayViewCourt;
  /** Selected day (YYYY-MM-DD). */
  date: string;
  /** Clicked slot + every later same-court slot, sorted by start time. */
  slots: DayViewSlot[];
}

export function CreateBookingDialog({
  open,
  onOpenChange,
  court,
  date,
  slots,
}: CreateBookingDialogProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateBooking();

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Fetch tenant settings for booking amount
  const currentTenant = useCurrentTenant();
  const { data: tenant } = useTenant(currentTenant?.id ?? "", {
    enabled: !!currentTenant?.id,
  });
  const configuredBookingAmount = tenant?.bookingAmount ?? 0;

  // UI gates not in the payload schema (mapped away at submit).
  const [pickedCustomer, setPickedCustomer] = useState<CustomerOption | null>(
    null,
  );

  const form = useForm<CreateBookingInput, unknown, CreateBookingForm>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      slotIds: slots.slice(0, 1).map((s) => s.id),
      customer: {
        customerId: undefined,
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
      },
      status: "Confirmed",
      discount: 0,
      notes: "",
      paymentMode: PaymentMode.NONE,
      payment: { amount: 0, method: "Cash" },
    },
  });

  // ---- live price preview (all from props — no fetches) --------------------
  // useWatch (not form.watch) — the compiler-safe way to read in render.
  const watchedSlotIds =
    useWatch({ control: form.control, name: "slotIds" }) ?? [];
  const watchedDiscount =
    Number(useWatch({ control: form.control, name: "discount" }) ?? 0) || 0;
  const watchedStatus =
    useWatch({ control: form.control, name: "status" }) ?? "Confirmed";
  const watchedPaymentMode =
    (useWatch({ control: form.control, name: "paymentMode" }) as
      | PaymentMode
      | undefined) ?? PaymentMode.NONE;
  const watchedCustomAmount = (useWatch({
    control: form.control,
    name: "payment.amount",
  }) ?? 0) as number;

  const maxRun = consecutiveRunSlots(slots, 0);
  const selectedCount = Math.min(watchedSlotIds.length, slots.length);
  const selectedSlots = slots.slice(0, selectedCount);
  const subtotal = selectedSlots.reduce((sum, s) => sum + Number(s.price), 0);
  const total = Math.max(subtotal - watchedDiscount, 0);
  const durationMinutes = selectedCount * court.slotIntervalMinutes;

  // ---- payment calculation based on mode -----------------------------------
  const paymentAmount = useMemo((): number => {
    const mode = watchedPaymentMode;
    if (!mode || mode === PaymentMode.NONE) return 0;
    if (mode === PaymentMode.CUSTOM) return watchedCustomAmount ?? 0;
    if (mode === PaymentMode.BOOKING) {
      return Math.min(configuredBookingAmount, total);
    }
    if (mode === PaymentMode.FULL) return total;
    return 0;
  }, [watchedPaymentMode, configuredBookingAmount, total, watchedCustomAmount]);

  const dueAmount = Math.max(total - Number(paymentAmount), 0);

  /** Chips 1×–4× (schema caps 8; four covers the common walk-in range). */
  const chipMultipliers = [1, 2, 3, 4].filter((n) => n <= slots.length);

  const selectDuration = (n: number) => {
    form.setValue(
      "slotIds",
      slots.slice(0, n).map((s) => s.id),
      {
        shouldDirty: true,
      },
    );
  };

  // ---- customer pick / reset ----------------------------------------------
  const handlePick = (customer: CustomerOption) => {
    setPickedCustomer(customer);
    form.setValue("customer.customerId", customer.id);
    form.setValue("customer.firstName", customer.firstName);
    form.setValue("customer.lastName", customer.lastName);
    form.setValue("customer.phone", customer.phone ?? "");
    form.setValue("customer.email", customer.email ?? "");
  };

  const resetCustomer = () => {
    setPickedCustomer(null);
    form.setValue("customer.customerId", undefined);
    form.setValue("customer.firstName", "");
    form.setValue("customer.lastName", "");
    form.setValue("customer.phone", "");
    form.setValue("customer.email", "");
  };

  // ---- submit ---------------------------------------------------------------
  const onSubmit = (values: CreateBookingForm) => {
    const selected = slots.slice(0, values.slotIds.length);
    const subTotal = selected.reduce((sum, s) => sum + Number(s.price), 0);

    if (values.discount > subTotal) {
      form.setError("discount", {
        message: `Discount cannot exceed the subtotal (${formatTaka(subTotal)})`,
      });
      return;
    }
    const grandTotal = subTotal - values.discount;
    if (
      watchedPaymentMode !== PaymentMode.NONE &&
      watchedPaymentMode !== PaymentMode.BOOKING &&
      watchedPaymentMode !== PaymentMode.FULL &&
      values.payment &&
      values.payment.amount > grandTotal
    ) {
      form.setError("payment.amount", {
        message: `Amount cannot exceed the total (${formatTaka(grandTotal)})`,
      });
      return;
    }

    const dto: CreateBookingDto = {
      slotIds: selected.map((s) => s.id),
      customer: {
        customerId: values.customer.customerId || undefined,
        firstName: values.customer.firstName.trim(),
        lastName: values.customer.lastName.trim(),
        phone: values.customer.phone?.trim() || undefined,
        email: values.customer.email?.trim() || undefined,
      },
      status: values.status,
      discount: values.discount,
      notes: values.notes?.trim() || undefined,
      paymentMode: values.paymentMode as PaymentMode | undefined,
      payment:
        values.paymentMode && values.paymentMode !== PaymentMode.NONE && values.payment
          ? { amount: values.payment.amount, method: values.payment.method }
          : undefined,
    };

    createMutation.mutate(dto, {
      onSuccess: (booking) => {
        toast.success("Booking created", {
          description: `${booking.customer.firstName} ${booking.customer.lastName} · ${formatDateLabel(booking.date)} ${formatTime12(booking.startTime)}–${formatTime12(booking.endTime)} · ${booking.courtName}`,
        });
        onOpenChange(false);
      },
      onError: (error) => {
        const apiError = handleApiError(error);
        if (apiError.status === 409) {
          toast.error("Slot was just taken", {
            description:
              "Another staff member booked it. The calendar has been refreshed.",
          });
          // The hook's onSuccess invalidation did NOT run — refresh here.
          queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
          onOpenChange(false);
        } else {
          toast.error("Failed to create booking", {
            description: apiError.message,
          });
        }
      },
    });
  };

  const isSaving = createMutation.isPending;
  const firstSlot = slots[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-120"
        onOpenAutoFocus={(event) => {
          // Fastest walk-in path starts at the phone search.
          event.preventDefault();
          phoneInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
              <BadgePlus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>New Booking</DialogTitle>
              <DialogDescription>
                {court.name} · {formatDateLabel(date)} ·{" "}
                {firstSlot && formatTime12(firstSlot.startTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* 1. Duration */}
            <div className="space-y-2">
              <Label className="text-xs">Duration</Label>
              <div className="flex flex-wrap gap-1.5">
                {chipMultipliers.map((n) => {
                  const available = n <= maxRun;
                  return (
                    <Button
                      key={n}
                      type="button"
                      variant={selectedCount === n ? "default" : "outline"}
                      size="sm"
                      className="h-9 gap-1 text-xs"
                      disabled={!available || isSaving}
                      title={available ? undefined : "Not available"}
                      onClick={() => selectDuration(n)}
                    >
                      {n}×
                      <span className="text-[10px] opacity-70">
                        {formatDuration(n * court.slotIntervalMinutes)}
                      </span>
                    </Button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {selectedCount} {selectedCount === 1 ? "slot" : "slots"} ·{" "}
                  {formatDuration(durationMinutes)}
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatTaka(total)}
                  {watchedDiscount > 0 && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({formatTaka(subtotal)} − {formatTaka(watchedDiscount)})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 2. Customer */}
            <div className="space-y-2">
              <Label className="text-xs">Customer</Label>
              {pickedCustomer ? (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-teal-700 dark:text-teal-400">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-medium text-foreground">
                        {pickedCustomer.firstName} {pickedCustomer.lastName}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {[pickedCustomer.phone, pickedCustomer.email]
                          .filter(Boolean)
                          .join(" · ") || "No contact details"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetCustomer}
                      className="ml-auto shrink-0 text-[11px] font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
                    >
                      Use different customer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <CustomerSearchField
                    onPick={handlePick}
                    disabled={isSaving}
                    inputRef={phoneInputRef}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <RHFInput
                      name="customer.firstName"
                      label="First name"
                      placeholder="Rahim"
                      disabled={isSaving}
                    />
                    <RHFInput
                      name="customer.lastName"
                      label="Last name"
                      placeholder="Uddin"
                      disabled={isSaving}
                    />
                    <RHFInput
                      name="customer.phone"
                      label="Phone"
                      placeholder="+880 1711-234567"
                      disabled={isSaving}
                    />
                    <RHFInput
                      name="customer.email"
                      label="Email (optional)"
                      type="email"
                      placeholder="rahim@example.com"
                      disabled={isSaving}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 3. Extras */}
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-between rounded-lg border p-3.5">
                <div className="space-y-0.5">
                  <Label className="text-xs">Save as tentative</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Slot is held for the customer; confirm later.
                  </p>
                </div>
                <Switch
                  checked={watchedStatus === "Pending"}
                  onCheckedChange={(checked) =>
                    form.setValue("status", checked ? "Pending" : "Confirmed", {
                      shouldDirty: true,
                    })
                  }
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <RHFInput
                  name="discount"
                  label="Discount (৳)"
                  type="number"
                  min={0}
                  disabled={isSaving}
                />
              </div>

              <RHFTextarea
                name="notes"
                label="Notes (optional)"
                placeholder="Anything staff should know…"
                rows={2}
                maxLength={1000}
                disabled={isSaving}
              />
            </div>

            {/* 4. Payment (optional) */}
            <div className="space-y-3">
              <Label className="text-xs">Payment mode</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    watchedPaymentMode === PaymentMode.NONE
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    form.setValue("paymentMode", PaymentMode.NONE, {
                      shouldDirty: true,
                    });
                    form.setValue("payment", undefined);
                  }}
                  disabled={isSaving}
                >
                  <span>No payment</span>
                </Button>

                {configuredBookingAmount > 0 && (
                  <Button
                    type="button"
                    variant={
                      watchedPaymentMode === PaymentMode.BOOKING
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      form.setValue("paymentMode", PaymentMode.BOOKING, {
                        shouldDirty: true,
                      });
                      const amount = Math.min(configuredBookingAmount, total);
                      form.setValue("payment.amount", amount);
                      form.setValue("payment.method", "Cash");
                    }}
                    disabled={isSaving}
                  >
                    <span>
                      Booking: ৳{configuredBookingAmount.toLocaleString()}
                    </span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant={
                    watchedPaymentMode === PaymentMode.FULL
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    form.setValue("paymentMode", PaymentMode.FULL, {
                      shouldDirty: true,
                    });
                    form.setValue("payment.amount", total);
                    form.setValue("payment.method", "Cash");
                  }}
                  disabled={isSaving}
                >
                  <span>Full: ৳{total.toLocaleString()}</span>
                </Button>

                <Button
                  type="button"
                  variant={
                    watchedPaymentMode === PaymentMode.CUSTOM
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    form.setValue("paymentMode", PaymentMode.CUSTOM, {
                      shouldDirty: true,
                    });
                  }}
                  disabled={isSaving}
                >
                  <span>Custom</span>
                </Button>
              </div>

              {/* Live calculation preview */}
              {watchedPaymentMode &&
                watchedPaymentMode !== PaymentMode.NONE &&
                paymentAmount > 0 && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Booking amount:
                      </span>
                      <span className="font-medium">
                        ৳{paymentAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Due amount:</span>
                      <span
                        className={
                          dueAmount > 0
                            ? "font-medium text-orange-600 dark:text-orange-400"
                            : "font-medium text-green-600 dark:text-green-400"
                        }
                      >
                        ৳{dueAmount.toLocaleString()}
                      </span>
                    </div>
                    {paymentAmount < total && dueAmount > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Payment status: Partial
                      </div>
                    )}
                    {paymentAmount >= total && (
                      <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                        Payment status: Paid in full
                      </div>
                    )}
                  </div>
                )}

              {/* Custom amount input (conditional) */}
              {watchedPaymentMode === PaymentMode.CUSTOM && (
                <div className="grid grid-cols-2 gap-3">
                  <RHFInput
                    name="payment.amount"
                    label="Amount (৳)"
                    type="number"
                    min={1}
                    max={total}
                    disabled={isSaving}
                  />
                  <RHFSelect
                    name="payment.method"
                    label="Method"
                    options={[
                      { value: "Cash", label: "Cash" },
                      { value: "Card", label: "Card (v2)" },
                      { value: "MobileBanking", label: "Mobile banking (v2)" },
                    ]}
                    disabled={isSaving}
                  />
                </div>
              )}

              {/* Payment method for booking/full modes */}
              {(watchedPaymentMode === PaymentMode.BOOKING ||
                watchedPaymentMode === PaymentMode.FULL) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <RHFSelect
                      name="payment.method"
                      label="Payment method"
                      options={[
                        { value: "Cash", label: "Cash" },
                        { value: "Card", label: "Card (v2)" },
                        { value: "MobileBanking", label: "Mobile banking (v2)" },
                      ]}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  `Save booking · ${formatTaka(total)}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
