"use client";

/**
 * Debounce a fast-changing value (e.g. a filter text input).
 *
 * setState only fires inside the timer callback — never synchronously in the
 * effect body (react-hooks/set-state-in-effect lint rule).
 */

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
