"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar";

const STORAGE_KEY = "agrierp.sidebar.collapsed";

/**
 * The desktop sidebar column. Collapsed by default (a narrow icons-only rail);
 * the toggle at its top expands it to a full labelled menu. The choice persists
 * so the shop keeps the width it prefers.
 *
 * State lives here rather than in SidebarNav because the <aside> width and the
 * menu body have to change together, and the mobile drawer (also SidebarNav)
 * must stay untouched.
 */
export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "false") setCollapsed(false);
    else if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "no-print hidden shrink-0 bg-sidebar transition-[width] duration-200 lg:block",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      <div className="sticky top-0 h-screen">
        <SidebarNav collapsed={collapsed} onToggle={toggle} />
      </div>
    </aside>
  );
}
