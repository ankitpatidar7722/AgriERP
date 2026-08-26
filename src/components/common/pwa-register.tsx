"use client";

import { useEffect } from "react";

/**
 * Registers the service worker so the app is installable (PWA). Production only —
 * in `next dev` the SW is never registered, so the dev experience is unchanged.
 * Renders nothing.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration is best-effort; the app works fine without it */
    });
  }, []);
  return null;
}
