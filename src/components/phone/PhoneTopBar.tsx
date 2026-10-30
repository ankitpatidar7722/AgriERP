"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, Search, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboard } from "@/features/dashboard/hooks";
import { Permissions } from "@/lib/permissions";
import { screenFor, usePhoneGroups, type PhoneIcon } from "@/lib/phoneModules";
import ProfileCard from "@/components/phone/ProfileCard";

/** Fired by the top bar's Search; BottomNav opens the Modules sheet with its search focused. */
export const OPEN_MODULE_SEARCH_EVENT = "agrierp:open-module-search";

/**
 * Phone / tablet top bar (IndusFlexoERP style) — replaces the navy desktop header below lg:
 *
 *   [icon] Sales                              🔍   🔔³   (avatar)
 *
 * Left: the current screen's icon + name (same menu as the sidebar). Right, only three things: Search
 * (modules & screens), stock alerts (low / out of stock / expired → Stock) and the profile card, which
 * also carries what the desktop header had: theme, language, change password, log out.
 */
export default function PhoneTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, can } = useAuth();
  const groups = usePhoneGroups();
  const [menuOpen, setMenuOpen] = useState(false);

  // Stock alerts come from the dashboard's single call (already cached when the Home showed it).
  const canDashboard = can(Permissions.Dashboard.View);
  const { data: dash } = useDashboard(undefined, undefined, canDashboard);
  const a = dash?.alerts;
  const alerts = a ? a.lowStockCount + a.outOfStockCount + a.expiredBatchCount + a.nearExpiryBatchCount : 0;

  const screen: { label: string; icon: PhoneIcon } = (() => {
    if (pathname === "/home") return { label: "Home", icon: Home };
    if (pathname.startsWith("/settings")) return { label: "Settings", icon: SettingsIcon };
    const leaf = screenFor(groups, pathname);
    return leaf ? { label: leaf.label, icon: leaf.icon } : { label: "AgriERP", icon: Home };
  })();
  const ScreenIcon = screen.icon;

  const initials = (user?.fullName || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

  return (
    <>
      <header className="phone-topbar no-print">
        <ScreenIcon style={{ width: 22, height: 22, flexShrink: 0 }} strokeWidth={2} />
        <h1 className="phone-topbar-title">{screen.label}</h1>

        <button type="button" className="phone-topbar-btn" aria-label="Search modules and screens"
          onClick={() => window.dispatchEvent(new Event(OPEN_MODULE_SEARCH_EVENT))}>
          <Search size={23} strokeWidth={2} />
        </button>

        {canDashboard && (
          <button type="button" className="phone-topbar-btn" aria-label={alerts ? `Stock alerts, ${alerts}` : "Stock alerts"}
            onClick={() => router.push("/stock")}>
            <Bell size={23} strokeWidth={2} />
            {alerts > 0 && <span className="phone-topbar-badge">{alerts > 99 ? "99+" : alerts}</span>}
          </button>
        )}

        <button type="button" className="phone-topbar-avatar" aria-label="Profile" aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{initials}</span>
        </button>
      </header>
      <ProfileCard open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
