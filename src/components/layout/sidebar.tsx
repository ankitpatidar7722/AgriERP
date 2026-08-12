"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarModules } from "@/features/navigation/hooks";
import { useCurrentShop } from "@/features/masters/hooks";
import { useLang } from "@/features/i18n/provider";
import type { SidebarGroup } from "@/features/navigation/types";
import { brand } from "./nav-config";
import { ModuleIcon } from "./module-icon";
import { ModuleFlyout } from "./module-flyout";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  /** Closes the mobile drawer after navigation; a no-op on desktop. */
  onNavigate?: () => void;
  /**
   * "rail" is the desktop column. It shows a narrow icons-only rail when
   * collapsed (modules in a flyout on hover) and the full labelled tree when
   * expanded, toggled by the button at its top.
   * "drawer" is the mobile sheet. It stays fully expanded: hover does not exist
   * on a touch screen, so a flyout there would be a menu with no way in.
   */
  variant?: "rail" | "drawer";
  /** Desktop only: narrow icons-only rail when true, full tree when false. */
  collapsed?: boolean;
  /** Desktop only: flips `collapsed`. Absent on the mobile drawer. */
  onToggle?: () => void;
}

/**
 * How long the panel survives the pointer leaving both surfaces.
 *
 * Long enough to cross the gap or clip a corner on the way to an item, short
 * enough that a panel you have genuinely walked away from does not linger.
 */
const CLOSE_DELAY_MS = 220;

export function SidebarNav({ onNavigate, variant = "rail", collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLang();

  /*
   * Every entry comes from app.ModuleMaster - the label, the route, the group,
   * the order and the icon. Nothing about the menu is written here, so adding a
   * screen is an INSERT, not a redeploy.
   *
   * Groups arrive in ModuleHeadDisplayOrder and their items in
   * ModuleDisplayOrder, already filtered to what this user may reach, so there
   * is nothing left to sort or filter on this side.
   */
  const { data: sections = [] } = useSidebarModules();
  const { data: shop } = useCurrentShop();

  // A route can be a prefix of another (Purchase GRN "/purchases" is a prefix of
  // Purchase Order "/purchases/orders"), so a plain startsWith lights up both.
  // Resolve it by longest match: among every module whose route prefixes the
  // current path (exactly, or followed by "/", so /items/12 still lights Items),
  // only the deepest one is active.
  const activeHref = useMemo(() => {
    let best: string | null = null;
    for (const section of sections) {
      for (const mod of section.modules) {
        const href = mod.moduleName;
        const matches = pathname === href || pathname.startsWith(`${href}/`);
        if (matches && (best === null || href.length > best.length)) best = href;
      }
    }
    return best;
  }, [sections, pathname]);

  const isActive = useCallback((href: string) => href === activeHref, [activeHref]);

  const isDrawer = variant === "drawer";
  // The drawer has no hover, so it is always the full tree. On the desktop rail
  // the full tree shows only when the user has expanded it.
  const showExpanded = isDrawer || !collapsed;

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/*
        The logo block sits in the same 64px row as the header beside it, so the
        two read as one continuous navy bar across the top of the app.
      */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          showExpanded ? "gap-3 px-4" : "justify-center px-2",
        )}
      >
        {showExpanded && (
          <>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <brand.icon className="size-[22px]" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-white">
                {shop?.shopName?.trim() || brand.shortName}
              </span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {shop?.city?.trim() || brand.tagline}
              </span>
            </span>
          </>
        )}

        {/* Collapse/expand toggle - desktop only (the drawer has its own close). */}
        {!isDrawer && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            title={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
            aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors",
              "hover:bg-sidebar-raised hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              showExpanded && "ml-auto",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden />
            )}
          </button>
        )}
      </div>

      {showExpanded ? (
        <DrawerNav sections={sections} isActive={isActive} onNavigate={onNavigate} />
      ) : (
        <RailNav sections={sections} isActive={isActive} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Rail: module heads only, modules in a flyout                               */
/* ------------------------------------------------------------------------- */

interface NavProps {
  sections: SidebarGroup[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}

function RailNav({ sections, isActive }: NavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useId();
  const { t } = useLang();

  const [open, setOpen] = useState<{ head: string; top: number; left: number } | null>(null);

  const railRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeNow = useCallback(() => {
    cancelClose();
    setOpen(null);
  }, [cancelClose]);

  /**
   * The whole point of the delay: the pointer is briefly over neither surface
   * while it travels from the rail into the panel. Both surfaces cancel this
   * timer on enter, so only genuinely leaving both lets it fire.
   */
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const openFor = useCallback(
    (head: string, trigger: HTMLElement) => {
      cancelClose();
      const rail = railRef.current?.getBoundingClientRect();
      setOpen({
        head,
        top: trigger.getBoundingClientRect().top,
        // The rail's right edge, not the button's: the button is inset, and
        // anchoring to it would open the panel over the rail itself.
        left: rail?.right ?? 0,
      });
    },
    [cancelClose],
  );

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Navigating is a decision already made - the panel has served its purpose.
  useEffect(() => closeNow(), [pathname, closeNow]);

  useEffect(() => {
    if (!open) return;

    const isInsideMenu = (node: EventTarget | null) =>
      node instanceof Node &&
      (railRef.current?.contains(node) || document.getElementById(panelId)?.contains(node));

    // A click anywhere else dismisses it, and so does tabbing away - otherwise
    // a keyboard user leaves an orphaned panel floating over the page.
    const onPointerDown = (event: PointerEvent) => {
      if (!isInsideMenu(event.target)) closeNow();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isInsideMenu(event.target)) closeNow();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNow();
    };
    // The panel is anchored to a measured position, so any change to the
    // geometry underneath would leave it pointing at nothing.
    const onViewportChange = () => closeNow();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [open, panelId, closeNow]);

  const openGroup = sections.find((section) => section.moduleHeadName === open?.head);

  return (
    <>
      <ScrollArea
        className="scrollbar-rail flex-1"
        // Scrolling the rail moves the trigger out from under its own panel.
        onScrollCapture={closeNow}
      >
        <nav ref={railRef} className="space-y-1 px-2 pb-6 pt-2" aria-label="Main">
          {sections.map((section) => {
            const isOpen = open?.head === section.moduleHeadName;
            const holdsCurrentPage = section.modules.some((m) => isActive(m.moduleName));

            return (
              <button
                key={section.moduleHeadName}
                type="button"
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                aria-current={holdsCurrentPage ? "true" : undefined}
                title={t(`nav.group.${section.moduleHeadName}`, section.moduleHeadDisplayName)}
                onMouseEnter={(event) => openFor(section.moduleHeadName, event.currentTarget)}
                onMouseLeave={scheduleClose}
                onFocus={(event) => openFor(section.moduleHeadName, event.currentTarget)}
                onClick={(event) => {
                  // A head with a single module has nothing to choose between,
                  // so clicking it goes straight there. Everything else opens
                  // the panel - which is also how this works on a touch screen,
                  // where there is no hover to open it.
                  if (section.modules.length === 1) {
                    closeNow();
                    router.push(section.modules[0].moduleName);
                    return;
                  }
                  openFor(section.moduleHeadName, event.currentTarget);
                }}
                className={cn(
                  "group relative flex w-full items-center justify-center rounded-xl p-2.5",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                  holdsCurrentPage
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                    : isOpen
                      ? "bg-sidebar-raised text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-raised hover:text-white",
                )}
              >
                {/*
                  Module heads have no icon column of their own, so the head
                  wears the icon of its first module - which is the one the
                  group is named after in every group we ship. The label lives in
                  the flyout, so the collapsed rail stays icons-only.
                */}
                <ModuleIcon
                  name={section.modules[0]?.iconName}
                  className="size-[22px] shrink-0"
                />
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {open && openGroup && (
        <ModuleFlyout
          id={panelId}
          group={openGroup}
          anchor={{ top: open.top, left: open.left }}
          isActive={isActive}
          onNavigate={closeNow}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------------- */
/* Drawer: everything expanded, unchanged                                     */
/* ------------------------------------------------------------------------- */

function DrawerNav({ sections, isActive, onNavigate }: NavProps) {
  const { t } = useLang();
  return (
    <ScrollArea className="scrollbar-thin flex-1">
      <nav className="space-y-6 px-3 py-4" aria-label="Main">
        {sections.map((section) => (
          <div key={section.moduleHeadName}>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {t(`nav.group.${section.moduleHeadName}`, section.moduleHeadDisplayName)}
            </p>

            <ul className="space-y-0.5">
              {section.modules.map((module) => {
                const active = isActive(module.moduleName);

                return (
                  <li key={module.moduleId}>
                    <Link
                      href={module.moduleName}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                        "transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-raised hover:text-white",
                      )}
                    >
                      <ModuleIcon name={module.iconName} className="size-[18px] shrink-0" />
                      <span className="truncate">
                        {t(`nav.${module.moduleName}`, module.moduleDisplayName)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
