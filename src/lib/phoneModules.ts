"use client";

import { useMemo } from "react";
import { createElement, type ComponentType, type CSSProperties } from "react";
import {
  BarChart3, Boxes, Building2, LayoutDashboard, Package, Receipt, Settings, ShoppingCart, Truck, Upload, Users, Wallet,
} from "lucide-react";
import { ModuleIcon } from "@/components/layout/module-icon";
import { useSidebarModules } from "@/features/navigation/hooks";
import { useAuth } from "@/features/auth/auth-context";
import type { AppIconTone } from "@/components/phone/AppIcon";

/**
 * Phone navigation model (Modules sheet, phone Home, top bar), built from the SAME menu the sidebar reads
 * (GET /modules/sidebar via useSidebarModules), so what a user can open on the phone is exactly what the
 * sidebar offers them. Ported from Indus 360 / IndusFlexoERP's module grid.
 */

/** Any icon the phone tiles can draw: a Lucide component or a ModuleMaster icon resolved by name. */
export type PhoneIcon = ComponentType<{ style?: CSSProperties; strokeWidth?: number }>;

export type PhoneLeaf = { route: string; label: string; group: string; icon: PhoneIcon; tone: AppIconTone };
export type PhoneGroup = { name: string; icon: PhoneIcon; tone: AppIconTone; leaves: PhoneLeaf[] };

/** One colour per business area, the same on the Home and in the Modules sheet. */
export function toneFor(groupName: string): AppIconTone {
  const n = groupName.toLowerCase();
  const has = (...w: string[]) => w.some((x) => n.includes(x));
  if (has("dashboard", "overview")) return "amber";
  if (has("sale", "billing", "invoice", "trading")) return "green";
  if (has("purchase", "supplier", "grn")) return "blue";
  if (has("stock", "inventory", "warehouse")) return "teal";
  if (has("account", "payment", "ledger", "expense")) return "indigo";
  if (has("report", "register", "compliance")) return "orange";
  if (has("master", "item", "product")) return "violet";
  if (has("import", "upload")) return "green";
  if (has("setting", "admin", "user", "shop")) return "grey";
  return "blue";
}

/** Group icon by name, so a new group still gets a sensible glyph. */
function groupIconFor(groupName: string): PhoneIcon {
  const n = groupName.toLowerCase();
  if (n.includes("dashboard")) return LayoutDashboard;
  if (n.includes("sale") || n.includes("trading")) return ShoppingCart;
  if (n.includes("purchase")) return Truck;
  if (n.includes("stock") || n.includes("inventory")) return Boxes;
  if (n.includes("account") || n.includes("payment")) return Wallet;
  if (n.includes("report")) return BarChart3;
  if (n.includes("item") || n.includes("master")) return Package;
  if (n.includes("customer")) return Users;
  if (n.includes("company") || n.includes("shop")) return Building2;
  if (n.includes("import")) return Upload;
  if (n.includes("bill") || n.includes("invoice")) return Receipt;
  if (n.includes("setting")) return Settings;
  return LayoutDashboard;
}

/** Screens inside a group get DIFFERENT colours; a destructive screen is always red. */
const LEAF_PALETTE: AppIconTone[] = ["blue", "teal", "orange", "violet", "green", "amber", "indigo", "red"];
function leafTone(label: string, groupTone: AppIconTone, index: number): AppIconTone {
  if (/delete|remove/i.test(label)) return "red";
  const start = Math.max(0, LEAF_PALETTE.indexOf(groupTone));
  return LEAF_PALETTE[(start + index) % LEAF_PALETTE.length];
}

// One stable component per ModuleMaster icon name (a new component per render would remount the glyph).
const namedIcons = new Map<string, PhoneIcon>();
function iconByName(name: string | null | undefined, fallback: PhoneIcon): PhoneIcon {
  if (!name) return fallback;
  let icon = namedIcons.get(name);
  if (!icon) {
    const Named: PhoneIcon = ({ style, strokeWidth }) => createElement(ModuleIcon, { name, style, strokeWidth });
    Named.displayName = `ModuleIcon(${name})`;
    namedIcons.set(name, Named);
    icon = Named;
  }
  return icon;
}

/** The user's menu as phone groups. null while the menu is still loading. */
export function usePhoneGroups(): PhoneGroup[] | null {
  const { data, isLoading } = useSidebarModules();
  return useMemo(() => {
    if (isLoading && !data) return null;
    return (data ?? [])
      .map((section) => {
        const name = section.moduleHeadDisplayName || section.moduleHeadName;
        const tone = toneFor(name);
        const icon = groupIconFor(name);
        return {
          name,
          icon,
          tone,
          leaves: section.modules.map((m, i) => ({
            route: m.moduleName,
            label: m.moduleDisplayName,
            group: name,
            icon: iconByName(m.iconName, icon),
            tone: leafTone(m.moduleDisplayName, tone, i),
          })),
        };
      })
      .filter((g) => g.leaves.length > 0);
  }, [data, isLoading]);
}

/** The most specific menu screen that owns `pathname` (longest route prefix). */
export function screenFor(groups: PhoneGroup[] | null, pathname: string): PhoneLeaf | null {
  let best: PhoneLeaf | null = null;
  for (const g of groups ?? []) for (const l of g.leaves) {
    if (!(pathname === l.route || pathname.startsWith(l.route + "/"))) continue;
    if (!best || l.route.length > best.route.length) best = l;
  }
  return best;
}

const isDashboard = (l: PhoneLeaf) => /dashboard/i.test(`${l.route} ${l.label}`);

/** Home "Quick actions": the counter's everyday screens first (in this order), then fill from the menu. */
const QUICK_PREFERRED = ["/sales/new", "/sales", "/purchases/new", "/purchases", "/stock", "/items", "/customers", "/accounts/customer-payment"];

export const MAX_QUICK_ACTIONS = 8;
const quickKey = (userId?: number | null) => `agrierp.quickActions.${userId ?? "anon"}`;

/** The user's own Quick actions (routes, in their order) — null when they never customised them. */
export function loadQuickActions(userId?: number | null): string[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(quickKey(userId)) || "null");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, MAX_QUICK_ACTIONS) : null;
  } catch { return null; }
}
/** Save (or, with null, reset to the automatic default) the user's Quick actions on this device. */
export function saveQuickActions(userId: number | null | undefined, routes: string[] | null) {
  try {
    if (routes) localStorage.setItem(quickKey(userId), JSON.stringify(routes.slice(0, MAX_QUICK_ACTIONS)));
    else localStorage.removeItem(quickKey(userId));
  } catch { /* storage blocked — the choice lasts this visit */ }
}

/** Everything the Quick actions can hold: the user's screens, minus the dashboards. */
export const quickActionCandidates = (groups: PhoneGroup[]) => groups.flatMap((g) => g.leaves).filter((l) => !isDashboard(l));

export function pickQuickActions(groups: PhoneGroup[], max = MAX_QUICK_ACTIONS, saved?: string[] | null): PhoneLeaf[] {
  const all = quickActionCandidates(groups);
  const byRoute = new Map(all.map((l) => [l.route, l]));
  if (saved) return saved.map((r) => byRoute.get(r)).filter((l): l is PhoneLeaf => !!l).slice(0, max);
  const out: PhoneLeaf[] = [];
  for (const r of QUICK_PREFERRED) {
    const l = byRoute.get(r);
    if (l) out.push(l);
  }
  for (const l of all) {
    if (out.length >= max) break;
    if (!out.includes(l)) out.push(l);
  }
  return out.slice(0, max);
}

/** Home "Dashboards": every dashboard screen the user can open. */
export const pickDashboards = (groups: PhoneGroup[]) => groups.flatMap((g) => g.leaves).filter(isDashboard);

/** Current user id for per-user phone preferences. */
export function usePhoneUserId(): number | null {
  return useAuth().user?.userId ?? null;
}
