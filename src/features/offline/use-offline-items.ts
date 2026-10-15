"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { ItemLookupDto } from "@/features/transactions/types";
import { writeItemsCache } from "./offline-store";

/**
 * Pulls the full billing item list and mirrors it to localStorage, so the
 * offline bill screen can look items up with no network. Runs only when online.
 */
export function useBillingAllItems(enabled: boolean) {
  return useQuery({
    queryKey: ["items", "billing-all"],
    queryFn: async () => {
      const items = await apiGet<ItemLookupDto[]>("/items/billing-all");
      writeItemsCache(items);
      return items;
    },
    enabled,
    staleTime: 10 * 60_000,
  });
}
