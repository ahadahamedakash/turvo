"use client";

/**
 * Cancel a booking (POST /bookings/:id/cancel). Reason is ALWAYS required —
 * no exceptions. When the booking has money against it, a refund section
 * appears (amount clamped to paidAmount client-side; the server enforces too).
 *
 * The success toast names the released slots explicitly — the staff mental
 * model is "canceling frees inventory", not just "deleting a record".
 */

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarX2, Loader2 } from "lucide-react";
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
import { RHFInput, RHFSelect, RHFTextarea } from "@/components/forms/form-field";
import { bookingKeys, useCancelBooking } from "@/hooks/bookings";
import { handleApiError } from "@/lib/api/api-client";
import {
  cancelBookingSchema,
  type CancelBookingForm,
} from "@/lib/schemas/booking";
import type { BookingDetail, CancelBookingDto } from "@/lib/types/booking";
import { formatDateLabel, formatTaka, formatTime12 } from "./grid-utils";

type CancelBookingInput = z.input<typeof cancelBookingSchema>;

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetail;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  booking,
}: CancelBookingDialogProps) {
  const queryClient = useQueryClient();
  const cancelMutation = useCancelBooking();

  const paidAmount = Number(booking.paidAmount);
  const total = Number(booking.total);
  const hasPaid = paidAmount > 0;

  // UI gate — the refund block only ships when the switch is on.
  const [wantsRefund, setWantsRefund] = useState(hasPaid);

  const form = useForm<CancelBookingInput, unknown, CancelBookingForm>({
    resolver: zodResolver(cancelBookingSchema),
    defaultValues: {
      reason: "",
      refund: { amount: paidAmount, method: "Cash" },
    },
  });

  // useWatch (not form.watch) — the compiler-safe way to read in render.
  const watchedRefund = useWatch({ control: form.control, name: "refund" });

  const onSubmit = (values: CancelBookingForm) => {
    if (wantsRefund && values.refund && values.refund.amount > paidAmount) {
      form.setError("refund.amount", {
        message: `Refund cannot exceed what was paid (${formatTaka(paidAmount)})`,
      });
      return;
    }

    const data: CancelBookingDto = {
      reason: values.reason.trim(),
      refund:
        wantsRefund && values.refund && hasPaid
          ? {
              amount: values.refund.amount,
              method: values.refund.method,
            }
          : undefined,
    };

    cancelMutation.mutate(
      { id: booking.id, data },
      {
        onSuccess: () => {
          toast.success("Booking cancelled", {
            description: `${booking.customer.firstName} ${booking.customer.lastName} · ${formatDateLabel(booking.date)} ${formatTime12(booking.startTime)}–${formatTime12(booking.endTime)} — ${booking.slotCount} ${booking.slotCount === 1 ? "slot" : "slots"} released`,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          const apiError = handleApiError(error);
          if (apiError.status === 409) {
            toast.error("Booking was modified by someone else", {
              description: "It may already be cancelled. Refreshing.",
            });
            queryClient.invalidateQueries({
              queryKey: bookingKeys.detail(booking.id),
            });
            queryClient.invalidateQueries({ queryKey: bookingKeys.dayViews() });
            onOpenChange(false);
          } else {
            toast.error("Failed to cancel booking", {
              description: apiError.message,
            });
          }
        },
      },
    );
  };

  const isSaving = cancelMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10 text-red-600">
              <CalendarX2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Cancel booking</DialogTitle>
              <DialogDescription>
                {booking.courtName} · {formatDateLabel(booking.date)} ·{" "}
                {formatTime12(booking.startTime)}–{formatTime12(booking.endTime)}{" "}
                · {formatTaka(total)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFTextarea
              name="reason"
              label="Reason (required)"
              placeholder="Why is this booking being cancelled?"
              rows={2}
              maxLength={255}
              required
              disabled={isSaving}
            />

            {hasPaid && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Refund advance</Label>
                    <p className="text-[11px] text-muted-foreground">
                      {formatTaka(paidAmount)} was collected.
                    </p>
                  </div>
                  <Switch
                    checked={wantsRefund}
                    onCheckedChange={setWantsRefund}
                    disabled={isSaving}
                  />
                </div>
                {wantsRefund && (
                  <div className="grid grid-cols-2 gap-3">
                    <RHFInput
                      name="refund.amount"
                      label="Refund (৳)"
                      type="number"
                      min={1}
                      max={paidAmount}
                      required
                      disabled={isSaving}
                    />
                    <RHFSelect
                      name="refund.method"
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
              </div>
            )}

            <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
              {wantsRefund && hasPaid
                ? `${booking.slotCount} ${booking.slotCount === 1 ? "slot" : "slots"} will be released back to available · refund ${formatTaka(Number(watchedRefund?.amount ?? 0))}`
                : `${booking.slotCount} ${booking.slotCount === 1 ? "slot" : "slots"} will be released back to available`}
            </p>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Keep booking
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  "Cancel booking"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
