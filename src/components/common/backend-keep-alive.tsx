"use client";

import { useEffect } from "react";

/**
 * Keeps the free-tier Render backend from spinning down mid-session.
 *
 * Render's free web service sleeps after ~15 minutes with no inbound traffic,
 * and the next request then pays a 30-50s cold start. This pings the backend's
 * public /health every few minutes so, WHILE the app is open in a browser, the
 * instance stays warm and no one in that session hits a cold start.
 *
 * Limits worth knowing:
 *  - It only runs while a tab has the app open. It cannot keep the backend
 *    awake round-the-clock on its own - for that, point an external uptime
 *    cron (UptimeRobot, cron-job.org, ...) at the same /health URL every 5 min.
 *  - It renders nothing and shows nothing in the UI, by design.
 *
 * /health lives at the ROOT of the API host (not under /api) and is anonymous,
 * so we derive it from the API base and hit it with a credential-free no-cors
 * request whose reply we never need to read.
 */
const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function BackendKeepAlive() {
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5215/api";

    let healthUrl: string;
    try {
      // "/health" is root-relative, so this drops the "/api" path and yields
      // e.g. https://agrierp-api.onrender.com/health.
      healthUrl = new URL("/health", apiBase).href;
    } catch {
      return; // A malformed base URL should never crash the app.
    }

    const ping = () => {
      // no-cors: we only need the request to REACH the server (which is what
      // Render counts as traffic); we never read the response. A sleeping or
      // offline backend just rejects the promise, which we ignore.
      fetch(healthUrl, { mode: "no-cors", cache: "no-store" }).catch(() => {});
    };

    ping(); // once now, to start warming a possibly-sleeping instance
    const timer = window.setInterval(ping, PING_INTERVAL_MS);

    // Coming back to the tab is exactly when a cold start would bite, so warm
    // it the moment the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
