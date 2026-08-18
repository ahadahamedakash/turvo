"use client";

/**
 * mm:ss countdown for a Held slot's `heldUntil` deadline.
 *
 * The clock is only touched inside the interval effect (never during
 * render). On expiry the countdown stops and fires `onExpire` — the parent
 * invalidates the day-view query so the slot re-renders as expired.
 * `onExpire` is read through a ref so callers may pass an inline callback
 * without restarting the interval.
 */

import { useEffect, useRef, useState } from "react";

export function HeldCountdown({
  heldUntil,
  onExpire,
}: {
  heldUntil?: string | null;
  onExpire?: () => void;
}) {
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!heldUntil) return;

    const deadlineMs = Date.parse(heldUntil);
    const computeRemaining = () =>
      Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

    const tick = () => {
      const remaining = computeRemaining();
      setRemainingSec(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onExpireRef.current?.();
      }
    };

    // setState only inside timer callbacks (effect-body setState trips the
    // react-hooks compiler lint); the 0ms timeout paints the first value.
    const timer = setInterval(tick, 1000);
    const firstPaint = setTimeout(tick, 0);

    return () => {
      clearInterval(timer);
      clearTimeout(firstPaint);
    };
  }, [heldUntil]);

  const mm =
    remainingSec === null
      ? "--"
      : String(Math.floor(remainingSec / 60)).padStart(2, "0");
  const ss =
    remainingSec === null
      ? "--"
      : String(remainingSec % 60).padStart(2, "0");

  return (
    <span className="font-mono text-[10px] font-semibold tabular-nums" aria-label="Hold expires in">
      {mm}:{ss}
    </span>
  );
}
