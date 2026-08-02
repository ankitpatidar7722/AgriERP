"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { Dashboard } from "./types";

export function useDashboard(asOnDate?: string) {
  return useQuery({
    queryKey: ["dashboard", asOnDate ?? "today"],
    queryFn: () =>
      apiGet<Dashboard>("/dashboard", asOnDate ? { asOnDate } : undefined),
    // The whole screen comes from one stored procedure, so this is a single
    // round trip rather than thirteen.
    staleTime: 60_000,
  });
}
