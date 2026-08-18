"use client";

/**
 * One-line quiet summary of the day: bookings count · utilization ·
 * collected. Compact by design — no vanity dashboard (Task 5 spec).
 */

import type { DayViewStats } from "@/lib/types/booking";
import { formatTaka } from "./grid-utils";

export function DayStatsStrip({ stats }: { stats: DayViewStats }) {
  const pct = Math.round(stats.utilizationPct);

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border bg-card px-4 py-2.5 shadow-xs">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Bookings
        </p>
        <p className="mt-0.5 text-lg font-bold tabular-nums leading-tight text-foreground">
          {stats.bookingsCount}
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {stats.bookedSlots}/{stats.totalSlots} slots
          </span>
        </p>
      </div>

      <div className="rounded-lg border bg-card px-4 py-2.5 shadow-xs">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Utilization
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Slot utilization"
          >
            <div
              className="h-full rounded-full bg-teal-600 dark:bg-teal-500"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums text-foreground">
            {pct}%
          </span>
        </div>
      </div>

      <div className="rounded-lg border bg-card px-4 py-2.5 shadow-xs">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Collected
        </p>
        <p className="mt-0.5 text-lg font-bold tabular-nums leading-tight text-foreground">
          {formatTaka(stats.collected)}
        </p>
      </div>
    </div>
  );
}
