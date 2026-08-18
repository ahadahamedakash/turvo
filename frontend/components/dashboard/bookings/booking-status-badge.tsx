"use client";

/**
 * Status badge for a booking lifecycle state.
 * Palettes mirror slot-status-badge.tsx (light + dark pairs).
 *
 * `mini` renders the compact grid variant — Pending becomes "TENTATIVE" so a
 * tentative block reads at a glance on the calendar.
 */

import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/lib/types/enums";

const statusStyles: Record<BookingStatus, string> = {
  Pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
  Confirmed:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
  Completed:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900",
  Cancelled:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  NoShow:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
};

const miniLabels: Record<BookingStatus, string> = {
  Pending: "Tentative",
  Confirmed: "Confirmed",
  Completed: "Done",
  Cancelled: "Cancelled",
  NoShow: "No-show",
};

export function BookingStatusBadge({
  status,
  mini = false,
}: {
  status: BookingStatus;
  mini?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={
        mini
          ? `px-1.5 py-0 text-[10px] ${statusStyles[status]}`
          : statusStyles[status]
      }
    >
      {mini ? miniLabels[status] : status}
    </Badge>
  );
}
