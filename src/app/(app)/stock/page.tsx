"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { DocumentStatusBadge, ExpiryBadge } from "@/components/common/status-badge";
import { Field, FieldGrid, FormDialog } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { useAuth } from "@/features/auth/auth-context";
import {
  useAdjustments,
  useBatchStock,
  useCreateAdjustment,
  useCreateTransfer,
  usePostAdjustment,
  usePostTransfer,
  useStockLedger,
  useStorageLocations,
  useTransfers,
} from "@/features/transactions/hooks";
import type {
  AdjustmentType,
  BatchStockView,
  StockAdjustmentDto,
  StockDocumentQuery,
  StockLedgerLineDto,
  StockLedgerQuery,
  StockTransferDto,
} from "@/features/transactions/types";
import { itemHooks } from "@/features/masters/hooks";
import type { ItemListDto } from "@/features/masters/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatCurrency, formatDate, formatDateTime, formatQuantity, toIsoDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";
import { VerificationTab } from "./verification-tab";

export default function StockPage() {
  const { can } = useAuth();
  const t = useT();

  return (
    <>
      <PageHeader
        title={t("stock.title")}
        description={t("stock.desc")}
      />

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">{t("stock.tabLedger")}</TabsTrigger>
          <TabsTrigger value="batches">{t("stock.tabBatches")}</TabsTrigger>
          <TabsTrigger value="verification">{t("stock.tabVerification")}</TabsTrigger>
          <TabsTrigger value="adjustments">{t("stock.tabAdjustments")}</TabsTrigger>
          <TabsTrigger value="transfers">{t("stock.tabTransfers")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <LedgerTab />
        </TabsContent>
        <TabsContent value="batches" className="mt-4">
          <BatchesTab />
        </TabsContent>
        <TabsContent value="verification" className="mt-4">
          <VerificationTab canAdjust={can(Permissions.Stock.Adjust)} />
        </TabsContent>
        <TabsContent value="adjustments" className="mt-4">
          <AdjustmentsTab canAdjust={can(Permissions.Stock.Adjust)} canPost={can(Permissions.Stock.Post)} />
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <TransfersTab canTransfer={can(Permissions.Stock.Transfer)} canPost={can(Permissions.Stock.Post)} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ================================ ledger ================================= */

function LedgerTab() {
  const t = useT();
  const [query, setQuery] = useState<StockLedgerQuery>({ page: 1, pageSize: 25 });
  const ledger = useStockLedger(query);

  const columns: DataColumn<StockLedgerLineDto>[] = [
    {
      key: "date",
      header: t("stock.when"),
      cell: (row) => (
        <div className="whitespace-nowrap text-sm">
          <div>{formatDate(row.transactionDate)}</div>
          <div className="text-xs text-muted-foreground">{row.transactionTypeName}</div>
        </div>
      ),
      exportValue: (row) => formatDateTime(row.transactionDate),
    },
    {
      key: "item",
      header: t("stock.item"),
      cell: (row) => (
        <div className="min-w-0 max-w-[240px]">
          <div className="truncate">{row.itemName}</div>
          <div className="truncate text-xs text-muted-foreground">
            {row.batchNumber}
            {row.expiryDate && ` · exp ${formatDate(row.expiryDate)}`}
          </div>
        </div>
      ),
      exportValue: (row) => row.itemName,
    },
    {
      key: "ref",
      header: t("stock.reference"),
      hideBelow: "lg",
      cell: (row) => row.referenceNumber ?? "-",
      exportValue: (row) => row.referenceNumber ?? "",
    },
    {
      key: "in",
      header: t("stock.in"),
      align: "right",
      cell: (row) =>
        row.inwardQty > 0 ? (
          <span className="text-primary">{formatQuantity(row.inwardQty)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      exportValue: (row) => row.inwardQty,
    },
    {
      key: "out",
      header: t("stock.out"),
      align: "right",
      cell: (row) =>
        row.outwardQty > 0 ? (
          <span className="text-destructive">{formatQuantity(row.outwardQty)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      exportValue: (row) => row.outwardQty,
    },
    {
      key: "balance",
      header: t("stock.balance"),
      align: "right",
      cell: (row) => (
        <span className="font-medium">
          {formatQuantity(row.runningBalance)}{" "}
          <span className="text-xs text-muted-foreground">{row.unitCode}</span>
        </span>
      ),
      exportValue: (row) => row.runningBalance,
    },
  ];

  return (
    <DataTable
      columns={columns}
      result={ledger.data}
      isLoading={ledger.isLoading}
      isFetching={ledger.isFetching}
      query={query}
      onQueryChange={(next) => setQuery(next as StockLedgerQuery)}
      getRowId={(row) => row.stockTransactionId}
      searchPlaceholder={t("stock.searchByFilters")}
      emptyMessage={t("stock.noMovements")}
      exportFileName="stock-ledger"
      exportTitle={t("stock.ledgerExportTitle")}
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
        </>
      }
    />
  );
}

/* ================================ batches ================================ */

function BatchesTab() {
  const t = useT();
  const batches = useBatchStock();
  const [query, setQuery] = useState({ page: 1, pageSize: 25 });

  const rows = batches.data ?? [];
  const paged = {
    items: rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    totalCount: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / query.pageSize)),
    hasPrevious: query.page > 1,
    hasNext: query.page * query.pageSize < rows.length,
  };

  const columns: DataColumn<BatchStockView>[] = [
    {
      key: "item",
      header: t("stock.item"),
      cell: (row) => (
        <div className="min-w-0 max-w-[260px]">
          <div className="truncate">{row.itemName}</div>
          <div className="truncate text-xs text-muted-foreground">{row.itemSubGroupName}</div>
        </div>
      ),
      exportValue: (row) => row.itemName,
    },
    {
      key: "batch",
      header: t("stock.batch"),
      cell: (row) => row.batchNumber,
      exportValue: (row) => row.batchNumber,
    },
    {
      key: "location",
      header: t("stock.location"),
      hideBelow: "lg",
      cell: (row) => row.locationName,
      exportValue: (row) => row.locationName,
    },
    {
      key: "expiry",
      header: t("stock.expiry"),
      cell: (row) => (
        <div className="whitespace-nowrap text-sm">
          <div>{row.expiryDate ? formatDate(row.expiryDate) : "-"}</div>
          <ExpiryBadge status={row.expiryStatus} days={row.daysToExpiry} />
        </div>
      ),
      exportValue: (row) => (row.expiryDate ? formatDate(row.expiryDate) : ""),
    },
    {
      key: "qty",
      header: t("stock.onHand"),
      align: "right",
      cell: (row) => (
        <span className="font-medium">
          {formatQuantity(row.currentQty)}{" "}
          <span className="text-xs text-muted-foreground">{row.unitCode}</span>
        </span>
      ),
      exportValue: (row) => row.currentQty,
    },
    {
      key: "cost",
      header: t("stock.cost"),
      align: "right",
      hideBelow: "md",
      cell: (row) => formatCurrency(row.purchaseRate),
      exportValue: (row) => row.purchaseRate,
    },
    {
      key: "value",
      header: t("stock.value"),
      align: "right",
      cell: (row) => formatCurrency(row.stockValueAtCost),
      exportValue: (row) => row.stockValueAtCost,
    },
  ];

  return (
    <DataTable
      columns={columns}
      result={paged}
      isLoading={batches.isLoading}
      query={query}
      onQueryChange={(next) => setQuery({ page: next.page ?? 1, pageSize: next.pageSize ?? 25 })}
      getRowId={(row) => row.batchId}
      emptyMessage={t("stock.noBatches")}
      exportFileName="batch-stock"
      exportTitle={t("stock.batchExportTitle")}
    />
  );
}

/* ============================== adjustments ============================== */

interface AdjustmentLine {
  key: string;
  batch: BatchStockView;
  physicalQty: number;
  reason: string;
}

function AdjustmentsTab({ canAdjust, canPost }: { canAdjust: boolean; canPost: boolean }) {
  const t = useT();
  const [query, setQuery] = useState<StockDocumentQuery>({ page: 1, pageSize: 25 });
  const [formOpen, setFormOpen] = useState(false);
  const [adjustmentDate, setAdjustmentDate] = useState(toIsoDate(new Date()));
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("Physical");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<AdjustmentLine[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemListDto | null>(null);
  const debItemSearch = useDebouncedValue(itemSearch);

  const list = useAdjustments(query);
  const allBatches = useBatchStock();
  const items = itemHooks.useList({ page: 1, pageSize: 50, search: debItemSearch || undefined });
  const create = useCreateAdjustment();
  const post = usePostAdjustment();

  function addLineFromBatch(batch: BatchStockView) {
    if (lines.some((line) => line.batch.batchId === batch.batchId)) return;
    // Seeded with the system figure, so an unchanged row is a zero-variance line
    // rather than an accidental write-off.
    setLines((current) => [
      ...current,
      { key: `${batch.batchId}`, batch, physicalQty: batch.currentQty, reason: "" },
    ]);
  }

  const columns: DataColumn<StockAdjustmentDto>[] = [
    {
      key: "number",
      header: t("stock.adjustment"),
      cell: (row) => (
        <div>
          <div className="font-medium">{row.adjustmentNumber}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.adjustmentDate)} · {t(`stock.adjType.${row.adjustmentType.toLowerCase()}`, row.adjustmentType)}
          </div>
        </div>
      ),
      exportValue: (row) => row.adjustmentNumber,
    },
    {
      key: "reason",
      header: t("stock.reason"),
      hideBelow: "md",
      cell: (row) => row.reason ?? "-",
      exportValue: (row) => row.reason ?? "",
    },
    {
      key: "increase",
      header: t("stock.increase"),
      align: "right",
      cell: (row) => formatQuantity(row.totalIncreaseQty),
      exportValue: (row) => row.totalIncreaseQty,
    },
    {
      key: "decrease",
      header: t("stock.decrease"),
      align: "right",
      cell: (row) => formatQuantity(row.totalDecreaseQty),
      exportValue: (row) => row.totalDecreaseQty,
    },
    {
      key: "value",
      header: t("stock.valueImpact"),
      align: "right",
      hideBelow: "lg",
      cell: (row) => formatCurrency(row.totalValueImpact),
      exportValue: (row) => row.totalValueImpact,
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
      cell: (row) =>
        row.status === "Draft" && canPost ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => post.mutate(row.adjustmentId)}
            disabled={post.isPending}
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {t("stock.post")}
          </Button>
        ) : null,
    },
  ];

  async function save() {
    if (lines.length === 0) {
      toast.error(t("stock.addBatchToCount"));
      return;
    }
    try {
      await create.mutateAsync({
        adjustmentDate,
        adjustmentType,
        reason: reason || null,
        lines: lines.map((line) => ({
          batchId: line.batch.batchId,
          physicalQty: line.physicalQty,
          reason: line.reason || null,
        })),
      });
      setFormOpen(false);
      setLines([]);
      setReason("");
      setSelectedItem(null);
      setItemSearch("");
    } catch {
      /* toast already shown */
    }
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        {canAdjust && (
          <Button variant="neutral" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            {t("stock.newAdjustment")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        result={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        query={query}
        onQueryChange={(next) => setQuery(next as StockDocumentQuery)}
        getRowId={(row) => row.adjustmentId}
        searchPlaceholder={t("stock.searchAdjustment")}
        emptyMessage={t("stock.noAdjustments")}
        exportFileName="stock-adjustments"
        exportTitle={t("stock.adjustmentsExportTitle")}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t("stock.newAdjustmentTitle")}
        description={t("stock.adjustmentFormDesc")}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        isPending={create.isPending}
        submitLabel={t("stock.saveDraft")}
        size="3xl"
      >
        <FieldGrid columns={3}>
          <Field label={t("common.date")} htmlFor="adjDate">
            <Input
              id="adjDate"
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
            />
          </Field>
          <Field label={t("stock.type")}>
            <Select
              value={adjustmentType}
              onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Physical">{t("stock.physicalCount")}</SelectItem>
                <SelectItem value="Damage">{t("stock.damage")}</SelectItem>
                <SelectItem value="Expiry">{t("stock.expiryWriteOff")}</SelectItem>
                <SelectItem value="Other">{t("stock.other")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("stock.reason")} htmlFor="adjReason">
            <Input id="adjReason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </FieldGrid>

        {/* Pick an item from the grid, then click one of its batches to count it. */}
        <div className="space-y-2">
          <Input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder={t("item.search")}
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("sale.item")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("item.subGroup")}</th>
                  <th className="px-2 py-2 text-center font-medium">{t("bill.unit")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("stock.onHand")}</th>
                </tr>
              </thead>
              <tbody>
                {(items.data?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-16 px-3 text-center align-middle text-muted-foreground">
                      {t("item.empty")}
                    </td>
                  </tr>
                ) : (
                  (items.data?.items ?? []).map((it) => (
                    <tr
                      key={it.itemId}
                      className={`cursor-pointer border-t hover:bg-muted/40 ${selectedItem?.itemId === it.itemId ? "bg-muted/60" : ""}`}
                      onClick={() => setSelectedItem(it)}
                    >
                      <td className="px-3 py-2">
                        <div className="max-w-[260px] truncate font-medium">{it.itemName}</div>
                        <div className="text-xs text-muted-foreground">{it.itemCode}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{it.itemSubGroupName}</td>
                      <td className="px-2 py-2 text-center text-muted-foreground">{it.unitCode}</td>
                      <td className="px-3 py-2 text-right tabular">{it.currentStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedItem && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("verify.clickBatchHint")}</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t("verify.batchNo")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("stock.location")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("stock.onHand")}</th>
                      <th className="px-3 py-2 text-left font-medium">{t("stock.expiry")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(allBatches.data ?? []).filter((b) => b.itemId === selectedItem.itemId).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="h-14 px-3 text-center align-middle text-muted-foreground">
                          {t("verify.noBatchStock")}
                        </td>
                      </tr>
                    ) : (
                      (allBatches.data ?? [])
                        .filter((b) => b.itemId === selectedItem.itemId)
                        .map((b) => (
                          <tr
                            key={b.batchId}
                            className="cursor-pointer border-t hover:bg-muted/40"
                            onClick={() => addLineFromBatch(b)}
                          >
                            <td className="px-3 py-2 font-medium">{b.batchNumber}</td>
                            <td className="px-3 py-2 text-muted-foreground">{b.locationName}</td>
                            <td className="px-3 py-2 text-right tabular">{formatQuantity(b.currentQty)} {b.unitCode}</td>
                            <td className="px-3 py-2">{b.expiryDate ? formatDate(b.expiryDate) : "-"}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("stock.itemBatch")}</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">{t("stock.system")}</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">{t("stock.counted")}</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">{t("stock.variance")}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const variance = line.physicalQty - line.batch.currentQty;
                  return (
                    <tr key={line.key} className="border-t">
                      <td className="px-3 py-2">
                        <div className="max-w-[240px] truncate">{line.batch.itemName}</div>
                        <div className="text-xs text-muted-foreground">
                          {line.batch.batchNumber}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular text-muted-foreground">
                        {formatQuantity(line.batch.currentQty)}
                      </td>
                      <td className="px-2 py-2">
                        <Input
                          type="number" min={0} step="0.001"
                          value={line.physicalQty}
                          onChange={(e) =>
                            setLines((current) =>
                              current.map((l) =>
                                l.key === line.key
                                  ? { ...l, physicalQty: Number(e.target.value) }
                                  : l,
                              ),
                            )
                          }
                          className="h-8 text-right tabular"
                          aria-label={`Counted quantity for ${line.batch.itemName}`}
                        />
                      </td>
                      <td
                        className={`px-2 py-2 text-right tabular font-medium ${
                          variance < 0 ? "text-destructive" : variance > 0 ? "text-primary" : ""
                        }`}
                      >
                        {variance > 0 ? "+" : ""}
                        {formatQuantity(variance)}
                      </td>
                      <td className="px-1 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setLines((current) => current.filter((l) => l.key !== line.key))
                          }
                          aria-label="Remove line"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {t("stock.systemFigureHint")}
        </p>
      </FormDialog>
    </>
  );
}

/* =============================== transfers =============================== */

function TransfersTab({ canTransfer, canPost }: { canTransfer: boolean; canPost: boolean }) {
  const t = useT();
  const [query, setQuery] = useState<StockDocumentQuery>({ page: 1, pageSize: 25 });
  const [formOpen, setFormOpen] = useState(false);
  const [transferDate, setTransferDate] = useState(toIsoDate(new Date()));
  const [fromLocationId, setFromLocationId] = useState<number | null>(null);
  const [toLocationId, setToLocationId] = useState<number | null>(null);
  const [lines, setLines] = useState<{ key: string; batch: BatchStockView; quantity: number }[]>([]);
  const [batchSearch, setBatchSearch] = useState("");

  const list = useTransfers(query);
  const locations = useStorageLocations();
  const fromBatches = useBatchStock(null, fromLocationId);
  const create = useCreateTransfer();
  const post = usePostTransfer();

  const batchOptions: SearchPickerOption[] = (fromBatches.data ?? [])
    .filter((batch) =>
      `${batch.itemName} ${batch.batchNumber}`.toLowerCase().includes(batchSearch.toLowerCase()),
    )
    .slice(0, 30)
    .map((batch) => ({
      id: batch.batchId,
      primary: batch.itemName,
      secondary: batch.batchNumber,
      trailing: `${formatQuantity(batch.currentQty)} ${batch.unitCode}`,
    }));

  const columns: DataColumn<StockTransferDto>[] = [
    {
      key: "number",
      header: t("stock.transfer"),
      cell: (row) => (
        <div>
          <div className="font-medium">{row.transferNumber}</div>
          <div className="text-xs text-muted-foreground">{formatDate(row.transferDate)}</div>
        </div>
      ),
      exportValue: (row) => row.transferNumber,
    },
    {
      key: "route",
      header: t("stock.fromTo"),
      cell: (row) => (
        <span className="text-sm">
          {row.fromLocationName} → {row.toLocationName}
        </span>
      ),
      exportValue: (row) => `${row.fromLocationName} to ${row.toLocationName}`,
    },
    {
      key: "qty",
      header: t("stock.quantity"),
      align: "right",
      cell: (row) => formatQuantity(row.totalQty),
      exportValue: (row) => row.totalQty,
    },
    {
      key: "value",
      header: t("stock.value"),
      align: "right",
      hideBelow: "md",
      cell: (row) => formatCurrency(row.totalValue),
      exportValue: (row) => row.totalValue,
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
      cell: (row) =>
        row.status === "Draft" && canPost ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => post.mutate(row.transferId)}
            disabled={post.isPending}
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {t("stock.post")}
          </Button>
        ) : null,
    },
  ];

  async function save() {
    if (fromLocationId == null || toLocationId == null) {
      toast.error(t("stock.pickBothLocations"));
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error(t("stock.sourceDestDiffer"));
      return;
    }
    if (lines.length === 0) {
      toast.error(t("stock.addAtLeastOneBatch"));
      return;
    }
    try {
      await create.mutateAsync({
        transferDate,
        fromLocationId,
        toLocationId,
        lines: lines.map((line) => ({ fromBatchId: line.batch.batchId, quantity: line.quantity })),
      });
      setFormOpen(false);
      setLines([]);
    } catch {
      /* toast already shown */
    }
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        {canTransfer && (
          <Button variant="neutral" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            {t("stock.newTransfer")}
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        result={list.data}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        query={query}
        onQueryChange={(next) => setQuery(next as StockDocumentQuery)}
        getRowId={(row) => row.transferId}
        searchPlaceholder={t("stock.searchTransfer")}
        emptyMessage={t("stock.noTransfers")}
        exportFileName="stock-transfers"
        exportTitle={t("stock.transfersExportTitle")}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={t("stock.newTransferTitle")}
        description={t("stock.transferFormDesc")}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        isPending={create.isPending}
        submitLabel={t("stock.saveDraft")}
        size="lg"
      >
        <FieldGrid columns={3}>
          <Field label={t("common.date")} htmlFor="trfDate">
            <Input
              id="trfDate"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </Field>
          <Field label={t("stock.from")} required>
            <Select
              value={fromLocationId ? String(fromLocationId) : ""}
              onValueChange={(v) => {
                setFromLocationId(Number(v));
                // Batches belong to a location, so changing the source
                // invalidates every line already picked.
                setLines([]);
              }}
            >
              <SelectTrigger><SelectValue placeholder={t("stock.source")} /></SelectTrigger>
              <SelectContent>
                {(locations.data ?? []).map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("stock.to")} required>
            <Select
              value={toLocationId ? String(toLocationId) : ""}
              onValueChange={(v) => setToLocationId(Number(v))}
            >
              <SelectTrigger><SelectValue placeholder={t("stock.destination")} /></SelectTrigger>
              <SelectContent>
                {(locations.data ?? [])
                  .filter((location) => location.id !== fromLocationId)
                  .map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGrid>

        <Field label={t("stock.addBatch")} hint={fromLocationId ? undefined : t("stock.pickSourceFirst")}>
          <SearchPicker
            value={batchSearch}
            onValueChange={setBatchSearch}
            options={fromLocationId ? batchOptions : []}
            placeholder={t("stock.searchItemOrBatch")}
            emptyMessage={fromLocationId ? t("stock.noBatchFound") : t("stock.pickSourceFirst")}
            onSelect={(option) => {
              const batch = fromBatches.data?.find((b) => b.batchId === option.id);
              if (!batch || lines.some((l) => l.batch.batchId === batch.batchId)) return;
              setLines((current) => [
                ...current,
                { key: String(batch.batchId), batch, quantity: batch.currentQty },
              ]);
              setBatchSearch("");
            }}
          />
        </Field>

        {lines.length > 0 && (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="max-w-[260px] truncate">{line.batch.itemName}</div>
                      <div className="text-xs text-muted-foreground">
                        {line.batch.batchNumber} · {formatQuantity(line.batch.currentQty)} {t("stock.available")}
                      </div>
                    </td>
                    <td className="w-32 px-2 py-2">
                      <Input
                        type="number" min={0} max={line.batch.currentQty} step="0.001"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines((current) =>
                            current.map((l) =>
                              l.key === line.key ? { ...l, quantity: Number(e.target.value) } : l,
                            ),
                          )
                        }
                        className="h-8 text-right tabular"
                        aria-label={`Quantity for ${line.batch.itemName}`}
                      />
                    </td>
                    <td className="w-10 px-1 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setLines((current) => current.filter((l) => l.key !== line.key))
                        }
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormDialog>
    </>
  );
}
