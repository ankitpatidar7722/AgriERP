"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ModuleIcon } from "./module-icon";
import { useLang } from "@/features/i18n/provider";
import type { SidebarGroup } from "@/features/navigation/types";

/**
 * The gap between the rail and the panel is PADDING on the wrapper, not a
 * margin. That keeps it inside the flyout's own hover area, so crossing it
 * never registers as leaving - which is the difference between a menu that
 * feels solid and one that snaps shut halfway to the item you were reaching for.
 */
const GAP_PX = 8;

/** Breathing room kept between the panel and the top or bottom of the window. */
const EDGE_PX = 12;

interface ModuleFlyoutProps {
  group: SidebarGroup;
  /** Viewport coordinates: the rail's right edge and the trigger's top. */
  anchor: { top: number; left: number };
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  id: string;
}

export function ModuleFlyout({
  group,
  anchor,
  isActive,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
  id,
}: ModuleFlyoutProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(anchor.top);
  const { t } = useLang();

  /*
   * Rendered into document.body rather than beside the trigger: the rail is a
   * ScrollArea, and a panel positioned inside it would be clipped at the rail's
   * 92px edge - exactly where it needs to escape.
   *
   * Which means the vertical clamp has to be done here. A group near the bottom
   * of the rail would otherwise open below the fold, and its last item would be
   * unreachable.
   */
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const lowestTop = window.innerHeight - panel.offsetHeight - EDGE_PX;
    setTop(Math.max(EDGE_PX, Math.min(anchor.top, lowestTop)));
  }, [anchor.top, group.moduleHeadName]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      // The wrapper is the hover surface; the card inside it is the visual.
      className="fixed z-50"
      style={{ top, left: anchor.left, paddingLeft: GAP_PX }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        ref={panelRef}
        id={id}
        role="group"
        aria-label={group.moduleHeadDisplayName}
        className={cn(
          "w-[264px] overflow-hidden rounded-xl bg-sidebar text-sidebar-foreground",
          "shadow-2xl shadow-black/40 ring-1 ring-sidebar-border",
          "animate-in fade-in-0 slide-in-from-left-1 duration-150",
        )}
        style={{ maxHeight: `calc(100vh - ${EDGE_PX * 2}px)` }}
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <ModuleIcon
            name={group.modules[0]?.iconName}
            className="size-[18px] shrink-0 text-sidebar-foreground/70"
          />
          <span className="truncate text-[15px] font-semibold text-white">
            {t(`nav.group.${group.moduleHeadName}`, group.moduleHeadDisplayName)}
          </span>
        </div>

        <ul className="scrollbar-thin max-h-[70vh] overflow-y-auto px-2 pb-3">
          {group.modules.map((module) => {
            const active = isActive(module.moduleName);

            return (
              <li key={module.moduleId}>
                <Link
                  href={module.moduleName}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block truncate rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    active
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-raised hover:text-white",
                  )}
                >
                  {t(`nav.${module.moduleName}`, module.moduleDisplayName)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
