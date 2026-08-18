"use client";

/**
 * Record a manual payment against a booking (POST /bookings/:id/payments).
 *
 * Defaults to the remaining due. On a 409 "balance changed" (a concurrent
 * payment by other staff) the dialog STAYS OPEN — the toast explains, and the
 * detail + day-view invalidation refreshes the due underneath it.
 *
 * Mounted conditionally by the sheet, so `defaultValues` capture the due at
 * open time (fresh per open).
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { HandCoins, Loader2 } from "lucide-react";
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
import { bookingKeys, useRecordPayment } from "@/hooks/bookings";
import { handleApiError } from "@/lib/api/api-client";
import {
  recordPaymentSchema,
  type RecordPaymentForm,
} from "@/lib/schemas/booking";
import type { BookingDetail, RecordPaymentDto } from "@/lib/types/booking";
import { formatTaka } from "./grid-utils";

type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetail;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  booking,
}: RecordPaymentDialogProps) {
  const queryClient = useQueryClient();
  const recordMutation = useRecordPayment();

  const due = Number(booking.total) - Number(booking.paidAmount);

  const form = useForm<RecordPaymentInput, unknown, RecordPaymentForm>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: Math.max(due, 0),
      method: "Cash",
      referenceNumber: "",
    },
  });

  const onSubmit = (values: RecordPaymentForm) => {
    if (values.amount > due) {
      form.setError("amount", {
        message: `Amount cannot exceed the due balance (${formatTaka(due)})`,
      });
      return;
    }

    const data: RecordPaymentDto = {
      amount: values.amount,
      method: values.method,
      referenceNumber: values.referenceNumber?.trim() || undefined,
    };

    recordMutation.mutate(
      { id: booking.id, data },
      {
        onSuccess: (payment) => {
          toast.success(`${formatTaka(payment.amount)} received`, {
            description: `${payment.method} · ${booking.customer.firstName} ${booking.customer.lastName}`,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          const apiError = handleApiError(error);
          if (apiError.status === 409) {
            toast.error("Balance changed", {
              description:
                "Someone else recorded a payment on this booking. Amounts have been refreshed.",
            });
            // Keep the dialog open over refreshed numbers.
            queryClient.invalidateQueries({
              queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
          } else {
            toast.error("Failed to record payment", {
              description: apiError.message,
            });
          }
        },
      },
    );
  };

  const isSaving = recordMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-teal-600">
              <HandCoins className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                {booking.courtName} · due {formatTaka(due)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFInput
              name="amount"
              label="Amount (৳)"
              type="number"
              min={1}
              required
              disabled={isSaving}
            />
            <RHFSelect
              name="method"
              label="Method"
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
              <Button type="submit" disabled={isSaving || due <= 0}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Record payment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
