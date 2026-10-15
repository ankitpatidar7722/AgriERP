"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

export interface MarketPriceRow {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  arrivalDate: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
}

export interface MarketPriceResult {
  configured: boolean;
  rows: MarketPriceRow[];
}

/** Mandi prices (Agmarknet via our backend proxy). Mandi updates ~once a day. */
export function useMarketPrices(
  p: { state?: string; district?: string; commodity?: string },
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["market-prices", p],
    queryFn: () =>
      apiGet<MarketPriceResult>("/market-prices", {
        state: p.state || undefined,
        district: p.district || undefined,
        commodity: p.commodity || undefined,
        limit: 50,
      }),
    enabled,
    staleTime: 30 * 60_000,
  });
}
