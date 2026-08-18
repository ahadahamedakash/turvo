"use client";

/**
 * Bookings table for the List tab — mirrors the slots data table so the two
 * pages read as one product (dense ops-tool aesthetic, horizontal scroll on
 * mobile). Row click opens the SAME detail sheet the calendar uses.
 */

import {
  Building2,
  Calendar,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingListResponse } from "@/lib/types/booking";
import { BookingStatusBadge } from "./booking-status-badge";
import { PaymentChip } from "./payment-chip";
import { formatDate, formatTaka, formatTime12 } from "./grid-utils";

interface BookingsDataTableProps {
  data: BookingListResponse | undefined;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onRowClick: (bookingId: string) => void;
  onClearFilters: () => void;
}

const EMPTY_RESPONSE: BookingListResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
};

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="space-y-0 divide-y divide-border/60">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-4 p-3.5">
            <div
              className="h-4 w-20 animate-pulse rounded bg-muted"
              style={{ animationDelay: `${row * 60}ms` }}
            />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingsDataTable({
  data,
  isLoading,
  onPageChange,
  onRowClick,
  onClearFilters,
}: BookingsDataTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  const response = data ?? EMPTY_RESPONSE;
  const bookings = response.data;

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center shadow-xs">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CalendarX2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          No bookings match these filters
        </h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Try widening the date range or clearing a filter.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 h-8 text-xs"
          onClick={onClearFilters}
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="p-3.5 pl-4">Date</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Court</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Total / Paid / Due</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-4">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {bookings.map((booking) => {
                const dueAmount = Number(booking.due);
                return (
                  <tr
                    key={booking.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => onRowClick(booking.id)}
                  >
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {formatDate(booking.date)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-foreground">
                          {formatTime12(booking.startTime)} –{" "}
                          {formatTime12(booking.endTime)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-teal-600" />
                        <span className="font-medium text-foreground">
                          {booking.courtName}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {booking.customerName}
                          </p>
                          {booking.customerPhone && (
                            <p className="flex items-center gap-1 tabular-nums text-[11px] text-muted-foreground">
                              <Phone className="h-2.5 w-2.5" />
                              {booking.customerPhone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {booking.slotCount}{" "}
                      {booking.slotCount === 1 ? "slot" : "slots"} ·{" "}
                      {booking.durationLabel}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-baseline gap-1.5 tabular-nums">
                        <span className="font-semibold text-foreground">
                          {formatTaka(booking.total)}
                        </span>
                        <span className="text-muted-foreground">
                          / {formatTaka(booking.paidAmount)}
                        </span>
                        <span
                          className={
                            dueAmount > 0
                              ? "font-medium text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground"
                          }
                        >
                          / {formatTaka(booking.due)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="p-3.5 pr-4">
                      <PaymentChip
                        status={booking.paymentStatus}
                        due={booking.due}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination (slots-table style) */}
      {response.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Showing Page{" "}
            <span className="font-semibold text-foreground">
              {response.page}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {response.totalPages}
            </span>{" "}
            · {response.total} bookings
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => onPageChange(response.page - 1)}
              disabled={response.page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => onPageChange(response.page + 1)}
              disabled={response.page >= response.totalPages}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
