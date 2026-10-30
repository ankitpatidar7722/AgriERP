"use client";

import { useSyncExternalStore } from "react";

/**
 * Phone-width viewport (≤768px — the same line indas-ui's useDevice and the phone CSS use).
 * null until mounted, so a screen can wait instead of flashing the desktop layout on a phone.
 */
const QUERY = "(max-width: 768px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useIsPhone(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  );
}
