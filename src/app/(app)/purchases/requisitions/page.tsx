"use client";

import { useState } from "react";
import { Ban, ClipboardList, ListChecks, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  PurchaseRequisitionStatusBadge,
  StockStatusBadge,
} from "@/components/common/status-badge";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import {
  useCancelPurchaseRequisition,
  usePurchaseRequisition,
  usePurchaseRequisitionItems,
  useStockReport,
} from "@/features/transactions/hooks";
import type {
  ItemStockView,
  PurchaseRequisitionItemRow,
  PurchaseRequisitionQuery,
  PurchaseRequisitionStatus,
} from "@/features/transactions/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";
import { PurchaseRequisitionModal, type RequisitionSeed } from "./PurchaseRequisitionModal";

const ALL = "all";
type Tab = "lowstock" | "requisitions";

function suggestedQty(row: ItemStockView): number {
  const target = row.maxStockLevel > 0 ? row.maxStockLevel : row.minStockLevel;
  return Math.max(1, Math.round((target - row.currentStock) * 1000) / 1000);
}

export default function PurchaseRequisitionsPage() {
  const { can } = useAuth();
  const t = useT();

  const [tab, setTab] = useState<Tab>("lowstock");
  const [query, setQuery] = useState<PurchaseRequisitionQuery>({ page: 1, pageSize: 25 });
  const [selected, setSelected] = useState<Record<number, ItemStockView>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [seed, setSeed] = useState<RequisitionSeed[] | undefined>(undefined);
  const [editId, setEditId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseRequisitionItemRow | null>(null);

  const lowStock = useStockReport("low");
  const list = usePurchaseRequisitionItems(query);
  const editing = usePurchaseRequisition(editId);
  const cancel = useCancelPurchaseRequisition();

  const canCreate = can(Permissions.Purchase.Order);
  const selectedCount = Object.keys(selected).length;

  function toggle(row: ItemStockView, on: boolean) {
    setSelected((cur) => {
      const next = { ...cur };
      if (on) next[row.itemId] = row;
      else delete next[row.itemId];
      return next;
    });
  }

  function seedFrom(rows: ItemStockView[]): RequisitionSeed[] {
    return rows.map((r) => ({
      itemId: r.itemId,
      itemName: r.itemName,
      unitId: null,
      unitCode: r.unitCode,
      requiredQty: suggestedQty(r),
      estimatedRate: r.purchaseRate,
    }));
  }

  function createFromSelected() {
    setSeed(seedFrom(Object.values(selected)));
    setModalOpen(true);
  }

  function createBlank() {
    setSeed(undefined);
    setModalOpen(true);
  }

  // Item-wise: one row per requisition line. A 5-item requisition shows as 5
  // rows, each carrying its requisition number; editing opens the whole one.
  const reqColumns: DataColumn<PurchaseRequisitionItemRow>[] = [
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
      key: "requiredQty",
      header: t("po.requiredQtyCol", "Required Qty"),
      align: "right",
      cell: (row) => (
        <span className="tabular">
          {formatQuantity(row.requiredQty)}{" "}
          <span className="text-xs text-muted-foreground">{row.unitCode}</span>
        </span>
      ),
      exportValue: (row) => row.requiredQty,
    },
    {
      key: "estRate",
      header: t("req.estRate", "Est. Rate"),
      align: "right",
      hideBelow: "md",
      cell: (row) => <span className="tabular">{formatCurrency(row.estimatedRate)}</span>,
      exportValue: (row) => row.estimatedRate,
    },
    {
      key: "amount",
      header: t("po.totalAmountCol"),
      align: "right",
      cell: (row) => formatCurrency(row.estimatedAmount),
      exportValue: (row) => row.estimatedAmount,
    },
    {
      key: "location",
      header: t("req.location", "Location"),
      hideBelow: "md",
      cell: (row) => <span className="text-muted-foreground">{row.locationName}</span>,
      exportValue: (row) => row.locationName,
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
      cell: (row) => (
        <div className="flex justify-end gap-0.5">
          {canCreate && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setEditId(row.requisitionId)}
              aria-label={`Edit ${row.requisitionNumber}`}
              title={t("common.edit")}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {(row.status === "Open" || row.status === "Partial") && canCreate && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => setCancelling(row)}
              aria-label={`Cancel ${row.requisitionNumber}`}
              title={t("common.cancel")}
            >
              <Ban className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("req.title")}
        description={t("req.desc")}
        actions={
          canCreate ? (
            <Button variant="neutral" onClick={createBlank}>
              <Plus className="mr-1.5 size-4" />
              {t("req.newRequisition")}
            </Button>
          ) : null
        }
      />

      {/* ------------------------------ tab switch ----------------------------- */}
      <div className="mb-4 inline-flex rounded-lg border bg-muted/40 p-1">
        {(
          [
            { id: "lowstock" as Tab, label: t("req.tabLowStock"), icon: ListChecks },
            { id: "requisitions" as Tab, label: t("req.tabRequisitions"), icon: ClipboardList },
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

      {tab === "lowstock" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {t("req.lowStockDesc")}
            </p>
            {canCreate && (
              <Button onClick={createFromSelected} disabled={selectedCount === 0}>
                <Plus className="mr-1.5 size-4" />
                {t("req.createRequisition")} ({selectedCount})
              </Button>
            )}
          </div>

          {lowStock.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg border bg-muted/30" />
          ) : (lowStock.data ?? []).length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              {t("req.nothingLowStock")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 text-left font-medium">{t("pur.item")}</th>
                    <th className="px-3 py-2 text-left font-medium">{t("req.subGroup")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("req.current")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("req.min")}</th>
                    <th className="px-2 py-2 text-left font-medium">{t("req.unit")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("req.suggested")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("req.estRate")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("req.stockCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(lowStock.data ?? []).map((row) => (
                    <tr key={row.itemId} className="border-t">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={!!selected[row.itemId]}
                          onCheckedChange={(v) => toggle(row, v === true)}
                          aria-label={`Select ${row.itemName}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.itemName}</div>
                        <div className="text-xs text-muted-foreground">{row.itemCode}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.itemSubGroupName}</td>
                      <td className="px-2 py-2 text-right tabular">{formatQuantity(row.currentStock)}</td>
                      <td className="px-2 py-2 text-right tabular text-muted-foreground">
                        {formatQuantity(row.minStockLevel)}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{row.unitCode}</td>
                      <td className="px-2 py-2 text-right tabular font-medium">
                        {formatQuantity(suggestedQty(row))}
                      </td>
                      <td className="px-2 py-2 text-right tabular">{formatCurrency(row.purchaseRate)}</td>
                      <td className="px-2 py-2 text-center">
                        <StockStatusBadge status={row.stockStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={reqColumns}
          result={list.data}
          isLoading={list.isLoading}
          isFetching={list.isFetching}
          query={query}
          onQueryChange={(next) => setQuery(next as PurchaseRequisitionQuery)}
          getRowId={(row) => row.requisitionDetailId}
          searchPlaceholder={t("req.searchPlaceholder")}
          emptyMessage={t("req.empty")}
          exportFileName="purchase-requisitions"
          exportTitle="Purchase requisitions"
          filters={
            <>
              <Input
                type="date"
                value={query.fromDate ?? ""}
                onChange={(e) => setQuery({ ...query, fromDate: e.target.value || null, page: 1 })}
                className="w-[150px]"
                aria-label="From date"
              />
              <Input
                type="date"
                value={query.toDate ?? ""}
                onChange={(e) => setQuery({ ...query, toDate: e.target.value || null, page: 1 })}
                className="w-[150px]"
                aria-label="To date"
              />
              <Select
                value={query.status ?? ALL}
                onValueChange={(value) =>
                  setQuery({
                    ...query,
                    status: value === ALL ? null : (value as PurchaseRequisitionStatus),
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-[150px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("pur.allStatuses")}</SelectItem>
                  <SelectItem value="Open">{t("pur.status.open")}</SelectItem>
                  <SelectItem value="Partial">{t("pur.status.partial")}</SelectItem>
                  <SelectItem value="Converted">{t("pur.status.converted")}</SelectItem>
                  <SelectItem value="Cancelled">{t("pur.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      )}

      <PurchaseRequisitionModal open={modalOpen} onOpenChange={setModalOpen} seed={seed} />

      {/* Edit re-uses the same full-screen form, pre-loaded once the lines arrive. */}
      <PurchaseRequisitionModal
        open={editId != null && !!editing.data}
        editModel={editing.data ?? null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      />

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={t("req.cancelTitle")}
        description={
          <p>
            <strong>{cancelling?.requisitionNumber}</strong> {t("req.cancelDesc")}
          </p>
        }
        confirmLabel={t("req.cancelRequisition")}
        cancelLabel={t("pur.keepIt")}
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (!cancelling) return;
          try {
            await cancel.mutateAsync(cancelling.requisitionId);
            setCancelling(null);
          } catch {
            /* the hook shows the reason */
          }
        }}
      />
    </>
  );
}
