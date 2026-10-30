"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, IndianRupee, Moon, ReceiptText, Sun, Sunrise, Sunset, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboard } from "@/features/dashboard/hooks";
import { Permissions } from "@/lib/permissions";
import { formatCurrencyCompact } from "@/lib/format";
import { AppIcon, type AppIconTone } from "@/components/phone/AppIcon";
import TodayCard from "@/components/phone/TodayCard";
import QuickActionsEditor from "@/components/phone/QuickActionsEditor";
import {
  loadQuickActions, pickDashboards, pickQuickActions, saveQuickActions, usePhoneGroups,
} from "@/lib/phoneModules";

/**
 * Phone Home (ported from Indus 360 / IndusFlexoERP's HomePhone) — an app home screen, shown at /home on
 * phones (the bottom bar's Home tab, and where /dashboard lands below 768px). Desktop never mounts it.
 *   hero        time-of-day greeting + the user's name, Today widget (clock + weather) beside it
 *   status      today's sales, today's purchase, stock alerts — three compact glass tiles
 *   quick       4-up tonal app icons for the everyday screens the user can open (Edit to choose)
 *   dashboards  a sideways row of dashboard cards
 * Lists come from the same menu as the sidebar (lib/phoneModules), so permissions are respected.
 */
export default function HomePhone() {
  const router = useRouter();
  const { user, can } = useAuth();
  const groups = usePhoneGroups();
  const canDashboard = can(Permissions.Dashboard.View);
  const { data: dash } = useDashboard(undefined, undefined, canDashboard);
  const [savedQuick, setSavedQuick] = useState<string[] | null>(() => loadQuickActions(user?.userId));
  const [editingQuick, setEditingQuick] = useState(false);

  // Client-only screen (mounted after the viewport is measured), so reading the clock here is safe.
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  const DayGlyph: LucideIcon = h < 12 ? Sunrise : h < 17 ? Sun : h < 20 ? Sunset : Moon;
  const dayTone = h < 17 ? "rgb(var(--color-warning))" : h < 20 ? "rgb(249 115 22)" : "rgb(var(--color-info))";

  const quick = groups ? pickQuickActions(groups, undefined, savedQuick) : [];
  const dashboards = groups ? pickDashboards(groups) : [];
  const hl = dash?.headline;
  const al = dash?.alerts;
  const alertCount = al ? al.lowStockCount + al.outOfStockCount + al.expiredBatchCount + al.nearExpiryBatchCount : 0;

  return (
    <div className="phone-home">
      {/* Neutral grey backdrop with soft light/shade patches — gives the frosted cards depth. */}
      <div aria-hidden className="phone-home-backdrop" />

      <div className="phone-home-inner">
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 4px" }}>
          <h1 style={{ minWidth: 0, flex: 1, margin: 0 }}>
            <span className="phone-greet-eyebrow">
              <DayGlyph style={{ width: 17, height: 17, flexShrink: 0, color: dayTone }} strokeWidth={2.2} aria-hidden />
              <span className="today-trunc">{greeting}</span>
            </span>
            <span className="phone-greet-name">{user?.fullName || "User"}</span>
          </h1>
          <TodayCard />
        </header>

        {canDashboard && (
          <div className="phone-status-row">
            <StatusTile icon={IndianRupee} tone="green" value={hl ? formatCurrencyCompact(hl.todaySales) : "—"}
              label={hl ? `Sales · ${hl.todayInvoiceCount} bills` : "Today's sales"} onClick={() => router.push("/sales")} />
            <StatusTile icon={Truck} tone="blue" value={hl ? formatCurrencyCompact(hl.todayPurchase) : "—"}
              label="Today's purchase" onClick={() => router.push("/purchases")} />
            <StatusTile icon={AlertTriangle} tone="red" value={al ? String(alertCount) : "—"}
              label="Stock alerts" onClick={() => router.push("/stock")} />
          </div>
        )}

        <section>
          <SectionTitle action={groups && <button type="button" className="phone-section-action" onClick={() => setEditingQuick(true)}>Edit</button>}>
            Quick actions
          </SectionTitle>
          <div className="m-glass-card phone-quick-grid">
            {groups === null
              ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="phone-quick-item" aria-hidden>
                  <div className="m-skel" style={{ width: 52, height: 52, borderRadius: 16 }} />
                  <div className="m-skel" style={{ width: "68%", height: 10, borderRadius: 5, marginTop: 2 }} />
                </div>
              ))
              : quick.map((a) => (
                <Link key={a.route} href={a.route} className="phone-quick-item">
                  <AppIcon icon={a.icon} tone={a.tone} />
                  <span className="phone-quick-label">{a.label}</span>
                </Link>
              ))}
          </div>
          {groups !== null && quick.length === 0 && <p className="phone-sheet-empty">No modules assigned to you yet.</p>}
        </section>

        {editingQuick && groups && (
          <QuickActionsEditor groups={groups} initial={quick.map((q) => q.route)}
            onSave={(routes) => { saveQuickActions(user?.userId, routes); setSavedQuick(routes); }}
            onReset={() => { saveQuickActions(user?.userId, null); setSavedQuick(null); }}
            onClose={() => setEditingQuick(false)} />
        )}

        {dashboards.length > 0 && (
          <section>
            <SectionTitle>Dashboards</SectionTitle>
            <div className="phone-dash-row">
              {dashboards.map((d) => (
                <Link key={d.route} href={d.route} className="m-glass-card phone-dash-card">
                  <AppIcon icon={d.icon} tone={d.tone} size={38} />
                  <span>
                    <span className="phone-dash-title">{d.label}</span>
                    <span className="phone-dash-sub">Dashboard</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent bills — the counter's last few invoices, one tap to open. */}
        {dash && dash.recentBills.length > 0 && (
          <section>
            <SectionTitle>Recent bills</SectionTitle>
            <div className="m-glass-card" style={{ padding: "4px 0" }}>
              {dash.recentBills.slice(0, 5).map((b) => (
                <Link key={b.saleId} href={`/sales/${b.saleId}`} className="phone-leaf-row">
                  <AppIcon icon={ReceiptText} tone={b.balanceAmount > 0 ? "orange" : "green"} size={36} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="phone-leaf-title">{b.customerName || "Walk-in"}</span>
                    <span className="phone-leaf-sub">{b.invoiceNumber}{b.balanceAmount > 0 ? ` · Due ${formatCurrencyCompact(b.balanceAmount)}` : ""}</span>
                  </span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatCurrencyCompact(b.grandTotal)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <h2 className="phone-section-title">{children}</h2>
      {action}
    </div>
  );
}

function StatusTile({ icon, tone, value, label, onClick }: { icon: LucideIcon; tone: AppIconTone; value: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="m-glass-card phone-status-tile">
      <span style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
        <AppIcon icon={icon} tone={tone} size={34} />
        <span className="today-ink" style={{ fontSize: 16, lineHeight: "24px", fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {value}
        </span>
      </span>
      <span className="phone-status-label">{label}</span>
    </button>
  );
}
