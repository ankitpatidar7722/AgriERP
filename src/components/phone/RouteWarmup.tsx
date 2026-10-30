"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePhoneGroups } from "@/lib/phoneModules";

/**
 * Makes a tap on any module open at once. The Modules sheet, Home quick actions and bottom bar navigate with
 * router.push, which (unlike <Link>) does not prefetch — so the first open of each screen waited for its code.
 *
 *   production  prefetch every screen in the user's menu once the browser is idle (code only; data still
 *               loads fresh on open).
 *   development `next dev` compiles a route the first time it is requested (5–7 s per screen here), so fetch
 *               each menu route once, one at a time, in the background — by the time the user taps a module
 *               it is already compiled.
 *
 * Runs once per page load per user (module flag) and never blocks anything. Not cancelled on unmount on
 * purpose: the app layout that mounts it lives for the whole session, and React's dev double-effect would
 * otherwise cancel the first run while the flag stops the second.
 */
let warmedFor: number | null = null;

export default function RouteWarmup({ userId }: { userId: number | null }) {
  const router = useRouter();
  const groups = usePhoneGroups();

  useEffect(() => {
    if (!groups || !userId || warmedFor === userId) return;
    warmedFor = userId;
    const routes = Array.from(new Set(["/home", "/settings", ...groups.flatMap((g) => g.leaves.map((l) => l.route))]));
    const whenIdle = (cb: () => void) =>
      "requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 3000 }) : globalThis.setTimeout(cb, 800);

    if (process.env.NODE_ENV === "production") {
      whenIdle(() => routes.forEach((r) => router.prefetch(r)));
    } else {
      whenIdle(async () => {
        for (const r of routes) {
          await fetch(r, { credentials: "same-origin", cache: "no-store" }).catch(() => undefined);
        }
      });
    }
  }, [groups, userId, router]);

  return null;
}
