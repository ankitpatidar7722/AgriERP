"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { Dashboard } from "./types";

/**
 * The whole dashboard in one call. When a date window (fromDate/toDate) is
 * passed, the period figures (sales/purchase/top-items) and the trend series
 * are scoped to it; snapshot figures (stock value, dues, alerts) stay as-of-now.
 * Omitting the window makes the API fall back to the current calendar month.
 */
export function useDashboard(fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: ["dashboard", fromDate ?? "", toDate ?? ""],
    queryFn: () =>
      apiGet<Dashboard>(
        "/dashboard",
        fromDate && toDate ? { fromDate, toDate } : undefined,
      ),
    // The whole screen comes from one stored procedure, so this is a single
    // round trip rather than thirteen.
    staleTime: 60_000,
  });
}
