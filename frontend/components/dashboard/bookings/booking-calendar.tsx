"use client";

/**
 * The day grid — rows = time, columns = courts, one cell per slot.
 *
 * Layout is a COLUMN-STACK with absolute positioning (NOT an HTML table):
 * courts can have different slot intervals (30/45/60/90/120 min), so shared
 * table rows cannot align across columns. Each block's top/height derive
 * from minutes × PX_PER_MINUTE against a shared day origin (the earliest
 * slot start across all courts), which keeps the gutter aligned with every
 * column and leaves gaps between pricing windows naturally empty.
 *
 * The current clock lives in an interval effect only — nothing Date-based
 * is touched during render, so SSR output is stable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bookingKeys } from "@/hooks/bookings";
import type {
  DayViewCourt,
  DayViewResponse,
  DayViewSlot,
} from "@/lib/types/booking";
import { NowLine } from "./now-line";
import {
  AvailableCell,
  BlockedCell,
  BookedCell,
  ExpiredCell,
  FillerCell,
  HeldCell,
} from "./slot-cell";
import {
  GUTTER_WIDTH_PX,
  MIN_COLUMN_WIDTH_PX,
  PX_PER_MINUTE,
  buildDayModel,
  fmtHHmm,
  gutterHours,
  isPast,
  toISODate,
  type PositionedBlock,
} from "./grid-utils";

/** Wall-clock snapshot refreshed by an interval — null before first tick. */
interface Now {
  iso: string;
  minute: number;
}

interface BookingCalendarProps {
  dayView: DayViewResponse;
  /** Selected day (YYYY-MM-DD) — now-line & past-dimming apply on today only. */
  date: string;
  onBookSlot: (court: DayViewCourt, slot: DayViewSlot) => void;
  onOpenBooking: (bookingId: string) => void;
}

export function BookingCalendar({
  dayView,
  date,
  onBookSlot,
  onOpenBooking,
}: BookingCalendarProps) {
  const queryClient = useQueryClient();
  const model = useMemo(() => buildDayModel(dayView), [dayView]);

  // ---- clock (effects only; never read during render) --------------------
  const [now, setNow] = useState<Now | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow({ iso: toISODate(d), minute: d.getHours() * 60 + d.getMinutes() });
    };
    // setState only inside timer callbacks (effect-body setState trips the
    // react-hooks compiler lint); 0ms timeout paints the first value.
    const timer = setInterval(tick, 60_000);
    const firstPaint = setTimeout(tick, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(firstPaint);
    };
  }, []);

  const isToday = now !== null && now.iso === date;

  // ---- hold expiry -> refetch the day view --------------------------------
  const handleHoldExpired = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: bookingKeys.dayView(date) });
  }, [queryClient, date]);

  // ---- anchor scroll near "now" once per selected date --------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const anchoredDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!now || now.iso !== date) return;
    if (anchoredDateRef.current === date) return;
    anchoredDateRef.current = date;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(
      0,
      (now.minute - model.dayStartMinute) * PX_PER_MINUTE - 120,
    );
  }, [date, now, model.dayStartMinute]);

  // ---- geometry ------------------------------------------------------------
  const bodyHeight =
    (model.dayEndMinute - model.dayStartMinute) * PX_PER_MINUTE;
  const hours = useMemo(
    () => gutterHours(model.dayStartMinute, model.dayEndMinute),
    [model.dayStartMinute, model.dayEndMinute],
  );

  const renderBlock = (block: PositionedBlock, court: DayViewCourt) => {
    switch (block.kind) {
      case "available":
        return (
          <AvailableCell
            key={block.slot.id}
            block={block}
            dayStartMinute={model.dayStartMinute}
            courtName={court.name}
            past={now !== null && isPast(date, block.slot.endTime, now.iso, now.minute)}
            onBook={(slot) => onBookSlot(court, slot)}
          />
        );
      case "booked":
        return (
          <BookedCell
            key={block.slot.id}
            block={block}
            dayStartMinute={model.dayStartMinute}
            courtName={court.name}
            onOpen={onOpenBooking}
          />
        );
      case "held":
        return (
          <HeldCell
            key={block.slot.id}
            block={block}
            dayStartMinute={model.dayStartMinute}
            onExpire={handleHoldExpired}
          />
        );
      case "blocked":
        return (
          <BlockedCell
            key={block.slot.id}
            block={block}
            dayStartMinute={model.dayStartMinute}
          />
        );
      case "expired":
        return (
          <ExpiredCell
            key={block.slot.id}
            block={block}
            dayStartMinute={model.dayStartMinute}
          />
        );
      case "filler":
        return (
          <FillerCell
            key={block.slot.id}
            block={block}
            dayStartMinute={model.dayStartMinute}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {/* Legend — status is never color alone (patterns + labels on cells) */}
      <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-green-300 bg-green-100 dark:border-green-800 dark:bg-green-950" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
            style={{
              background:
                "repeating-linear-gradient(45deg, rgba(245,158,11,0.4) 0px, rgba(245,158,11,0.4) 3px, transparent 3px, transparent 6px)",
            }}
          />
          On hold
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
            style={{
              background:
                "repeating-linear-gradient(135deg, rgba(239,68,68,0.4) 0px, rgba(239,68,68,0.4) 3px, transparent 3px, transparent 6px)",
            }}
          />
          Blocked
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div
          ref={scrollRef}
          className="relative max-h-[calc(100vh-320px)] min-h-[400px] overflow-auto"
        >
          <div
            style={{
              minWidth:
                GUTTER_WIDTH_PX + model.columns.length * MIN_COLUMN_WIDTH_PX,
            }}
          >
            {/* Court header row */}
            <div className="sticky top-0 z-40 flex border-b bg-card/95 backdrop-blur">
              <div
                className="sticky left-0 z-50 shrink-0 border-r bg-card"
                style={{ width: GUTTER_WIDTH_PX }}
              />
              {model.columns.map(({ court }) => (
                <div
                  key={court.id}
                  className="min-w-[200px] flex-1 px-3 py-2"
                  style={{ minWidth: MIN_COLUMN_WIDTH_PX }}
                >
                  <p className="truncate text-xs font-semibold text-foreground">
                    {court.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {court.slotIntervalMinutes} min slots
                  </p>
                </div>
              ))}
            </div>

            {/* Body: gutter + columns */}
            <div className="flex">
              <div
                className="relative shrink-0 border-r bg-card"
                style={{ width: GUTTER_WIDTH_PX, height: bodyHeight }}
              >
                {hours.map((m) => (
                  <span
                    key={m}
                    className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                    style={{ top: (m - model.dayStartMinute) * PX_PER_MINUTE }}
                  >
                    {fmtHHmm(m)}
                  </span>
                ))}
              </div>

              <div className="relative flex-1" style={{ height: bodyHeight }}>
                {/* Hour lines behind the cells */}
                {hours.map((m) => (
                  <div
                    key={m}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-border/50"
                    style={{ top: (m - model.dayStartMinute) * PX_PER_MINUTE }}
                  />
                ))}

                {isToday && now && (
                  <NowLine
                    topPx={
                      (now.minute - model.dayStartMinute) * PX_PER_MINUTE
                    }
                  />
                )}

                <div className="flex">
                  {model.columns.map(({ court, blocks }) => (
                    <div
                      key={court.id}
                      className="relative flex-1 border-l"
                      style={{ minWidth: MIN_COLUMN_WIDTH_PX }}
                    >
                      {blocks.map((block) => renderBlock(block, court))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading placeholder — skeleton grid (gutter + gray blocks), never a lone
 * spinner, so the page doesn't jump when data lands.
 */
export function CalendarSkeleton() {
  const placeholderHours = ["06:00", "07:00", "08:00", "09:00", "10:00"];
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex border-b bg-card/95">
        <div
          className="shrink-0 border-r bg-card"
          style={{ width: GUTTER_WIDTH_PX }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="min-w-[200px] flex-1 animate-pulse px-3 py-2"
            style={{ minWidth: MIN_COLUMN_WIDTH_PX }}
          >
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-1.5 h-2 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex">
        <div
          className="shrink-0 space-y-[75px] border-r p-3"
          style={{ width: GUTTER_WIDTH_PX }}
        >
          {placeholderHours.map((h) => (
            <div key={h} className="h-2.5 w-8 rounded bg-muted" />
          ))}
        </div>
        {[0, 1, 2].map((col) => (
          <div
            key={col}
            className="min-w-[200px] flex-1 space-y-3 border-l p-2"
            style={{ minWidth: MIN_COLUMN_WIDTH_PX }}
          >
            {[0, 1, 2, 3].map((row) => (
              <div
                key={row}
                className="h-[84px] animate-pulse rounded-md bg-muted"
                style={{
                  animationDelay: `${(col * 4 + row) * 75}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
