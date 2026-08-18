/**
 * Pure grid helpers for the bookings day calendar.
 *
 * Everything here is deterministic: time math operates on "HH:mm" strings and
 * date math on "YYYY-MM-DD" strings via Date.UTC (a fixed epoch computation —
 * NOT a clock read). The only exception is `toISODate(date)`, which reads the
 * passed Date's local fields: call it at module scope or inside effects,
 * never during render (react-hooks purity rule).
 */

import type {
  DayViewBooking,
  DayViewCourt,
  DayViewResponse,
  DayViewSlot,
} from "@/lib/types/booking";

/** Vertical scale of the grid — 60-minute slot = 90px. */
export const PX_PER_MINUTE = 1.5;

/** Fixed width of the time gutter (w-14). */
export const GUTTER_WIDTH_PX = 56;

/** Courts never shrink below this — more courts scroll horizontally. */
export const MIN_COLUMN_WIDTH_PX = 200;

// ---------------------------------------------------------------------------
// HH:mm <-> minutes
// ---------------------------------------------------------------------------

/** "09:30" -> 570 */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" (wraps past midnight: 1440 -> "00:00") */
export function fmtHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/** "09:30" + 45 -> "10:15" */
export function addMinutes(hhmm: string, minutes: number): string {
  return fmtHHmm(minutesOf(hhmm) + minutes);
}

// ---------------------------------------------------------------------------
// ISO date math (deterministic — Date.UTC epoch arithmetic, no clock reads)
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Local calendar date of a Date -> "YYYY-MM-DD". Module scope / effects only. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function utcEpoch(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** "2026-08-17" + 7 -> "2026-08-24" */
export function isoAddDays(iso: string, days: number): string {
  const t = new Date(utcEpoch(iso) + days * 86_400_000);
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** Whole days from -> to (negative when to is earlier). */
export function isoDiffDays(fromIso: string, toIso: string): number {
  return Math.round((utcEpoch(toIso) - utcEpoch(fromIso)) / 86_400_000);
}

/** Weekday of an ISO date: 0 = Sunday … 6 = Saturday. */
export function isoWeekday(iso: string): number {
  return new Date(utcEpoch(iso)).getUTCDay();
}

// ---------------------------------------------------------------------------
// "Now" comparisons (values supplied by the caller's interval effect)
// ---------------------------------------------------------------------------

/**
 * A slot is past once its END time has passed (an in-progress slot is no
 * longer bookable). Caller passes the current wall-clock date + minute.
 */
export function isPast(
  dateIso: string,
  endTime: string,
  todayIso: string,
  nowMinute: number,
): boolean {
  if (dateIso < todayIso) return true;
  if (dateIso > todayIso) return false;
  return minutesOf(endTime) <= nowMinute;
}

// ---------------------------------------------------------------------------
// Display formatting (deterministic — conversions of given values, no clock
// reads, so these are safe to call during render)
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "19:30" -> "7:30 PM" */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)} ${period}`;
}

/** "2026-08-21" -> "Fri, Aug 21" (weekday via Date.UTC — no TZ shift). */
export function formatDateLabel(iso: string): string {
  const d = new Date(utcEpoch(iso));
  return `${WEEKDAY_LABELS[d.getUTCDay()]}, ${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "2026-08-21" -> "Aug 21, 2026" */
export function formatDate(iso: string): string {
  const d = new Date(utcEpoch(iso));
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** ISO timestamp -> "Aug 21, 3:42 PM" (viewer-local time). */
export function formatDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const h = d.getHours();
  const period = h >= 12 ? "PM" : "AM";
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${h % 12 || 12}:${pad2(d.getMinutes())} ${period}`;
}

/** 45 -> "45 min", 60 -> "1 hr", 90 -> "1.5 hr" (courts differ). */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = minutes / 60;
  return `${Number.isInteger(hrs) ? hrs : hrs.toFixed(1)} hr`;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** "4200" -> "৳4,200" (backend sends Prisma Decimals as strings). */
export function formatTaka(amount: string | number): string {
  return `৳${Number(amount).toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Day model — the grid's build step
// ---------------------------------------------------------------------------

export type BlockKind =
  | "available"
  | "booked"
  | "held"
  | "blocked"
  | "expired"
  | "filler";

export interface PositionedBlock {
  kind: BlockKind;
  /** Minutes since midnight of the block's start. */
  startMinute: number;
  /** Duration in minutes (summed for merged booked blocks). */
  minutes: number;
  /** Owning slot — the FIRST slot for merged booked blocks. */
  slot: DayViewSlot;
  /** Present on "booked" blocks. */
  booking?: DayViewBooking;
}

export interface CourtColumnModel {
  court: DayViewCourt;
  blocks: PositionedBlock[];
}

export interface DayModel {
  /** Earliest slot start across ALL courts (gutter origin). */
  dayStartMinute: number;
  /** Latest slot end across all courts. */
  dayEndMinute: number;
  columns: CourtColumnModel[];
}

/**
 * Turn the day-view payload into per-court positioned blocks.
 *
 * A multi-slot booking collapses into ONE "booked" block spanning its full
 * minutes; its continuation slots become "filler" cells underneath the block
 * (the block visually covers them, but the column stays structurally sound
 * even if booking data is inconsistent). Gaps between pricing windows stay
 * empty naturally — blocks are positioned absolutely by time.
 */
export function buildDayModel(dayView: DayViewResponse): DayModel {
  const columns = dayView.courts.map((court) => {
    const slots = dayView.slots
      .filter((s) => s.courtId === court.id)
      .sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));

    const blocks: PositionedBlock[] = [];
    let i = 0;
    while (i < slots.length) {
      const slot = slots[i];

      // Booked cell with an attached booking — merge the run belonging to it.
      if (slot.booking && slot.status === "Booked") {
        if (slot.booking.isStart) {
          let end = i;
          while (
            end + 1 < slots.length &&
            slots[end + 1].booking?.id === slot.booking.id
          ) {
            end++;
          }
          blocks.push({
            kind: "booked",
            startMinute: minutesOf(slot.startTime),
            minutes: minutesOf(slots[end].endTime) - minutesOf(slot.startTime),
            slot,
            booking: slot.booking,
          });
          for (let k = i + 1; k <= end; k++) {
            blocks.push({
              kind: "filler",
              startMinute: minutesOf(slots[k].startTime),
              minutes: minutesOf(slots[k].endTime) - minutesOf(slots[k].startTime),
              slot: slots[k],
            });
          }
          i = end + 1;
        } else {
          // Orphan continuation (start slot missing) — keep a filler so the
          // cell space is still visibly occupied.
          blocks.push({
            kind: "filler",
            startMinute: minutesOf(slot.startTime),
            minutes: minutesOf(slot.endTime) - minutesOf(slot.startTime),
            slot,
          });
          i++;
        }
        continue;
      }

      const block = {
        startMinute: minutesOf(slot.startTime),
        minutes: minutesOf(slot.endTime) - minutesOf(slot.startTime),
        slot,
      };
      if (slot.status === "Held") {
        blocks.push({ kind: "held", ...block });
      } else if (slot.status === "Blocked") {
        blocks.push({ kind: "blocked", ...block });
      } else if (slot.status === "Expired") {
        blocks.push({ kind: "expired", ...block });
      } else {
        blocks.push({ kind: "available", ...block });
      }
      i++;
    }

    return { court, blocks };
  });

  const startTimes = dayView.slots.map((s) => minutesOf(s.startTime));
  const endTimes = dayView.slots.map((s) => minutesOf(s.endTime));
  return {
    dayStartMinute: startTimes.length ? Math.min(...startTimes) : 6 * 60,
    dayEndMinute: endTimes.length ? Math.max(...endTimes) : 23 * 60,
    columns,
  };
}

/**
 * Max run of chained, Available, future slots starting at startIndex
 * (endTime[i] === startTime[i+1]). Used by Task 6's duration chips.
 * `isFuture` defaults to always-true when the caller has no clock yet.
 */
export function consecutiveRunSlots(
  slots: DayViewSlot[],
  startIndex: number,
  isFuture: (slot: DayViewSlot) => boolean = () => true,
): number {
  if (startIndex < 0 || startIndex >= slots.length) return 0;
  const first = slots[startIndex];
  if (first.status !== "Available" || !isFuture(first)) return 0;

  let count = 1;
  let i = startIndex;
  while (i + 1 < slots.length) {
    const next = slots[i + 1];
    if (
      next.status !== "Available" ||
      next.startTime !== slots[i].endTime ||
      !isFuture(next)
    ) {
      break;
    }
    count++;
    i++;
  }
  return count;
}

/** Hour marks for gutter labels: first whole hour ≥ start, up to end. */
export function gutterHours(dayStartMinute: number, dayEndMinute: number): number[] {
  const first = Math.ceil(dayStartMinute / 60) * 60;
  const hours: number[] = [];
  for (let m = first; m < dayEndMinute; m += 60) {
    hours.push(m);
  }
  return hours;
}
