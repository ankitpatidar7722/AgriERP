"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import { useT } from "@/features/i18n/provider";
import { ApiError, type LookupDto, type PagedResult } from "@/types/api";
import type {
  BatchStockView,
  GstReturnDto,
  InvoicePrintDto,
  OpenBillDto,
  OpeningStockRequest,
  PartyType,
  PaymentDto,
  PaymentQuery,
  ItemLookupDto,
  ItemStockView,
  ProfitReportRow,
  PurchaseDto,
  PurchaseItemRow,
  PurchaseListDto,
  PurchaseOrderDto,
  PurchaseOrderItemRow,
  PurchaseOrderPrintDto,
  PurchaseOrderQuery,
  PurchasePrintDto,
  PurchaseQuery,
  PurchaseReportRow,
  PurchaseRequisitionDto,
  PurchaseRequisitionItemRow,
  PurchaseRequisitionQuery,
  SavePurchaseOrderRequest,
  SavePurchaseRequisitionRequest,
  SaleDto,
  SaleListDto,
  SaleQuery,
  SalesOrderPrintDto,
  CustomerSalesRow,
  SalesReportRow,
  SupplierPurchaseRow,
  SavePaymentRequest,
  SavePurchaseRequest,
  SaveSaleRequest,
  SaveStockAdjustmentRequest,
  SaveStockTransferRequest,
  StockAdjustmentDto,
  StockDocumentQuery,
  StockLedgerLineDto,
  StockLedgerQuery,
  StockTransferDto,
  StockValuationDto,
} from "./types";

function describe(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong.";
}

/**
 * Posting a document changes stock, party balances and the dashboard at once,
 * so the whole server cache is dropped rather than trying to name every key
 * that a single posting touches.
 */
function invalidateEverything(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries();
}

/* ------------------------------- billing --------------------------------- */

/**
 * Billing type-ahead. Not debounced here - the caller debounces the term, so
 * this hook stays a plain cache lookup and repeated searches are instant.
 */
export function useItemSearch(search: string, enabled = true) {
  return useQuery({
    queryKey: ["items", "billing-search", search],
    queryFn: () => apiGet<ItemLookupDto[]>("/items/search", { search }),
    enabled: enabled && search.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useBarcodeLookup() {
  const t = useT();
  return useMutation({
    mutationFn: (barcode: string) =>
      apiGet<ItemLookupDto>(`/items/by-barcode/${encodeURIComponent(barcode)}`),
    onError: () => toast.error(t("tmsg.noBarcodeItem")),
  });
}

export function useCustomerLookup(search: string) {
  return useQuery({
    queryKey: ["customers", "lookup", search],
    queryFn: () => apiGet<LookupDto[]>("/customers/lookup", { search }),
    staleTime: 60_000,
  });
}

export interface PaymentModeLookup extends LookupDto {
  requiresReference: boolean;
  isBankMode: boolean;
}

export function usePaymentModes() {
  return useQuery({
    queryKey: ["lookups", "payment-modes"],
    queryFn: () => apiGet<PaymentModeLookup[]>("/lookups/payment-modes"),
    // Six seeded rows that never change during a session.
    staleTime: Infinity,
  });
}

export function useStorageLocations() {
  return useQuery({
    queryKey: ["lookups", "storage-locations"],
    queryFn: () => apiGet<LookupDto[]>("/lookups/storage-locations"),
    staleTime: 10 * 60_000,
  });
}

/* --------------------------------- sales --------------------------------- */

export function useSales(query: SaleQuery) {
  return useQuery({
    queryKey: ["sales", "list", query],
    queryFn: () => apiGet<PagedResult<SaleListDto>>("/sales", query),
    placeholderData: (previous) => previous,
  });
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: ["sales", "detail", id],
    queryFn: () => apiGet<SaleDto>(`/sales/${id}`),
    enabled: id != null && id > 0,
  });
}

export function usePurchasePrint(id: number | null) {
  return useQuery({
    queryKey: ["purchases", "print", id],
    queryFn: () => apiGet<PurchasePrintDto>(`/purchases/${id}/print`),
    enabled: id != null && id > 0,
    staleTime: 60_000,
  });
}

export function useInvoicePrint(id: number | null) {
  return useQuery({
    queryKey: ["sales", "print", id],
    queryFn: () => apiGet<InvoicePrintDto>(`/sales/${id}/print`),
    enabled: id != null && id > 0,
    // The endpoint increments the print count, so it must not be replayed on
    // a window focus or a cache revalidation.
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: false,
  });
}

export function useSalesOrderPrint(id: number | null) {
  return useQuery({
    queryKey: ["sales", "order-print", id],
    queryFn: () => apiGet<SalesOrderPrintDto>(`/sales/${id}/sales-order-print`),
    enabled: id != null && id > 0,
    staleTime: 60_000,
  });
}

export function useCreateSale() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveSaleRequest) => apiPost<SaleDto>("/sales", body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function usePostSale() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (id: number) => apiPost<SaleDto>(`/sales/${id}/post`),
    onSuccess: () => {
      toast.success(t("tmsg.invoicePosted"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useCancelSale() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost<SaleDto>(`/sales/${id}/cancel`, { reason }),
    onSuccess: () => {
      toast.success(t("tmsg.invoiceCancelled"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

/* ------------------------------- purchases -------------------------------- */

export function usePurchases(query: PurchaseQuery) {
  return useQuery({
    queryKey: ["purchases", "list", query],
    queryFn: () => apiGet<PagedResult<PurchaseListDto>>("/purchases", query),
    placeholderData: (previous) => previous,
  });
}

/** The GRN list flattened one row per line item (item-wise view). */
export function usePurchaseItems(query: PurchaseQuery) {
  return useQuery({
    queryKey: ["purchases", "items", query],
    queryFn: () => apiGet<PagedResult<PurchaseItemRow>>("/purchases/items", query),
    placeholderData: (previous) => previous,
  });
}

export function usePurchase(id: number | null) {
  return useQuery({
    queryKey: ["purchases", "detail", id],
    queryFn: () => apiGet<PurchaseDto>(`/purchases/${id}`),
    enabled: id != null && id > 0,
  });
}

export function useCreatePurchase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SavePurchaseRequest) => apiPost<PurchaseDto>("/purchases", body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useUpdatePurchase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SavePurchaseRequest }) =>
      apiPut<PurchaseDto>(`/purchases/${id}`, body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function usePostPurchase() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (id: number) => apiPost<PurchaseDto>(`/purchases/${id}/post`),
    onSuccess: () => {
      toast.success(t("tmsg.purchasePosted"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useCancelPurchase() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost<PurchaseDto>(`/purchases/${id}/cancel`, { reason }),
    onSuccess: () => {
      toast.success(t("tmsg.purchaseCancelled"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

/* ----------------------------- purchase orders ---------------------------- */

export function usePurchaseOrders(query: PurchaseOrderQuery) {
  return useQuery({
    queryKey: ["purchase-orders", "list", query],
    queryFn: () => apiGet<PagedResult<PurchaseOrderDto>>("/purchases/orders", query),
    placeholderData: (previous) => previous,
  });
}

/** The order list flattened one row per line item (item-wise view). */
export function usePurchaseOrderItems(query: PurchaseOrderQuery) {
  return useQuery({
    queryKey: ["purchase-orders", "items", query],
    queryFn: () => apiGet<PagedResult<PurchaseOrderItemRow>>("/purchases/orders/items", query),
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: ["purchase-orders", "detail", id],
    queryFn: () => apiGet<PurchaseOrderDto>(`/purchases/orders/${id}`),
    enabled: id != null && id > 0,
  });
}

/** Several orders (with lines) at once - used to build one GRN from multiple
 *  pending POs of the same supplier. */
export function usePurchaseOrdersByIds(ids: number[]) {
  const key = ids.join(",");
  return useQuery({
    queryKey: ["purchase-orders", "by-ids", key],
    queryFn: () => apiGet<PurchaseOrderDto[]>("/purchases/orders/by-ids", { ids: key }),
    enabled: ids.length > 0,
  });
}

export function usePurchaseOrderPrint(id: number | null) {
  return useQuery({
    queryKey: ["purchase-orders", "print", id],
    queryFn: () => apiGet<PurchaseOrderPrintDto>(`/purchases/orders/${id}/print`),
    enabled: id != null && id > 0,
    staleTime: 60_000,
  });
}

export function useCreatePurchaseOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SavePurchaseOrderRequest) =>
      apiPost<PurchaseOrderDto>("/purchases/orders", body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useUpdatePurchaseOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SavePurchaseOrderRequest }) =>
      apiPut<PurchaseOrderDto>(`/purchases/orders/${id}`, body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

/* -------------------------- purchase requisitions ------------------------- */

export function usePurchaseRequisitions(query: PurchaseRequisitionQuery) {
  return useQuery({
    queryKey: ["purchase-requisitions", "list", query],
    queryFn: () => apiGet<PagedResult<PurchaseRequisitionDto>>("/purchases/requisitions", query),
    placeholderData: (previous) => previous,
  });
}

/** The requisition list flattened one row per line item (item-wise view). */
export function usePurchaseRequisitionItems(query: PurchaseRequisitionQuery) {
  return useQuery({
    queryKey: ["purchase-requisitions", "items", query],
    queryFn: () => apiGet<PagedResult<PurchaseRequisitionItemRow>>("/purchases/requisitions/items", query),
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseRequisition(id: number | null) {
  return useQuery({
    queryKey: ["purchase-requisitions", "detail", id],
    queryFn: () => apiGet<PurchaseRequisitionDto>(`/purchases/requisitions/${id}`),
    enabled: id != null && id > 0,
  });
}

/** Indicative next requisition number for the create form (does not consume the series). */
export function useNextRequisitionNumber(enabled: boolean) {
  return useQuery({
    queryKey: ["purchase-requisitions", "next-number"],
    queryFn: () => apiGet<{ number: string | null }>("/purchases/requisitions/next-number"),
    enabled,
    staleTime: 0,
  });
}

/** Indicative next purchase-order number for the create form (does not consume the series). */
export function useNextPurchaseOrderNumber(enabled: boolean) {
  return useQuery({
    queryKey: ["purchase-orders", "next-number"],
    queryFn: () => apiGet<{ number: string | null }>("/purchases/orders/next-number"),
    enabled,
    staleTime: 0,
  });
}

export function useCreatePurchaseRequisition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SavePurchaseRequisitionRequest) =>
      apiPost<PurchaseRequisitionDto>("/purchases/requisitions", body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useUpdatePurchaseRequisition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SavePurchaseRequisitionRequest }) =>
      apiPut<PurchaseRequisitionDto>(`/purchases/requisitions/${id}`, body),
    onSuccess: () => invalidateEverything(client),
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useCancelPurchaseRequisition() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (id: number) =>
      apiPost<PurchaseRequisitionDto>(`/purchases/requisitions/${id}/cancel`),
    onSuccess: () => {
      toast.success(t("tmsg.requisitionCancelled"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

/* --------------------------------- stock ---------------------------------- */

export function useStockLedger(query: StockLedgerQuery) {
  return useQuery({
    queryKey: ["stock", "ledger", query],
    queryFn: () => apiGet<PagedResult<StockLedgerLineDto>>("/stock/ledger", query),
    placeholderData: (previous) => previous,
  });
}

export function useBatchStock(itemId?: number | null, locationId?: number | null) {
  return useQuery({
    queryKey: ["stock", "batches", itemId, locationId],
    queryFn: () =>
      apiGet<BatchStockView[]>("/stock/batches", {
        itemId: itemId ?? undefined,
        locationId: locationId ?? undefined,
      }),
  });
}

export function useAdjustments(query: StockDocumentQuery) {
  return useQuery({
    queryKey: ["stock", "adjustments", query],
    queryFn: () => apiGet<PagedResult<StockAdjustmentDto>>("/stock/adjustments", query),
    placeholderData: (previous) => previous,
  });
}

export function useAdjustment(id: number | null) {
  return useQuery({
    queryKey: ["stock", "adjustment", id],
    queryFn: () => apiGet<StockAdjustmentDto>(`/stock/adjustments/${id}`),
    enabled: id != null && id > 0,
  });
}

export function useCreateAdjustment() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (body: SaveStockAdjustmentRequest) =>
      apiPost<StockAdjustmentDto>("/stock/adjustments", body),
    onSuccess: () => {
      toast.success(t("tmsg.adjustmentDraft"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function usePostAdjustment() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (id: number) => apiPost<StockAdjustmentDto>(`/stock/adjustments/${id}/post`),
    onSuccess: () => {
      toast.success(t("tmsg.adjustmentPosted"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useCreateOpeningStock() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (body: OpeningStockRequest) =>
      apiPost<StockAdjustmentDto>("/stock/opening", body),
    onSuccess: () => {
      toast.success(t("tmsg.openingLoaded"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useTransfers(query: StockDocumentQuery) {
  return useQuery({
    queryKey: ["stock", "transfers", query],
    queryFn: () => apiGet<PagedResult<StockTransferDto>>("/stock/transfers", query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateTransfer() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (body: SaveStockTransferRequest) =>
      apiPost<StockTransferDto>("/stock/transfers", body),
    onSuccess: () => {
      toast.success(t("tmsg.transferDraft"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function usePostTransfer() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (id: number) => apiPost<StockTransferDto>(`/stock/transfers/${id}/post`),
    onSuccess: () => {
      toast.success(t("tmsg.transferPosted"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

/* -------------------------------- payments -------------------------------- */

export function usePayments(query: PaymentQuery) {
  return useQuery({
    queryKey: ["payments", "list", query],
    queryFn: () => apiGet<PagedResult<PaymentDto>>("/payments", query),
    placeholderData: (previous) => previous,
  });
}

export function useReceiptPrint(id: number | null) {
  return useQuery({
    queryKey: ["payments", "print", id],
    queryFn: () => apiGet<import("./types").ReceiptPrint>(`/payments/${id}/print`),
    enabled: id != null && id > 0,
    staleTime: Infinity,
  });
}

export function useOpenBills(partyType: PartyType | null, partyId: number | null) {
  return useQuery({
    queryKey: ["payments", "open-bills", partyType, partyId],
    queryFn: () => apiGet<OpenBillDto[]>("/payments/open-bills", { partyType, partyId }),
    enabled: !!partyType && partyId != null && partyId > 0,
  });
}

export function useCreatePayment() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: (body: SavePaymentRequest) => apiPost<PaymentDto>("/payments", body),
    onSuccess: () => {
      toast.success(t("tmsg.paymentRecorded"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

export function useCancelPayment() {
  const client = useQueryClient();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiPost<PaymentDto>(`/payments/${id}/cancel`, { reason }),
    onSuccess: () => {
      toast.success(t("tmsg.paymentCancelled"));
      invalidateEverything(client);
    },
    onError: (error) => toast.error(describe(error), { duration: 7000 }),
  });
}

/* -------------------------------- reports --------------------------------- */

export function useStockReport(kind: "current" | "low" | "out-of-stock") {
  return useQuery({
    queryKey: ["reports", "stock", kind],
    queryFn: () => apiGet<ItemStockView[]>(`/reports/stock/${kind}`),
  });
}

export function useExpiryReport(kind: "near-expiry" | "expired", withinDays = 90) {
  return useQuery({
    queryKey: ["reports", "stock", kind, withinDays],
    queryFn: () =>
      apiGet<BatchStockView[]>(
        `/reports/stock/${kind}`,
        kind === "near-expiry" ? { withinDays } : undefined,
      ),
  });
}

export function useStockValuation() {
  return useQuery({
    queryKey: ["reports", "stock", "valuation"],
    queryFn: () => apiGet<StockValuationDto>("/reports/stock/valuation"),
  });
}

export function useSalesReport(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["reports", "sales", fromDate, toDate],
    queryFn: () => apiGet<SalesReportRow[]>("/reports/sales", { fromDate, toDate }),
  });
}

export function useSalesByCustomer(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["reports", "sales-by-customer", fromDate, toDate],
    queryFn: () => apiGet<CustomerSalesRow[]>("/reports/sales-by-customer", { fromDate, toDate }),
  });
}

export function usePurchaseBySupplier(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["reports", "purchase-by-supplier", fromDate, toDate],
    queryFn: () => apiGet<SupplierPurchaseRow[]>("/reports/purchase-by-supplier", { fromDate, toDate }),
  });
}

export function usePurchaseReport(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["reports", "purchase", fromDate, toDate],
    queryFn: () => apiGet<PurchaseReportRow[]>("/reports/purchase", { fromDate, toDate }),
  });
}

export function useProfitReport(fromDate: string, toDate: string, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "profit", fromDate, toDate],
    queryFn: () => apiGet<ProfitReportRow[]>("/reports/profit", { fromDate, toDate }),
    enabled,
  });
}

export function useGstReport(fromDate: string, toDate: string, enabled: boolean) {
  return useQuery({
    queryKey: ["reports", "gst", fromDate, toDate],
    queryFn: () => apiGet<GstReturnDto>("/reports/gst", { fromDate, toDate }),
    enabled,
  });
}
