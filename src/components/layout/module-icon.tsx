"use client";

import { useCallback } from "react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders the Lucide icon named in ModuleMaster.IconName.
 *
 * Resolved through lucide-react's dynamic entry rather than
 * `import * as Icons from "lucide-react"`. The barrel form would work, but a
 * namespace import indexed by a runtime string defeats tree-shaking, so every
 * one of Lucide's ~1,600 icons would ship in the shell bundle to render twelve
 * of them. This loads one small chunk per icon actually used, which also means
 * a row inserted into ModuleMaster tomorrow can name ANY Lucide icon and it
 * simply works - no registry to extend, no redeploy.
 *
 * The cost is that the glyph arrives a tick after the row does, hence the
 * fallback below.
 */

/** Lucide's dynamic map is keyed kebab-case; the table stores "LayoutDashboard". */
function toKebabCase(name: string): string {
  return name
    .trim()
    // "BarChart3" -> "Bar-Chart3", "LayoutDashboard" -> "Layout-Dashboard"
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    // "Chart3" -> "Chart-3", so BarChart3 lands on Lucide's "bar-chart-3"
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

const KNOWN_ICONS = new Set<string>(iconNames);

interface ModuleIconProps {
  /** IconName from app.ModuleMaster. Null, blank or unrecognised falls back. */
  name?: string | null;
  className?: string;
}

export function ModuleIcon({ name, className }: ModuleIconProps) {
  const resolved = name ? toKebabCase(name) : null;

  /*
   * DynamicIcon calls the fallback as createElement(Fallback) with NO props, so
   * the placeholder has to carry its own sizing. Without that the rail would
   * jump from a 24px default to an 18px icon as each chunk lands.
   */
  const Fallback = useCallback(
    () => <Circle className={cn("opacity-40", className)} aria-hidden />,
    [className],
  );

  // An unknown name would make DynamicIcon throw inside its effect and log to
  // the console on every mount. Checked here so a typo in the table is a quiet
  // placeholder, not console noise on every page.
  if (!resolved || !KNOWN_ICONS.has(resolved)) {
    return <Fallback />;
  }

  return (
    <DynamicIcon
      name={resolved as IconName}
      className={className}
      fallback={Fallback}
      aria-hidden
    />
  );
}
