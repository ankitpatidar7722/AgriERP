"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ModuleIcon } from "@/components/layout/module-icon";
import { useSidebarModules } from "@/features/navigation/hooks";

interface PageHeaderProps {
  title: string;
  /** Kept for source compatibility; no longer rendered (headers are icon + title only). */
  description?: string;
  /** Primary actions, centered under the title. */
  actions?: React.ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  const pathname = usePathname();
  const { data: groups = [] } = useSidebarModules();

  // The heading gets the SAME icon as its sidebar entry, matched by route (longest
  // prefix so a sub-page like /sales/returns/new inherits the /sales/returns icon).
  const iconName = useMemo(() => {
    let best: { moduleName: string; iconName?: string | null } | null = null;
    for (const g of groups) {
      for (const m of g.modules) {
        if (pathname === m.moduleName || pathname.startsWith(`${m.moduleName}/`)) {
          if (!best || m.moduleName.length > best.moduleName.length) best = m;
        }
      }
    }
    return best?.iconName ?? null;
  }, [groups, pathname]);

  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      <div className="flex min-w-0 items-center justify-center gap-2">
        <ModuleIcon name={iconName} className="size-6 shrink-0 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight lg:text-[28px] lg:leading-tight">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="no-print flex flex-wrap items-center justify-center gap-2">{actions}</div>
      )}
    </div>
  );
}
