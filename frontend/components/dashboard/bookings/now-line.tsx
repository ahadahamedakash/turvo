"use client";

/**
 * 2px teal "now" indicator across the calendar grid (today only).
 * `topPx` is precomputed by the parent from the interval-driven clock —
 * this component stays purely presentational.
 */

export function NowLine({ topPx }: { topPx: number }) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30"
      style={{ top: topPx }}
      aria-hidden="true"
    >
      <div className="relative h-0.5 w-full bg-teal-500">
        <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-teal-500" />
      </div>
    </div>
  );
}
