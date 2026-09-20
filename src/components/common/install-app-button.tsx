"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInstallPrompt, isInstalled, promptInstall, subscribeInstall } from "@/lib/pwa-install";

/**
 * "Install App" button (like Indus 360's). Renders nothing unless the app is
 * actually installable:
 *  - Chrome / Edge / Android → real native install prompt (beforeinstallprompt).
 *  - iOS Safari (no such event) → a short "Share → Add to Home Screen" hint.
 *  - Already installed / not installable → renders nothing.
 *
 * Styled for the navy mobile menu drawer (white text on a translucent row).
 * NOTE: the browser only offers install over HTTPS/localhost WITH a registered
 * service worker — and this app registers the SW in PRODUCTION only, so the
 * button appears on the deployed / `next start` build, not on `next dev`.
 */
export function InstallAppButton({ className, onDone }: { className?: string; onDone?: () => void }) {
  const [, force] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [installedNow, setInstalledNow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isInstalled()) setInstalledNow(true);
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const iOS = /iphone|ipad|ipod/i.test(ua);
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    // iOS can only "install" via Safari's Share sheet; show the hint only if not already installed.
    setIsIOS(iOS && !standalone);
    return subscribeInstall(() => {
      force((n) => n + 1);
      if (isInstalled()) setInstalledNow(true);
    });
  }, []);

  const onInstall = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      setInstalledNow(true);
      onDone?.();
    }
  }, [onDone]);

  if (!mounted) return null; // avoid SSR/first-render hydration mismatch — reveal only after mount
  if (installedNow) return null;

  const canPrompt = !!getInstallPrompt();
  if (!canPrompt && !isIOS) return null; // not installable on this browser (e.g. desktop Firefox)

  const btnClass = cn(
    "flex w-full items-center gap-2.5 rounded-lg bg-white/15 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/25",
    className,
  );

  // iOS Safari: no programmatic prompt — guide the user through the Share sheet.
  if (!canPrompt && isIOS) {
    return (
      <div className="w-full">
        <button type="button" onClick={() => setShowIOSHelp((v) => !v)} className={btnClass} aria-expanded={showIOSHelp}>
          <Download className="size-4" /> Install App
        </button>
        {showIOSHelp && (
          <div className="mt-1.5 rounded-lg bg-white/10 px-3 py-2.5 text-xs leading-relaxed text-white/90">
            On iPhone/iPad: tap the <b>Share</b> button (⬆️) below, then choose{" "}
            <b>&ldquo;Add to Home Screen&rdquo;</b> → <b>Add</b>. The app icon appears on your home screen.
          </div>
        )}
      </div>
    );
  }

  // Chrome / Edge / Android — real install prompt.
  return (
    <button type="button" onClick={onInstall} className={btnClass}>
      <Download className="size-4" /> Install App
    </button>
  );
}
