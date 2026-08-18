"use client";

/**
 * Date navigation: a 7-day window of chips ENDING at the selected date,
 * ◀ ▶ (day step), a Today jump, and a native date input for arbitrary
 * jumps. No calendar library — all chip dates derive from the selected
 * ISO string via pure UTC math.
 *
 * Weekend days come from the tenant's slot settings (default Fri+Sat);
 * holidays come from the tenant's holiday calendar (dot + tooltip).
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WEEKDAY_LABELS } from "@/lib/types/slot";
import { isoAddDays, isoWeekday } from "./grid-utils";

interface DateStripProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  todayIso: string;
  /** ISO weekday ints (0 = Sunday); defaults to the tenant default [5, 6]. */
  weekendDays?: number[];
  /** Map of YYYY-MM-DD -> holiday name. */
  holidays?: Record<string, string>;
}

export function DateStrip({
  selectedDate,
  onSelect,
  todayIso,
  weekendDays = [5, 6],
  holidays = {},
}: DateStripProps) {
  const days = Array.from({ length: 7 }, (_, k) =>
    isoAddDays(selectedDate, k - 6),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSelect(isoAddDays(selectedDate, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSelect(isoAddDays(selectedDate, 1))}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={selectedDate === todayIso}
          onClick={() => onSelect(todayIso)}
        >
          Today
        </Button>
      </div>

      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
        {days.map((iso) => {
          const weekday = isoWeekday(iso);
          const isSelected = iso === selectedDate;
          const isToday = iso === todayIso;
          const isWeekend = weekendDays.includes(weekday);
          const holidayName = holidays[iso];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              title={holidayName ?? undefined}
              aria-label={`${WEEKDAY_LABELS[weekday]} ${iso}${holidayName ? ` — ${holidayName}` : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "flex min-w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 transition-colors",
                isSelected
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-border bg-card text-foreground hover:border-teal-500/60 hover:bg-teal-50/50 dark:hover:bg-teal-950/30",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  isSelected
                    ? "text-teal-50"
                    : isWeekend
                      ? "text-rose-500 dark:text-rose-400"
                      : "text-muted-foreground",
                )}
              >
                {WEEKDAY_LABELS[weekday].slice(0, 3)}
              </span>
              <span
                className={cn(
                  "relative text-sm font-bold leading-none tabular-nums",
                  isToday && !isSelected && "text-teal-600 dark:text-teal-400",
                )}
              >
                {Number(iso.slice(8, 10))}
                {holidayName && (
                  <span
                    className={cn(
                      "absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full",
                      isSelected ? "bg-amber-300" : "bg-amber-500",
                    )}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value);
        }}
        aria-label="Jump to date"
        className="h-8 rounded-md border bg-background px-2 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark]"
      />
    </div>
  );
}
