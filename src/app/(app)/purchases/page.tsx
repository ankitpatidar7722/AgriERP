"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, PackageCheck, Pencil, Plus, Printer, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  DocumentStatusBadge,
  PurchaseOrderStatusBadge,
} from "@/components/common/status-badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { useCancelPurchase, usePurchaseItems, usePurchaseOrders } from "@/features/transactions/hooks";
import type {
  DocumentStatus,
  PurchaseItemRow,
  PurchaseOrderDto,
  PurchaseOrderQuery,
  PurchaseQuery,
} from "@/features/transactions/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const ALL = "all";
type Tab = "pending" | "grn";

export default function PurchasesPage() {
  const { can } = useAuth();
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<Tab>("grn");
  const [query, setQuery] = useState<PurchaseQuery>({ page: 1, pageSize: 25 });
  const [poQuery, setPoQuery] = useState<PurchaseOrderQuery>({
    page: 1,
    pageSize: 25,
    pendingOnly: true,
  });
  const [cancelling, setCancelling] = useState<PurchaseItemRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const list = usePurchaseItems(query);
  const pendingOrders = usePurchaseOrders(poQuery);
  const cancel = useCancelPurchase();

  const canReceive = can(Permissions.Purchase.Create);

  // Item-wise: one row per GRN line. A 5-item receipt shows as 5 rows, each
  // carrying its GRN number; editing (draft) opens the whole receipt.
  const columns: DataColumn<PurchaseItemRow>[] = [
    {
      key: "number",
      header: t("grn.colHeader"),
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.purchaseNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.purchaseDate)}</div>
        </div>
      ),
      exportValue: (row) => row.purchaseNumber,
    },
    {
      key: "itemCode",
      header: t("po.itemCodeCol"),
      cell: (row) => <span className="tabular text-muted-foreground">{row.itemCode || "-"}</span>,
      exportValue: (row) => row.itemCode,
    },
    {
      key: "itemName",
      header: t("po.itemNameCol"),
      cell: (row) => <div className="max-w-[200px] truncate font-medium">{row.itemName}</div>,
      exportValue: (row) => row.itemName,
    },
    {
      key: "itemGroup",
      header: t("po.itemGroupCol"),
      hideBelow: "lg",
      cell: (row) => <span className="text-muted-foreground">{row.itemGroupName || "-"}</span>,
      exportValue: (row) => row.itemGroupName,
    },
    {
      key: "itemSubGroup",
      header: t("po.itemSubGroupCol"),
      hideBelow: "lg",
      cell: (row) => <span className="text-muted-foreground">{row.itemSubGroupName || "-"}</span>,
      exportValue: (row) => row.itemSubGroupName,
    },
    {
      key: "batch",
      header: t("grn.batchCol", "Batch"),
      hideBelow: "lg",
      cell: (row) =>
        row.batchNumber ? (
          <div>
            <div className="tabular">{row.batchNumber}</div>
            {row.expiryDate && (
              <div className="text-xs text-muted-foreground">{formatDate(row.expiryDate)}</div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      exportValue: (row) => row.batchNumber ?? "",
    },
    {
      key: "qty",
      header: t("pur.qty"),
      align: "right",
      cell: (row) => (
        <span className="tabular">
          {formatQuantity(row.quantity)}{" "}
          <span className="text-xs text-muted-foreground">{row.unitCode}</span>
        </span>
      ),
      exportValue: (row) => row.quantity,
    },
    {
      key: "rate",
      header: t("po.purchaseUnitRateCol"),
      align: "right",
      hideBelow: "md",
      cell: (row) => <span className="tabular">{formatCurrency(row.rate)}</span>,
      exportValue: (row) => row.rate,
    },
    {
      key: "amount",
      header: t("common.total"),
      align: "right",
      cell: (row) => formatCurrency(row.lineTotal),
      exportValue: (row) => row.lineTotal,
    },
    {
      key: "supplier",
      header: t("pur.supplier"),
      hideBelow: "md",
      cell: (row) => <div className="max-w-[180px] truncate">{row.supplierName}</div>,
      exportValue: (row) => row.supplierName,
    },
    {
      key: "status",
      header: t("common.status"),
      align: "center",
      cell: (row) => <DocumentStatusBadge status={row.status} />,
      exportValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/purchases/new?editId=${row.purchaseId}`)}
            aria-label={`Edit ${row.purchaseNumber}`}
            title={t("common.edit", "Edit")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/purchases/${row.purchaseId}/print`)}
            aria-label={`Print ${row.purchaseNumber}`}
            title={t("common.print")}
          >
            <Printer className="size-4" />
          </Button>
          {row.status !== "Cancelled" && can(Permissions.Purchase.Cancel) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => {
                setCancelling(row);
                setCancelReason("");
              }}
              aria-label={`Cancel ${row.purchaseNumber}`}
              title={t("common.cancel")}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const poColumns: DataColumn<PurchaseOrderDto>[] = [
    {
      key: "number",
      header: t("po.colOrder"),
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.orderNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.orderDate)}</div>
        </div>
      ),
      exportValue: (row) => row.orderNumber,
    },
    {
      key: "supplier",
      header: t("pur.supplier"),
      sortable: true,
      cell: (row) => <div className="max-w-[240px] truncate">{row.supplierName}</div>,
      exportValue: (row) => row.supplierName,
    },
    {
      key: "qty",
      header: t("grn.orderedQtyCol"),
      align: "right",
      hideBelow: "sm",
      cell: (row) => <span className="tabular">{formatQuantity(row.totalQty)}</span>,
      exportValue: (row) => row.totalQty,
    },
    {
      key: "amount",
      header: t("pur.estValue"),
      align: "right",
      cell: (row) => formatCurrency(row.estimatedValue),
      exportValue: (row) => row.estimatedValue,
    },
    {
      key: "expected",
      header: t("pur.expected"),
      align: "right",
      hideBelow: "lg",
      cell: (row) => (row.expectedDate ? formatDate(row.expectedDate) : "-"),
      exportValue: (row) => (row.expectedDate ? formatDate(row.expectedDate) : ""),
    },
    {
      key: "status",
      header: t("common.status"),
      align: "center",
      cell: (row) => <PurchaseOrderStatusBadge status={row.status} />,
      exportValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        canReceive ? (
          <Button
            size="sm"
            variant="neutral"
            onClick={() => router.push(`/purchases/new?poId=${row.purchaseOrderId}`)}
          >
            <PackageCheck className="mr-1.5 size-4" />
            {t("grn.receive")}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("grn.title")}
        description={t("grn.desc")}
        actions={
          canReceive ? (
            <Button variant="neutral" onClick={() => router.push("/purchases/new")}>
              <Plus className="mr-1.5 size-4" />
              {t("grn.newGrn")}
            </Button>
          ) : null
        }
      />

      {/* ------------------------------ tab switch ----------------------------- */}
      <div className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1">
        {(
          [
            { id: "pending" as Tab, label: t("grn.tabPendingOrders"), icon: ClipboardList },
            { id: "grn" as Tab, label: t("grn.title"), icon: Truck },
          ]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <DataTable
          columns={poColumns}
          result={pendingOrders.data}
          isLoading={pendingOrders.isLoading}
          isFetching={pendingOrders.isFetching}
          query={poQuery}
          onQueryChange={(next) => setPoQuery(next as PurchaseOrderQuery)}
          getRowId={(row) => row.purchaseOrderId}
          onRowClick={(row) =>
            canReceive && router.push(`/purchases/new?poId=${row.purchaseOrderId}`)
          }
          searchPlaceholder={t("pur.searchOrderNumberOrSupplier")}
          emptyMessage={t("grn.noPendingOrders")}
          exportFileName="pending-orders"
          exportTitle="Pending purchase orders"
        />
      ) : (
        <DataTable
          columns={columns}
          result={list.data}
          isLoading={list.isLoading}
          isFetching={list.isFetching}
          query={query}
          onQueryChange={(next) => setQuery(next as PurchaseQuery)}
          getRowId={(row) => row.purchaseDetailId}
          searchPlaceholder={t("grn.searchGrnOrBill")}
          emptyMessage={t("grn.empty")}
          exportFileName="purchase-grn"
          exportTitle="Purchase GRN register"
          filters={
            <>
              <Input
                type="date"
                value={query.fromDate ?? ""}
                onChange={(event) =>
                  setQuery({ ...query, fromDate: event.target.value || null, page: 1 })
                }
                className="w-[150px]"
                aria-label="From date"
              />
              <Input
                type="date"
                value={query.toDate ?? ""}
                onChange={(event) =>
                  setQuery({ ...query, toDate: event.target.value || null, page: 1 })
                }
                className="w-[150px]"
                aria-label="To date"
              />
              <Select
                value={query.status ?? ALL}
                onValueChange={(value) =>
                  setQuery({
                    ...query,
                    status: value === ALL ? null : (value as DocumentStatus),
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-[130px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("pur.allStatuses")}</SelectItem>
                  <SelectItem value="Draft">{t("pur.status.draft")}</SelectItem>
                  <SelectItem value="Posted">{t("pur.status.posted")}</SelectItem>
                  <SelectItem value="Cancelled">{t("pur.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={query.unpaidOnly ? "due" : ALL}
                onValueChange={(value) =>
                  setQuery({ ...query, unpaidOnly: value === "due" ? true : null, page: 1 })
                }
              >
                <SelectTrigger className="w-[140px]" aria-label="Filter by payable">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("grn.allBills")}</SelectItem>
                  <SelectItem value="due">{t("grn.unpaidOnly")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      )}

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title={t("pur.cancelPurchaseTitle")}
        description={
          <div className="space-y-3">
            <p>
              {cancelling?.status === "Posted"
                ? t("grn.cancelPostedDesc")
                : t("grn.cancelDraftDesc")}
            </p>
            <Textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={t("common.reasonRequired")}
              rows={2}
            />
          </div>
        }
        confirmLabel={t("pur.cancelPurchase")}
        cancelLabel={t("pur.keepIt")}
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (!cancelling || !cancelReason.trim()) return;
          try {
            await cancel.mutateAsync({ id: cancelling.purchaseId, reason: cancelReason.trim() });
            setCancelling(null);
            setCancelReason("");
          } catch {
            /* the hook shows the reason as a toast */
          }
        }}
      />
    </>
  );
}
