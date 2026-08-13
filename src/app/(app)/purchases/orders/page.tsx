"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, FileText, PackageCheck, Pencil, Plus, Printer, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import {
  PurchaseOrderStatusBadge,
  PurchaseRequisitionStatusBadge,
} from "@/components/common/status-badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import { usePurchaseOrderItems, usePurchaseRequisitions } from "@/features/transactions/hooks";
import type {
  PurchaseOrderItemRow,
  PurchaseOrderQuery,
  PurchaseOrderStatus,
  PurchaseRequisitionDto,
  PurchaseRequisitionQuery,
} from "@/features/transactions/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

const ALL = "all";
type Tab = "pending" | "orders";

export default function PurchaseOrdersPage() {
  const { can } = useAuth();
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState<PurchaseOrderQuery>({ page: 1, pageSize: 25 });
  const [reqQuery, setReqQuery] = useState<PurchaseRequisitionQuery>({
    page: 1,
    pageSize: 25,
    pendingOnly: true,
  });

  const list = usePurchaseOrderItems(query);
  const pendingReqs = usePurchaseRequisitions(reqQuery);
  const canCreate = can(Permissions.Purchase.Order);

  // Item-wise: one row per order line. A 5-item order shows as 5 rows, each
  // carrying its PO number; opening any row shows the whole order.
  const orderColumns: DataColumn<PurchaseOrderItemRow>[] = [
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
      key: "itemCode",
      header: t("po.itemCodeCol"),
      cell: (row) => <span className="tabular text-muted-foreground">{row.itemCode || "-"}</span>,
      exportValue: (row) => row.itemCode,
    },
    {
      key: "itemName",
      header: t("po.itemNameCol"),
      cell: (row) => <div className="max-w-[220px] truncate font-medium">{row.itemName}</div>,
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
      key: "qty",
      header: t("pur.qty"),
      align: "right",
      cell: (row) => (
        <span className="tabular">
          {formatQuantity(row.orderedQty)}{" "}
          <span className="text-xs text-muted-foreground">{row.unitCode}</span>
        </span>
      ),
      exportValue: (row) => row.orderedQty,
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
      header: t("po.totalAmountCol"),
      align: "right",
      cell: (row) => formatCurrency(row.estimatedAmount),
      exportValue: (row) => row.estimatedAmount,
    },
    {
      key: "supplier",
      header: t("pur.supplier"),
      hideBelow: "md",
      cell: (row) => <div className="max-w-[200px] truncate">{row.supplierName}</div>,
      exportValue: (row) => row.supplierName,
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
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/purchases/orders/new?editId=${row.purchaseOrderId}`)}
            aria-label={`Edit ${row.orderNumber}`}
            title={t("common.edit", "Edit")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => router.push(`/purchases/orders/${row.purchaseOrderId}/print`)}
            aria-label={`Print ${row.orderNumber}`}
            title={t("common.print")}
          >
            <Printer className="size-4" />
          </Button>
          {(row.status === "Open" || row.status === "Partial") && can(Permissions.Purchase.Create) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => router.push(`/purchases/new?poId=${row.purchaseOrderId}`)}
              aria-label={`Receive against ${row.orderNumber}`}
              title={t("po.receiveGoods")}
            >
              <PackageCheck className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const reqColumns: DataColumn<PurchaseRequisitionDto>[] = [
    {
      key: "number",
      header: t("req.colRequisition"),
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium">{row.requisitionNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.requisitionDate)}</div>
        </div>
      ),
      exportValue: (row) => row.requisitionNumber,
    },
    {
      key: "location",
      header: t("req.location"),
      hideBelow: "md",
      cell: (row) => <span className="text-muted-foreground">{row.locationName}</span>,
      exportValue: (row) => row.locationName,
    },
    {
      key: "qty",
      header: t("req.totalQtyCol"),
      align: "right",
      cell: (row) => <span className="tabular">{formatQuantity(row.totalQty)}</span>,
      exportValue: (row) => row.totalQty,
    },
    {
      key: "status",
      header: t("common.status"),
      align: "center",
      cell: (row) => <PurchaseRequisitionStatusBadge status={row.status} />,
      exportValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) =>
        canCreate ? (
          <Button
            size="sm"
            variant="neutral"
            onClick={() => router.push(`/purchases/orders/new?reqId=${row.requisitionId}`)}
          >
            <ShoppingCart className="mr-1.5 size-4" />
            {t("po.createPo")}
          </Button>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("po.title")}
        description={t("po.desc")}
        actions={
          canCreate ? (
            <Button variant="neutral" onClick={() => router.push("/purchases/orders/new")}>
              <Plus className="mr-1.5 size-4" />
              {t("po.newOrder")}
            </Button>
          ) : null
        }
      />

      {/* ------------------------------ tab switch ----------------------------- */}
      <div className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1">
        {(
          [
            { id: "pending" as Tab, label: t("po.tabPendingReq"), icon: FileText },
            { id: "orders" as Tab, label: t("po.tabOrders"), icon: ClipboardList },
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
          columns={reqColumns}
          result={pendingReqs.data}
          isLoading={pendingReqs.isLoading}
          isFetching={pendingReqs.isFetching}
          query={reqQuery}
          onQueryChange={(next) => setReqQuery(next as PurchaseRequisitionQuery)}
          getRowId={(row) => row.requisitionId}
          onRowClick={(row) =>
            canCreate && router.push(`/purchases/orders/new?reqId=${row.requisitionId}`)
          }
          searchPlaceholder={t("req.searchPlaceholder")}
          emptyMessage={t("po.noPendingReqs")}
          exportFileName="pending-requisitions"
          exportTitle="Pending requisitions"
        />
      ) : (
        <DataTable
          columns={orderColumns}
          result={list.data}
          isLoading={list.isLoading}
          isFetching={list.isFetching}
          query={query}
          onQueryChange={(next) => setQuery(next as PurchaseOrderQuery)}
          getRowId={(row) => row.purchaseOrderDetailId}
          searchPlaceholder={t("pur.searchOrderNumberOrSupplier")}
          emptyMessage={t("po.empty")}
          exportFileName="purchase-orders"
          exportTitle="Purchase orders"
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
                    status: value === ALL ? null : (value as PurchaseOrderStatus),
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("pur.allStatuses")}</SelectItem>
                  <SelectItem value="Open">{t("pur.status.open")}</SelectItem>
                  <SelectItem value="Partial">{t("pur.status.partial")}</SelectItem>
                  <SelectItem value="Received">{t("pur.status.received")}</SelectItem>
                  <SelectItem value="Cancelled">{t("pur.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      )}
    </>
  );
}
