"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { ComplianceRegisterQuery, ComplianceRegisterRow } from "./types";

/** Inspection register (inward/outward of regulated inputs) for a period. */
export function useComplianceRegister(q: ComplianceRegisterQuery, enabled = true) {
  return useQuery({
    queryKey: ["reports", "compliance-register", q],
    queryFn: () =>
      apiGet<ComplianceRegisterRow[]>("/reports/compliance-register", {
        fromDate: q.fromDate,
        toDate: q.toDate,
        groupCode: q.groupCode || undefined,
        direction: q.direction || undefined,
      }),
    enabled: enabled && !!q.fromDate && !!q.toDate,
  });
}
