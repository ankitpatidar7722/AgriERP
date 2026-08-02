"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { useAuth } from "@/features/auth/auth-context";
import type { SidebarGroup } from "./types";

/**
 * Keyed by user id, not by a constant.
 *
 * The menu is scoped to the caller's permissions, and signing out is a
 * client-side navigation - the QueryClient survives it. A shared key would hand
 * the next person to sign in at this counter the previous user's menu until it
 * revalidated.
 */
export const sidebarQueryKey = (userId: number | null) =>
  ["modules", "sidebar", userId] as const;

/**
 * The sidebar, read from app.ModuleMaster.
 *
 * Groups and ordering arrive already resolved, so nothing here re-sorts them -
 * two places deciding the order is two places for it to disagree.
 *
 * Infinity staleTime: the only things that change this answer are a new row in
 * ModuleMaster and a change of user, and the second one changes the key.
 */
export function useSidebarModules() {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: sidebarQueryKey(user?.userId ?? null),
    queryFn: () => apiGet<SidebarGroup[]>("/modules/sidebar"),
    enabled: isAuthenticated,
    staleTime: Infinity,
  });
}
