"use client";

/**
 * Derived payment state chip for a booking (server-computed from
 * paidAmount vs total). `mini` is the compact grid variant used inside
 * booked calendar blocks.
 */

import { Badge } from "@/components/ui/badge";
import type { BookingPaymentStatus } from "@/lib/types/booking";
import { formatTaka } from "./grid-utils";

const chipStyles: Record<BookingPaymentStatus, string> = {
  Paid: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  Partial:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  Unpaid:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

export function PaymentChip({
  status,
  due,
  mini = false,
}: {
  status: BookingPaymentStatus;
  /** Remaining due as a money string ("400.00") — shown on Partial. */
  due?: string;
  mini?: boolean;
}) {
  const label =
    status === "Partial" && due !== undefined
      ? `Due ${formatTaka(due)}`
      : status;

  return (
    <Badge
      variant="outline"
      className={
        mini ? `px-1.5 py-0 text-[10px] ${chipStyles[status]}` : chipStyles[status]
      }
    >
      {label}
    </Badge>
  );
}
