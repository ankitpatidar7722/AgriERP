"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { LookupDto, ItemFormLookups } from "@/types/api";
import { createMasterHooks } from "./use-master-crud";
import type {
  ItemSubGroupListDto,
  ItemSubGroupQuery,
  CompanyDto,
  CompanyListDto,
  CompanyQuery,
  CustomerDto,
  CustomerListDto,
  CustomerQuery,
  ItemDto,
  ItemListDto,
  ItemQuery,
  SaveItemSubGroupRequest,
  SaveCompanyRequest,
  SaveCustomerRequest,
  SaveItemRequest,
  SaveShopRequest,
  SaveSupplierRequest,
  SaveUnitRequest,
  SaveWarehouseRequest,
  ShopDto,
  ShopListDto,
  ShopQuery,
  SupplierDto,
  SupplierListDto,
  SupplierQuery,
  UnitDto,
  WarehouseDto,
  WarehouseListDto,
  WarehouseQuery,
} from "./types";

export const itemSubGroupHooks = createMasterHooks<
  ItemSubGroupListDto,
  ItemSubGroupListDto,
  SaveItemSubGroupRequest,
  ItemSubGroupQuery
// The API path is hyphenated - /api/item-subgroups - so the resource segment
// cannot just be the camelCase name the rename produced.
>("item-subgroups", "Item sub group");

export const companyHooks = createMasterHooks<
  CompanyListDto,
  CompanyDto,
  SaveCompanyRequest,
  CompanyQuery
>("companies", "Company");

export const supplierHooks = createMasterHooks<
  SupplierListDto,
  SupplierDto,
  SaveSupplierRequest,
  SupplierQuery
>("suppliers", "Supplier");

export const customerHooks = createMasterHooks<
  CustomerListDto,
  CustomerDto,
  SaveCustomerRequest,
  CustomerQuery
>("customers", "Customer");

export const unitHooks = createMasterHooks<UnitDto, UnitDto, SaveUnitRequest>("units", "Unit");

export const shopHooks = createMasterHooks<ShopListDto, ShopDto, SaveShopRequest, ShopQuery>(
  "shops",
  "Shop",
);

/** The active shop's identity for the app header (name, city). Any signed-in user. */
export function useCurrentShop() {
  return useQuery({
    queryKey: ["shops", "current"],
    queryFn: () => apiGet<ShopListDto | null>("/shops/current"),
    staleTime: 5 * 60_000,
  });
}

export const warehouseHooks = createMasterHooks<
  WarehouseListDto,
  WarehouseDto,
  SaveWarehouseRequest,
  WarehouseQuery
>("warehouses", "Warehouse");

/** The code the next warehouse will get (WH00001...), for the create form. */
export function useNextWarehouseCode(enabled: boolean) {
  return useQuery({
    queryKey: ["warehouses", "next-code"],
    queryFn: () => apiGet<{ code: string | null }>("/warehouses/next-code"),
    enabled,
    staleTime: 0,
  });
}

export const itemHooks = createMasterHooks<
  ItemListDto,
  ItemDto,
  SaveItemRequest,
  ItemQuery
>("items", "Item");

/**
 * Everything the item form needs, in one request. Six parallel lookup calls
 * on page open is six round trips for a form that cannot be used until all of
 * them land.
 */
export function useItemFormLookups() {
  return useQuery({
    queryKey: ["lookups", "item-form"],
    queryFn: () => apiGet<ItemFormLookups>("/lookups/item-form"),
    staleTime: 10 * 60_000,
  });
}

/* --------------------------- customer ledger ------------------------------ */

export function useCustomerProfile(id: number | null) {
  return useQuery({
    queryKey: ["customers", "profile", id],
    queryFn: () => apiGet<import("./types").CustomerProfileDto>(`/customers/${id}/profile`),
    enabled: id != null && id > 0,
  });
}

export function useCustomerLedger(id: number | null, from?: string | null, to?: string | null) {
  return useQuery({
    queryKey: ["customers", "ledger", id, from, to],
    queryFn: () =>
      apiGet<import("./types").CustomerLedgerDto>(`/customers/${id}/ledger`, {
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: id != null && id > 0,
    placeholderData: (previous) => previous,
  });
}

export function useCustomerLookup(search: string) {
  return useQuery({
    queryKey: ["customers", "lookup", search],
    queryFn: () => apiGet<LookupDto[]>("/customers/lookup", { search: search || undefined }),
    staleTime: 30_000,
  });
}

export function useSupplierLedger(id: number | null, from?: string | null, to?: string | null) {
  return useQuery({
    queryKey: ["suppliers", "ledger", id, from, to],
    queryFn: () =>
      apiGet<import("./types").SupplierLedgerDto>(`/suppliers/${id}/ledger`, {
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: id != null && id > 0,
    placeholderData: (previous) => previous,
  });
}

export function useReceivablesSummary() {
  return useQuery({
    queryKey: ["customers", "receivables-summary"],
    queryFn: () => apiGet<import("./types").ReceivablesSummaryDto>("/customers/receivables-summary"),
    staleTime: 60_000,
  });
}

export function useCustomerOutstanding() {
  return useQuery({
    queryKey: ["customers", "outstanding"],
    queryFn: () => apiGet<import("./types").CustomerOutstandingRow[]>("/customers/outstanding"),
    staleTime: 30_000,
  });
}

export function useSupplierOutstanding() {
  return useQuery({
    queryKey: ["suppliers", "outstanding"],
    queryFn: () => apiGet<import("./types").SupplierOutstandingRow[]>("/suppliers/outstanding"),
    staleTime: 30_000,
  });
}

export function useStates() {
  return useQuery({
    queryKey: ["lookups", "states"],
    queryFn: () => apiGet<LookupDto[]>("/lookups/states"),
    // The list of Indian states does not change during a session.
    staleTime: Infinity,
  });
}

export function useVillages() {
  return useQuery({
    queryKey: ["customers", "villages"],
    queryFn: () => apiGet<string[]>("/customers/villages"),
    staleTime: 5 * 60_000,
  });
}
