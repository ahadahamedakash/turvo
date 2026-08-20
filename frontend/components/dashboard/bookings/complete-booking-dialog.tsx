"use client";

/**
 * Complete a booking and collect the due amount in one action.
 *
 * Shows when booking.due > 0. Confirms the staff wants to mark the booking
 * complete AND collect the outstanding balance. Payment amount is fixed to
 * the due (not editable — staff can record partial payments separately via
 * the "Record payment" action).
 *
 * On submit:
 * 1. POST /bookings/:id/complete (status change)
 * 2. POST /bookings/:id/payments (record payment)
 *
 * If payment fails after complete succeeds: warning toast, dialog closes,
 * but booking IS completed (correct state). Staff can record payment manually.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { RHFInput, RHFSelect } from "@/components/forms/form-field";
import {
  bookingKeys,
  useCompleteBooking,
  useRecordPayment,
} from "@/hooks/bookings";
import { handleApiError } from "@/lib/api/api-client";
import {
  recordPaymentSchema,
  type RecordPaymentForm,
} from "@/lib/schemas/booking";
import type { BookingDetail, RecordPaymentDto } from "@/lib/types/booking";
import { formatDateLabel, formatTaka, formatTime12 } from "./grid-utils";

type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

interface CompleteBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetail;
}

export function CompleteBookingDialog({
  open,
  onOpenChange,
  booking,
}: CompleteBookingDialogProps) {
  const queryClient = useQueryClient();
  const completeMutation = useCompleteBooking();
  const recordPaymentMutation = useRecordPayment();

  const due = Number(booking.total) - Number(booking.paidAmount);
  const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`;
  const whenWhereLabel = `${formatDateLabel(booking.date)} ${formatTime12(booking.startTime)}–${formatTime12(booking.endTime)}`;

  const form = useForm<RecordPaymentInput, unknown, RecordPaymentForm>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: due,
      method: "Cash",
      referenceNumber: "",
    },
  });

  const onSubmit = async (values: RecordPaymentForm) => {
    try {
      // Step 1: Complete the booking
      await completeMutation.mutateAsync(booking.id);

      // Step 2: Record payment
      try {
        const data: RecordPaymentDto = {
          amount: values.amount,
          method: values.method,
          referenceNumber: values.referenceNumber?.trim() || undefined,
        };

        await recordPaymentMutation.mutateAsync({ id: booking.id, data });

        // Success: both operations succeeded
        toast.success("Booking completed", {
          description: `Collected ${formatTaka(values.amount)} · ${customerName} · ${whenWhereLabel}`,
        });
        onOpenChange(false);
      } catch (paymentError) {
        // Payment failed but booking is completed
        toast.warning("Booking completed, but payment recording failed", {
          description:
            "The booking is marked as completed. Please record the payment manually.",
        });
        onOpenChange(false);
      }
    } catch (completeError) {
      // Complete failed - show error, keep dialog open
      const apiError = handleApiError(completeError);
      if (apiError.status === 409) {
        toast.error("Booking was modified by someone else", {
          description: "Refreshing the latest state.",
        });
        queryClient.invalidateQueries({
          queryKey: bookingKeys.detail(booking.id),
        });
      } else {
        toast.error("Failed to complete booking", {
          description: apiError.message,
        });
      }
    }
  };

  const isSaving = completeMutation.isPending || recordPaymentMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Complete booking and collect payment</DialogTitle>
              <DialogDescription>
                {booking.courtName} · {formatDateLabel(booking.date)} ·{" "}
                {formatTime12(booking.startTime)}–{formatTime12(booking.endTime)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Warning message about due amount */}
        <div className="rounded-lg border border-amber-600/20 bg-amber-600/10 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Due amount: {formatTaka(due)}</strong>
            <br />
            This booking has an outstanding balance. Complete and collect the
            payment now?
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payment amount (fixed to due, visually displayed) */}
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Amount to collect
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatTaka(due)}
                </span>
              </div>
            </div>

            <RHFSelect
              name="method"
              label="Payment method"
              options={[
                { value: "Cash", label: "Cash" },
                { value: "Card", label: "Card (v2)" },
                { value: "MobileBanking", label: "Mobile banking (v2)" },
              ]}
              disabled={isSaving}
            />
            <RHFInput
              name="referenceNumber"
              label="Reference (optional)"
              placeholder="e.g. bKash TrxID"
              maxLength={100}
              disabled={isSaving}
            />

            <DialogFooter>
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
                  <>Complete & collect {formatTaka(due)}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
