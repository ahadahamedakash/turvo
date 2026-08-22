"use client";

/**
 * Booking payment settings card — allows tenant admins to configure the
 * minimum booking amount that appears as an option in the booking dialog.
 *
 * When configured, staff can select "Booking: ৳{amount}" mode during booking
 * creation, which auto-fills the configured amount as a partial payment.
 */

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/hooks/tenants";
import { useCurrentTenant } from "@/hooks/use-tenant-selection";
import { useUpdateTenant } from "@/hooks/tenants";
import { formatTaka } from "../bookings/grid-utils";

const bookingPaymentSchema = z.object({
  bookingAmount: z.coerce
    .number()
    .min(0, "Amount must be positive")
    .optional(),
});

type BookingPaymentValues = z.infer<typeof bookingPaymentSchema>;

export function BookingPaymentSettingsCard() {
  const currentTenant = useCurrentTenant();
  const { data: tenant, isLoading } = useTenant(currentTenant?.id ?? "", {
    enabled: !!currentTenant?.id,
  });

  const updateMutation = useUpdateTenant();

  const form = useForm({
    resolver: zodResolver(bookingPaymentSchema),
    defaultValues: {
      bookingAmount: tenant?.bookingAmount ? Number(tenant.bookingAmount) : undefined,
    },
  });

  // Re-sync form when tenant data loads
  if (tenant && !form.formState.isDirty) {
    if (tenant.bookingAmount && form.getValues("bookingAmount") !== Number(tenant.bookingAmount)) {
      form.setValue("bookingAmount", Number(tenant.bookingAmount));
    }
  }

  const watchedAmount = (useWatch({
    control: form.control,
    name: "bookingAmount",
  }) ?? undefined) as number | undefined;

  const onSubmit = (values: BookingPaymentValues) => {
    if (!currentTenant?.id) return;

    updateMutation.mutate(
      {
        id: currentTenant.id,
        data: {
          bookingAmount: values.bookingAmount && values.bookingAmount > 0
            ? values.bookingAmount
            : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Booking payment settings updated", {
            description: values.bookingAmount && values.bookingAmount > 0
              ? `Staff can now collect ৳${values.bookingAmount.toLocaleString()} as booking amount`
              : "Booking amount option disabled",
          });
        },
        onError: (error: Error) => {
          toast.error("Failed to update settings", {
            description: error.message,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Booking Payment Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          Booking Payment Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bookingAmount" className="text-xs">
                Booking Amount (৳)
              </Label>
              <Input
                id="bookingAmount"
                type="number"
                min="0"
                placeholder="e.g., 500"
                {...form.register("bookingAmount")}
                disabled={updateMutation.isPending}
              />
              <p className="text-[11px] text-muted-foreground">
                {watchedAmount && watchedAmount > 0
                  ? `Staff will see an option to collect ${formatTaka(watchedAmount)} as the booking amount during checkout.`
                  : "Leave empty to disable. Staff will only see 'No payment' and 'Full payment' options."}
              </p>
            </div>

            {form.formState.errors.bookingAmount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.bookingAmount.message}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending || !form.formState.isDirty}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>

              {form.formState.isDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.reset()}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
