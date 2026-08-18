"use client";

/**
 * Booking detail sheet — the operational cockpit. Opens from the right so the
 * calendar stays visible; staff keep context of the day while working a
 * booking (money math, history, every lifecycle action).
 *
 * One instance is shared by the calendar grid and the list view — the page
 * owns `bookingId`; closing nulls it.
 *
 * UX-only permission gating hides actions the user can't take; the backend
 * remains the enforcement point (403s still toast).
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  HandCoins,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  StickyNote,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  bookingKeys,
  useBooking,
  useCompleteBooking,
  useConfirmBooking,
  useNoShowBooking,
} from "@/hooks/bookings";
import { usePermissions } from "@/hooks/use-permissions";
import { handleApiError } from "@/lib/api/api-client";
import type { BookingEventType } from "@/lib/types/enums";
import type { PaymentRecord } from "@/lib/types/booking";
import { BookingStatusBadge } from "./booking-status-badge";
import { CancelBookingDialog } from "./cancel-booking-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { formatDateLabel, formatDateTime, formatTaka, formatTime12 } from "./grid-utils";

interface BookingDetailSheetProps {
  bookingId: string | null;
  onOpenChange: (open: boolean) => void;
}

/** Timeline icon + tint per event type. */
const eventIcon: Record<
  BookingEventType,
  { icon: typeof CheckCircle2; className: string }
> = {
  Created: { icon: CheckCircle2, className: "text-teal-600 dark:text-teal-400" },
  StatusChanged: { icon: ArrowRight, className: "text-blue-600 dark:text-blue-400" },
  PaymentReceived: { icon: Banknote, className: "text-green-600 dark:text-green-400" },
  Cancelled: { icon: XCircle, className: "text-red-600 dark:text-red-400" },
  Rescheduled: { icon: CalendarClock, className: "text-amber-600 dark:text-amber-400" },
  Updated: { icon: Pencil, className: "text-muted-foreground" },
};

function PaymentRow({ payment }: { payment: PaymentRecord }) {
  const isRefund = payment.type === "Refund";
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Badge
        variant="outline"
        className="shrink-0 bg-muted/40 text-[10px] text-foreground"
      >
        {payment.method}
      </Badge>
      <div className="min-w-0 flex-1 text-xs">
        <p className="text-foreground">
          {payment.type}
          <span className="text-muted-foreground">
            {" "}
            · {formatDateTime(payment.createdAt)}
          </span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          by {payment.issuedByName}
          {payment.referenceNumber ? ` · ${payment.referenceNumber}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          isRefund ? "text-red-600 dark:text-red-400" : "text-foreground"
        }`}
      >
        {isRefund ? "−" : ""}
        {formatTaka(payment.amount)}
      </span>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="h-20 animate-pulse rounded-lg bg-muted" />
      <div className="h-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export function BookingDetailSheet({
  bookingId,
  onOpenChange,
}: BookingDetailSheetProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const bookingQuery = useBooking(bookingId ?? "");
  const booking = bookingQuery.data;

  const confirmMutation = useConfirmBooking();
  const completeMutation = useCompleteBooking();
  const noShowMutation = useNoShowBooking();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const whenWhereLabel = booking
    ? `${booking.courtName} · ${formatDateLabel(booking.date)} ${formatTime12(booking.startTime)}–${formatTime12(booking.endTime)}`
    : "";

  /** Shared onError for the direct (non-dialog) lifecycle actions. */
  const handleActionError = (error: unknown) => {
    const apiError = handleApiError(error);
    if (apiError.status === 409) {
      toast.error("Booking was modified by someone else", {
        description: "Refreshing the latest state.",
      });
      if (bookingId) {
        queryClient.invalidateQueries({
          queryKey: bookingKeys.detail(bookingId),
        });
      }
    } else {
      toast.error("Action failed", { description: apiError.message });
    }
  };

  const customerName = booking
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : "";

  const runConfirm = () =>
    booking &&
    confirmMutation.mutate(booking.id, {
      onSuccess: () =>
        toast.success("Booking confirmed", {
          description: `${customerName} · ${whenWhereLabel}`,
        }),
      onError: handleActionError,
    });

  const runComplete = () =>
    booking &&
    completeMutation.mutate(booking.id, {
      onSuccess: () =>
        toast.success("Marked completed", {
          description: `${customerName} · ${whenWhereLabel}`,
        }),
      onError: handleActionError,
    });

  const runNoShow = () =>
    booking &&
    noShowMutation.mutate(booking.id, {
      onSuccess: () =>
        toast.warning("Marked no-show", {
          description: `${customerName} · ${whenWhereLabel}`,
        }),
      onError: handleActionError,
    });

  // ---- action bar visibility: status × permission matrix -------------------
  const canUpdate = hasPermission("Booking.update");
  const canRecordPayment = hasPermission("Payment.create");
  const status = booking?.status;

  const showConfirm = status === "Pending" && canUpdate;
  const showComplete = status === "Confirmed" && canUpdate;
  const showNoShow =
    (status === "Pending" || status === "Confirmed") && canUpdate;
  const showCancel =
    (status === "Pending" || status === "Confirmed") && canUpdate;
  const showRecordPayment =
    (status === "Pending" ||
      status === "Confirmed" ||
      status === "Completed") &&
    canRecordPayment;
  const hasActions =
    booking &&
    (showConfirm || showComplete || showNoShow || showCancel || showRecordPayment);
  const anyActionPending =
    confirmMutation.isPending ||
    completeMutation.isPending ||
    noShowMutation.isPending;

  const initials = booking
    ? `${booking.customer.firstName[0] ?? ""}${booking.customer.lastName[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <Sheet open={bookingId !== null} onOpenChange={(o) => !o && onOpenChange(false)}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        {bookingQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            Couldn&apos;t load this booking —{" "}
            {handleApiError(bookingQuery.error).message}
          </div>
        ) : !booking ? (
          <DetailSkeleton />
        ) : (
          <>
            <SheetHeader className="space-y-1 border-b p-5">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base">
                  Booking {booking.id.slice(0, 8)}
                </SheetTitle>
                <BookingStatusBadge status={booking.status} />
              </div>
              <SheetDescription className="text-xs">
                Created by {booking.createdByName} ·{" "}
                {formatDateTime(booking.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 p-5">
              {/* Customer card */}
              <div className="flex items-start gap-3 rounded-lg border bg-card p-3.5">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-teal-600/10 text-xs font-semibold text-teal-700 dark:text-teal-400">
                    {initials || <UserRound className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1 text-xs">
                  <p className="text-sm font-semibold text-foreground">
                    {customerName}
                  </p>
                  {booking.customerPhone && (
                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="flex items-center gap-1.5 text-teal-700 hover:underline dark:text-teal-400"
                    >
                      <Phone className="h-3 w-3" />
                      {booking.customerPhone}
                    </a>
                  )}
                  {booking.customer.email && (
                    <a
                      href={`mailto:${booking.customer.email}`}
                      className="flex items-center gap-1.5 text-muted-foreground hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {booking.customer.email}
                    </a>
                  )}
                  {booking.notes && (
                    <p className="flex items-start gap-1.5 pt-1 text-muted-foreground">
                      <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                      {booking.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* When / where */}
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-lg border bg-card p-3.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {booking.courtName}
                </span>
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">
                  {formatDateLabel(booking.date)}
                </span>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular-nums text-foreground">
                  {formatTime12(booking.startTime)} –{" "}
                  {formatTime12(booking.endTime)}{" "}
                  <span className="text-muted-foreground">
                    · {booking.slotCount}{" "}
                    {booking.slotCount === 1 ? "slot" : "slots"} ·{" "}
                    {booking.durationLabel}
                  </span>
                </span>
              </div>

              {/* Price breakdown */}
              <div className="space-y-1.5 rounded-lg border bg-card p-3.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatTaka(booking.subTotal)}</span>
                </div>
                {Number(booking.discount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      −{formatTaka(booking.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 font-semibold text-foreground">
                  <span>Total</span>
                  <span className="tabular-nums">{formatTaka(booking.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Paid</span>
                  <span className="tabular-nums">
                    {formatTaka(booking.paidAmount)}
                  </span>
                </div>
                <div
                  className={`flex justify-between font-semibold ${
                    Number(booking.due) > 0
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  <span>Due</span>
                  <span className="tabular-nums">{formatTaka(booking.due)}</span>
                </div>
              </div>

              {/* Payments */}
              {booking.payments.length > 0 && (
                <div className="rounded-lg border bg-card p-3.5">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payments
                  </h3>
                  <ul className="divide-y divide-border/60">
                    {booking.payments.map((payment) => (
                      <PaymentRow key={payment.id} payment={payment} />
                    ))}
                  </ul>
                </div>
              )}

              {/* Event timeline (newest first) */}
              <div className="rounded-lg border bg-card p-3.5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  History
                </h3>
                <ol className="space-y-3">
                  {booking.events.map((event) => {
                    const meta = eventIcon[event.eventType];
                    const Icon = meta.icon;
                    return (
                      <li key={event.id} className="flex items-start gap-2.5">
                        <Icon
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${meta.className}`}
                        />
                        <div className="min-w-0 text-xs">
                          <p className="text-foreground">{event.summary}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {event.issuedByName} ·{" "}
                            {formatDateTime(event.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Cancellation note */}
              {booking.status === "Cancelled" && booking.cancelledByName && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
                  Cancelled by {booking.cancelledByName}
                  {booking.cancelledAt
                    ? ` · ${formatDateTime(booking.cancelledAt)}`
                    : ""}
                </p>
              )}

              {/* Action bar */}
              {hasActions ? (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    {showConfirm && (
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={runConfirm}
                        disabled={anyActionPending}
                      >
                        {confirmMutation.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                    )}
                    {showRecordPayment && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setPaymentOpen(true)}
                      >
                        <HandCoins className="h-3.5 w-3.5" /> Record payment
                      </Button>
                    )}
                    {showComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={runComplete}
                        disabled={anyActionPending}
                      >
                        {completeMutation.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Mark completed"
                        )}
                      </Button>
                    )}
                    {showNoShow && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={runNoShow}
                        disabled={anyActionPending}
                      >
                        {noShowMutation.isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Mark no-show"
                        )}
                      </Button>
                    )}
                    {showCancel && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 ml-auto text-xs"
                        onClick={() => setCancelOpen(true)}
                      >
                        Cancel booking
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="border-t pt-4 text-center text-[11px] text-muted-foreground">
                  No actions available for this booking.
                </p>
              )}
            </div>

            {/* Sub-dialogs — keyed remount captures fresh amounts per open */}
            {paymentOpen && (
              <RecordPaymentDialog
                open
                onOpenChange={(o) => !o && setPaymentOpen(false)}
                booking={booking}
              />
            )}
            {cancelOpen && (
              <CancelBookingDialog
                open
                onOpenChange={(o) => !o && setCancelOpen(false)}
                booking={booking}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
