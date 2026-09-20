"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Menu, ShoppingCart, Truck } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { InstallAppButton } from "@/components/common/install-app-button";
import { SidebarNav } from "./sidebar";
import { cn } from "@/lib/utils";
import { useT } from "@/features/i18n/provider";

/**
 * Phone-only bottom navigation bar (like Indus 360's). Four quick shortcuts to
 * the screens a counter operator hits all day + a Menu button that opens the
 * full sidebar tree in a drawer. Hidden from `lg` up (the desktop rail covers
 * that) and never printed. Fixed to the bottom with iPhone safe-area padding;
 * the app `<main>` carries matching bottom padding so nothing hides behind it.
 */
type QuickItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export function BottomNav() {
  const pathname = usePathname();
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  const items: QuickItem[] = [
    { href: "/dashboard", label: t("nav.home", "Home"), icon: LayoutDashboard },
    { href: "/sales", label: t("nav.sales", "Sales"), icon: ShoppingCart },
    { href: "/purchases", label: t("nav.purchases", "Purchase"), icon: Truck },
    { href: "/stock", label: t("nav.stock", "Stock"), icon: Boxes },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
      active ? "text-white" : "text-sidebar-foreground/70",
    );

  return (
    <>
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-sidebar-raised/60 bg-sidebar text-sidebar-foreground lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={t("nav.bottomNav", "Primary")}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={tabClass(active)}>
              <span className={cn("flex size-8 items-center justify-center rounded-lg", active && "bg-sidebar-raised")}>
                <Icon className="size-5" />
              </span>
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          );
        })}

        <button type="button" onClick={() => setMenuOpen(true)} className={tabClass(false)}>
          <span className="flex size-8 items-center justify-center rounded-lg">
            <Menu className="size-5" />
          </span>
          <span>{t("nav.menu", "Menu")}</span>
        </button>
      </nav>

      {/* Full menu — the same sidebar tree, in a drawer opened by the Menu tab. */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[284px] max-w-[85vw] bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">{t("nav.menu", "Menu")}</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav variant="drawer" onNavigate={() => setMenuOpen(false)} />
            </div>
            {/* "Install App" — only renders when the app is actually installable. */}
            <div className="shrink-0 px-3 pb-4 pt-1">
              <InstallAppButton onDone={() => setMenuOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
