"use client";

import { useEffect, useState } from "react";

/**
 * Delays a value so a search box does not fire one request per keystroke.
 *
 * 350ms is roughly the gap between characters when someone is typing a word
 * rather than pausing to think - short enough to feel immediate, long enough
 * that "imidacloprid" is one request instead of twelve.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
