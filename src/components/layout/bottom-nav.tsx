"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, ShoppingCart, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavIcon } from "@/components/phone/NavIcons";
import ModulesSheet from "@/components/phone/ModulesSheet";
import { useKeyboardOpen } from "@/components/phone/useKeyboardOpen";
import { OPEN_MODULE_SEARCH_EVENT } from "@/components/phone/PhoneTopBar";
import { useLeaveForNavigation } from "@/lib/back-stack";
import { useT } from "@/features/i18n/provider";

/**
 * Phone / tablet bottom navigation (IndusFlexoERP / Indus 360 style): a floating glass capsule with the
 * four screens a counter operator hits all day + a "Modules" button that opens the Modules bottom sheet
 * (the whole menu as an app drawer). The selected tab gets a brand-colour pill that slides between tabs.
 * Hidden from lg up (.bottom-nav CSS) and while the phone keyboard is open; never printed.
 */
type Tab = { href: string; label: string; icon?: LucideIcon; home?: boolean };

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const leave = useLeaveForNavigation();
  const t = useT();
  const reduceMotion = !!useReducedMotion();
  const [modulesOpen, setModulesOpen] = useState(false);
  const [searchFirst, setSearchFirst] = useState(false);   // opened from the top bar's Search
  const keyboardOpen = useKeyboardOpen();

  // Top bar Search → the Modules sheet with its search field focused (finds any module / screen).
  useEffect(() => {
    const open = () => { setSearchFirst(true); setModulesOpen(true); };
    window.addEventListener(OPEN_MODULE_SEARCH_EVENT, open);
    return () => window.removeEventListener(OPEN_MODULE_SEARCH_EVENT, open);
  }, []);

  const tabs: Tab[] = [
    { href: "/home", label: t("nav.home", "Home"), home: true },
    { href: "/sales", label: t("nav.sales", "Sales"), icon: ShoppingCart },
    { href: "/purchases", label: t("nav.purchases", "Purchase"), icon: Truck },
    { href: "/stock", label: t("nav.stock", "Stock"), icon: Boxes },
  ];
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav className="bottom-nav no-print" aria-label={t("nav.bottomNav", "Primary")}
        data-keyboard={keyboardOpen || undefined} aria-hidden={keyboardOpen || undefined}>
        <div className="bottom-nav-capsule m-glass-bar">
          {tabs.map((tab) => {
            const on = !modulesOpen && isActive(tab.href);
            const Icon = tab.icon;
            return (
              <motion.button key={tab.href} type="button" className="bottom-nav-item" data-active={on}
                aria-current={on ? "page" : undefined} whileTap={{ scale: 0.92 }}
                onClick={() => { if (modulesOpen) leave(); setModulesOpen(false); router.push(tab.href); }}>
                <span className="bottom-nav-icon">
                  {on && <ActivePill reduceMotion={reduceMotion} />}
                  <TabGlyph active={on} reduceMotion={reduceMotion}>
                    {tab.home
                      ? <NavIcon name="home" filled={on} width={24} height={24} />
                      : Icon && <Icon size={22} strokeWidth={on ? 2.25 : 1.8} />}
                  </TabGlyph>
                </span>
                <span className="bottom-nav-label">{tab.label}</span>
              </motion.button>
            );
          })}

          <motion.button type="button" className="bottom-nav-item" data-active={modulesOpen}
            aria-expanded={modulesOpen} aria-label="Open modules" whileTap={{ scale: 0.92 }}
            onClick={() => { setSearchFirst(false); setModulesOpen((o) => !o); }}>
            <span className="bottom-nav-icon">
              {modulesOpen && <ActivePill reduceMotion={reduceMotion} />}
              <TabGlyph active={modulesOpen} reduceMotion={reduceMotion}>
                <NavIcon name="modules" filled={modulesOpen} width={24} height={24} />
              </TabGlyph>
            </span>
            <span className="bottom-nav-label">{t("nav.modules", "Modules")}</span>
          </motion.button>
        </div>
      </nav>
      <ModulesSheet open={modulesOpen} focusSearch={searchFirst} onClose={() => setModulesOpen(false)} />
    </>
  );
}

/** The selected tab's pill behind the icon — ONE element shared via layoutId, so it slides tab-to-tab. */
function ActivePill({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.span
      layoutId={reduceMotion ? undefined : "bottom-nav-active"}
      aria-hidden
      className="m-nav-pill"
      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
    />
  );
}

/** The tab glyph: white on the pill with a short spring "pop" when it becomes selected. */
function TabGlyph({ active, reduceMotion, children }: { active: boolean; reduceMotion: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      key={active ? "on" : "off"}
      initial={active && !reduceMotion ? { scale: 0.7 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 18 }}
      className="bottom-nav-glyph"
      data-active={active}
    >
      {children}
    </motion.span>
  );
}
