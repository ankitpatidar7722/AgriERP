"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { ItemFormDefinitionDto, ItemGroupDto } from "./types";

export function useItemGroups() {
  return useQuery({
    queryKey: ["item-groups"],
    queryFn: () => apiGet<ItemGroupDto[]>("/item-groups"),
    // Groups and their fields change when someone runs a migration, not during
    // a shift. Refetching them on every window focus would be pure noise.
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * The form definition for one group.
 *
 * Cached under the group id, so switching between Seed and Fertilizer on the
 * item screen is instant after the first look and does not re-fetch a layout
 * that cannot have changed.
 */
export function useItemFormDefinition(itemGroupId: number | null) {
  return useQuery({
    queryKey: ["item-groups", itemGroupId, "form"],
    queryFn: () => apiGet<ItemFormDefinitionDto>(`/item-groups/${itemGroupId}/form`),
    enabled: itemGroupId != null && itemGroupId > 0,
    staleTime: 10 * 60 * 1000,
  });
}
