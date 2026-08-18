"use client";

/**
 * Calendar cell variants — one component per slot state.
 *
 * Positioning: every cell is absolutely placed by its court column using
 * minutes × PX_PER_MINUTE; this file owns the look, booking-calendar.tsx
 * owns the geometry.
 *
 * Colorblind-safe rule (Task 5 spec): status is never color alone —
 * booked = solid block with text, held = STRIPED + countdown label,
 * blocked = HATCHED + lock icon + label, available = price text.
 */

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayViewSlot } from "@/lib/types/booking";
import { BookingStatusBadge } from "./booking-status-badge";
import { PaymentChip } from "./payment-chip";
import { HeldCountdown } from "./held-countdown";
import {
  PX_PER_MINUTE,
  formatTaka,
  type PositionedBlock,
} from "./grid-utils";

/** Shared positional style for a block within a court column. */
function blockStyle(block: PositionedBlock, dayStartMinute: number) {
  return {
    top: (block.startMinute - dayStartMinute) * PX_PER_MINUTE,
    height: block.minutes * PX_PER_MINUTE,
  };
}

// ---------------------------------------------------------------------------
// Available — the primary action surface
// ---------------------------------------------------------------------------

export function AvailableCell({
  block,
  dayStartMinute,
  courtName,
  past,
  onBook,
}: {
  block: PositionedBlock;
  dayStartMinute: number;
  courtName: string;
  past: boolean;
  onBook: (slot: DayViewSlot) => void;
}) {
  const slot = block.slot;
  return (
    <button
      type="button"
      disabled={past}
      style={blockStyle(block, dayStartMinute)}
      onClick={() => onBook(slot)}
      aria-label={`Book ${courtName} ${slot.startTime} to ${slot.endTime}, ${formatTaka(slot.price)}`}
      className={cn(
        "group absolute inset-x-1 z-10 overflow-hidden rounded-md border text-left transition-colors",
        past
          ? "cursor-not-allowed border-transparent bg-muted/30 opacity-50"
          : "border-green-200/70 bg-green-50/70 hover:border-teal-500 hover:ring-2 hover:ring-teal-500/40 dark:border-green-900/60 dark:bg-green-950/30 dark:hover:border-teal-400",
      )}
    >
      <span className="flex h-full flex-col justify-between p-1.5">
        <span className="text-[11px] font-medium leading-none text-green-800/80 dark:text-green-300/80">
          {slot.startTime}
        </span>
        <span className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold leading-none text-green-900 dark:text-green-200">
            {formatTaka(slot.price)}
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-wide leading-none text-teal-700 group-hover:inline dark:text-teal-300">
            Book
          </span>
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Booked — ONE merged block per booking (customer + status + payment)
// ---------------------------------------------------------------------------

export function BookedCell({
  block,
  dayStartMinute,
  courtName,
  onOpen,
}: {
  block: PositionedBlock;
  dayStartMinute: number;
  courtName: string;
  onOpen: (bookingId: string) => void;
}) {
  const booking = block.booking;
  if (!booking) return null;
  const slot = block.slot;

  return (
    <button
      type="button"
      style={blockStyle(block, dayStartMinute)}
      onClick={() => onOpen(booking.id)}
      aria-label={`Booking for ${booking.customerName}, ${courtName} ${slot.startTime} to ${slot.endTime}, ${booking.status}`}
      className="absolute inset-x-1 z-20 overflow-hidden rounded-md border border-blue-700 bg-blue-600/95 text-left text-white shadow-sm transition-colors hover:bg-blue-600 dark:border-blue-600 dark:bg-blue-700/95 dark:hover:bg-blue-700"
    >
      <span className="flex h-full flex-col gap-1 p-1.5">
        <span className="truncate text-xs font-semibold leading-none">
          {booking.customerName}
        </span>
        {block.minutes >= 45 && (
          <span className="flex flex-wrap items-center gap-1">
            <BookingStatusBadge status={booking.status} mini />
            <PaymentChip status={booking.paymentStatus} due={booking.due} mini />
          </span>
        )}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Held — amber striped + countdown (never clickable)
// ---------------------------------------------------------------------------

/** Amber stripes readable in both themes (semi-transparent over bg tint). */
const HELD_STRIPE =
  "repeating-linear-gradient(45deg, rgba(245,158,11,0.22) 0px, rgba(245,158,11,0.22) 6px, rgba(245,158,11,0.08) 6px, rgba(245,158,11,0.08) 12px)";

export function HeldCell({
  block,
  dayStartMinute,
  onExpire,
}: {
  block: PositionedBlock;
  dayStartMinute: number;
  onExpire?: () => void;
}) {
  const slot = block.slot;
  return (
    <div
      style={{ ...blockStyle(block, dayStartMinute), background: HELD_STRIPE }}
      className="absolute inset-x-1 z-10 overflow-hidden rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
      title="Slot is on hold during checkout"
    >
      <span className="flex h-full items-center justify-between gap-1 p-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
          Hold
        </span>
        <HeldCountdown heldUntil={slot.heldUntil} onExpire={onExpire} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocked — hatched + lock (unblock stays on the Slots page)
// ---------------------------------------------------------------------------

const BLOCKED_HATCH =
  "repeating-linear-gradient(135deg, rgba(239,68,68,0.16) 0px, rgba(239,68,68,0.16) 6px, transparent 6px, transparent 12px)";

export function BlockedCell({
  block,
  dayStartMinute,
}: {
  block: PositionedBlock;
  dayStartMinute: number;
}) {
  return (
    <div
      style={{ ...blockStyle(block, dayStartMinute), background: BLOCKED_HATCH }}
      className="absolute inset-x-1 z-10 overflow-hidden rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      title="Slot is blocked"
    >
      <span className="flex h-full items-center gap-1.5 p-1.5 text-red-700 dark:text-red-400">
        <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          Blocked
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expired — quiet gray, not bookable from the grid
// ---------------------------------------------------------------------------

export function ExpiredCell({
  block,
  dayStartMinute,
}: {
  block: PositionedBlock;
  dayStartMinute: number;
}) {
  return (
    <div
      style={blockStyle(block, dayStartMinute)}
      className="absolute inset-x-1 z-10 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
      title="Slot expired"
    >
      <span className="flex h-full items-center p-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Expired
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filler — continuation slot underneath a merged booked block (covered)
// ---------------------------------------------------------------------------

export function FillerCell({
  block,
  dayStartMinute,
}: {
  block: PositionedBlock;
  dayStartMinute: number;
}) {
  return (
    <div
      style={blockStyle(block, dayStartMinute)}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-1 z-10 rounded-md bg-blue-50/60 dark:bg-blue-950/40"
    />
  );
}
