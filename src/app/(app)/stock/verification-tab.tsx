"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/common/form-dialog";
import { DataTable, type DataColumn } from "@/components/data-table/data-table";
import { StockStatusBadge } from "@/components/common/status-badge";
import { itemHooks, warehouseHooks } from "@/features/masters/hooks";
import {
  useBatchStock,
  useCreateAdjustment,
  usePostAdjustment,
  useStorageLocations,
} from "@/features/transactions/hooks";
import type { ItemListDto, ItemQuery } from "@/features/masters/types";
import type { SaveStockAdjustmentLine } from "@/features/transactions/types";
import { useT } from "@/features/i18n/provider";
import { formatCurrency, formatDate, toIsoDate } from "@/lib/format";

interface Line {
  key: string;
  itemId: number;
  itemName: string;
  unitCode: string;
  batchNumber: string;
  warehouseId: number | null;
  warehouseName: string;
  binName: string;
  physicalQty: number;
  rate: number;
  isNew: boolean;
}

export function VerificationTab({ canAdjust }: { canAdjust: boolean }) {
  const t = useT();

  const [date, setDate] = useState(toIsoDate(new Date()));
  const [query, setQuery] = useState<ItemQuery>({ page: 1, pageSize: 25 });
  const [selected, setSelected] = useState<ItemListDto | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);

  // entry form
  const [batchNo, setBatchNo] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [binName, setBinName] = useState("");
  const [physicalQty, setPhysicalQty] = useState(0);
  const [rate, setRate] = useState(0);
  const [isNew, setIsNew] = useState(false);

  const [lines, setLines] = useState<Line[]>([]);

  const items = itemHooks.useList(query);
  const batches = useBatchStock(selected?.itemId ?? undefined);
  const locations = useStorageLocations();
  const warehouses = warehouseHooks.useLookup();
  const warehouseDetail = warehouseHooks.useOne(warehouseId);
  const create = useCreateAdjustment();
  const post = usePostAdjustment();

  // Default the stock location to the first one once it loads.
  useEffect(() => {
    if (locationId == null && locations.data && locations.data.length > 0) {
      setLocationId(locations.data[0].id);
    }
  }, [locations.data, locationId]);

  function selectItem(row: ItemListDto) {
    setSelected(row);
    setBatchNo("");
    setWarehouseId(null);
    setBinName("");
    setPhysicalQty(0);
    setRate(row.purchaseRate ?? 0);
    setIsNew(false);
  }

  function addLine() {
    if (!selected) {
      toast.error(t("verify.needItem"));
      return;
    }
    const bn = batchNo.trim() || "GEN";
    const matched = (batches.data ?? []).find(
      (b) => b.itemId === selected.itemId && b.batchNumber === bn,
    );
    // Counting an existing batch may be zero (all gone). Adding brand-new stock
    // must be a positive quantity. A count is never negative.
    const existingCount = !isNew && !!matched;
    if (physicalQty < 0 || (!existingCount && physicalQty <= 0)) {
      toast.error(t("verify.needQty"));
      return;
    }
    const wh = (warehouses.data ?? []).find((w) => w.id === warehouseId);
    setLines((current) => [
      ...current,
      {
        key: `${selected.itemId}-${bn}-${current.length}-${physicalQty}`,
        itemId: selected.itemId,
        itemName: selected.itemName,
        unitCode: selected.unitCode,
        batchNumber: bn,
        warehouseId,
        warehouseName: wh?.name ?? "",
        binName: binName.trim(),
        physicalQty,
        rate: isNew ? rate : 0,
        isNew,
      },
    ]);
    // Ready for the next count on the same item.
    setBatchNo("");
    setPhysicalQty(0);
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((l) => l.key !== key));
  }

  async function save() {
    if (lines.length === 0) {
      toast.error(t("verify.needLine"));
      return;
    }
    const body = {
      adjustmentDate: date,
      adjustmentType: "Physical" as const,
      locationId,
      remarks: null,
      lines: lines.map<SaveStockAdjustmentLine>((l) => ({
        batchId: null,
        itemId: l.itemId,
        batchNumber: l.batchNumber,
        rate: l.isNew ? l.rate : 0,
        warehouseId: l.warehouseId,
        binName: l.binName || null,
        physicalQty: l.physicalQty,
      })),
    };
    try {
      const adj = await create.mutateAsync(body);
      await post.mutateAsync(adj.adjustmentId);
      toast.success(t("verify.savedToast"));
      setLines([]);
      setSelected(null);
    } catch {
      /* the hooks surface the reason */
    }
  }

  const itemColumns: DataColumn<ItemListDto>[] = [
    { key: "code", header: t("co.code"), sortable: true, hideBelow: "md", cell: (r) => <span className="font-medium">{r.itemCode}</span>, exportValue: (r) => r.itemCode },
    { key: "name", header: t("sale.item"), sortable: true, cell: (r) => <span className="truncate">{r.itemName}</span>, exportValue: (r) => r.itemName },
    { key: "sub", header: t("item.subGroup"), hideBelow: "lg", cell: (r) => r.itemSubGroupName, exportValue: (r) => r.itemSubGroupName },
    { key: "company", header: t("item.company"), hideBelow: "lg", cell: (r) => r.companyName ?? "-", exportValue: (r) => r.companyName ?? "" },
    { key: "unit", header: t("bill.unit"), align: "center", hideBelow: "sm", cell: (r) => r.unitCode, exportValue: (r) => r.unitCode },
    { key: "stock", header: t("stock.onHand"), align: "right", sortable: true, cell: (r) => <span className="tabular font-medium">{r.currentStock}</span>, exportValue: (r) => r.currentStock },
    { key: "status", header: t("common.status"), align: "center", cell: (r) => <StockStatusBadge status={r.stockStatus} />, exportValue: (r) => r.stockStatus },
  ];

  const bins = warehouseDetail.data?.bins ?? [];
  const enteredBatchNo = batchNo.trim() || "GEN";
  const matchedBatch = selected
    ? (batches.data ?? []).find(
        (b) => b.itemId === selected.itemId && b.batchNumber === enteredBatchNo,
      )
    : undefined;

  return (
    <div className="space-y-4">
      {/* -------------------------- voucher header --------------------------- */}
      <Card>
        <CardContent className="p-4">
          <FieldGrid columns={3}>
            <Field label={t("common.date")} htmlFor="vdate">
              <Input id="vdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t("verify.location")}>
              <Select
                value={locationId != null ? String(locationId) : ""}
                onValueChange={(v) => setLocationId(Number(v))}
              >
                <SelectTrigger aria-label={t("verify.location")}>
                  <SelectValue placeholder={t("verify.location")} />
                </SelectTrigger>
                <SelectContent>
                  {(locations.data ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGrid>
        </CardContent>
      </Card>

      {/* --------------------------- item grid ------------------------------- */}
      <DataTable
        columns={itemColumns}
        result={items.data}
        isLoading={items.isLoading}
        isFetching={items.isFetching}
        query={query}
        onQueryChange={(next) => setQuery(next as ItemQuery)}
        getRowId={(row) => row.itemId}
        onRowClick={selectItem}
        searchPlaceholder={t("item.search")}
        emptyMessage={t("item.empty")}
        exportFileName="items"
      />

      {/* ---------------------- batch stock of selected ---------------------- */}
      {selected && (
        <div>
          <p className="mb-1 text-sm font-medium">
            {t("verify.batchStockTitle")} — <span className="text-muted-foreground">{selected.itemName}</span>
          </p>
          <p className="mb-1.5 text-xs text-muted-foreground">{t("verify.clickBatchHint")}</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("verify.batchNo")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("stock.location")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("stock.onHand")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("stock.expiry")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("verify.stockRate")}</th>
                </tr>
              </thead>
              <tbody>
                {(batches.data ?? []).filter((b) => b.itemId === selected.itemId).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-16 px-3 text-center align-middle text-sm text-muted-foreground">
                      {t("verify.noBatchStock")}
                    </td>
                  </tr>
                ) : (
                  (batches.data ?? [])
                    .filter((b) => b.itemId === selected.itemId)
                    .map((b) => (
                      <tr
                        key={b.batchId}
                        className="cursor-pointer border-t hover:bg-muted/40"
                        onClick={() => {
                          setBatchNo(b.batchNumber);
                          setRate(b.purchaseRate);
                          setPhysicalQty(b.currentQty);
                          setIsNew(false);
                        }}
                      >
                        <td className="px-3 py-2 font-medium">{b.batchNumber}</td>
                        <td className="px-3 py-2 text-muted-foreground">{b.locationName}</td>
                        <td className="px-3 py-2 text-right tabular">{b.currentQty} {b.unitCode}</td>
                        <td className="px-3 py-2">{b.expiryDate ? formatDate(b.expiryDate) : "-"}</td>
                        <td className="px-3 py-2 text-right tabular">{formatCurrency(b.purchaseRate)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------- entry form ---------------------------- */}
      <Card>
        <CardContent className="p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">{t("verify.selectItemHint")}</p>
          ) : (
            <>
              <FieldGrid columns={4}>
                <Field label={t("sale.item")}>
                  <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                    {selected.itemName}
                  </div>
                </Field>
                <Field label={t("verify.batchNo")} htmlFor="vbatch">
                  <Input id="vbatch" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="GEN" />
                </Field>
                <Field label={t("verify.warehouse")}>
                  <Select
                    value={warehouseId != null ? String(warehouseId) : ""}
                    onValueChange={(v) => {
                      setWarehouseId(Number(v));
                      setBinName("");
                    }}
                  >
                    <SelectTrigger aria-label={t("verify.warehouse")}>
                      <SelectValue placeholder={t("verify.selectWarehouse")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses.data ?? []).map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("verify.bin")}>
                  <Select value={binName || ""} onValueChange={setBinName} disabled={warehouseId == null || bins.length === 0}>
                    <SelectTrigger aria-label={t("verify.bin")}>
                      <SelectValue placeholder={t("verify.selectBin")} />
                    </SelectTrigger>
                    <SelectContent>
                      {bins.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label={t("verify.physicalQty")}
                  htmlFor="vqty"
                  hint={matchedBatch ? `${t("stock.system")}: ${matchedBatch.currentQty} ${selected.unitCode}` : undefined}
                >
                  <Input id="vqty" type="number" min={0} step="0.001" value={physicalQty} onChange={(e) => setPhysicalQty(Math.max(0, Number(e.target.value) || 0))} className="text-right tabular" />
                </Field>
                <Field label={t("verify.stockRate")} htmlFor="vrate">
                  <Input id="vrate" type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} className="text-right tabular" disabled={!isNew} />
                </Field>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="size-4" />
                    {t("verify.newStock")}
                  </label>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="neutral" onClick={addLine} className="w-full">
                    <Plus className="mr-1.5 size-4" />
                    {t("bill.addItem")}
                  </Button>
                </div>
              </FieldGrid>
            </>
          )}
        </CardContent>
      </Card>

      {/* --------------------------- added lines ----------------------------- */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-medium">{t("verify.addedLines")}</p>
          <Button variant="success" disabled={lines.length === 0 || !canAdjust || create.isPending || post.isPending} onClick={save}>
            {t("common.save")}
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="w-10 px-2 py-2 text-right font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">{t("sale.item")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("verify.batchNo")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("verify.warehouse")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("verify.bin")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("verify.physicalQty")}</th>
                <th className="px-2 py-2 text-right font-medium">{t("verify.stockRate")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-16 px-3 text-center align-middle text-sm text-muted-foreground">
                    {t("verify.noLines")}
                  </td>
                </tr>
              ) : (
                lines.map((l, index) => (
                  <tr key={l.key} className="border-t">
                    <td className="px-2 py-2 text-right tabular text-muted-foreground">{index + 1}</td>
                    <td className="px-3 py-2">
                      <div className="truncate font-medium">{l.itemName}</div>
                      {l.isNew && <span className="text-xs text-primary">{t("verify.newStock")}</span>}
                    </td>
                    <td className="px-3 py-2">{l.batchNumber}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.warehouseName || "-"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.binName || "-"}</td>
                    <td className="px-2 py-2 text-right tabular font-medium">{l.physicalQty} {l.unitCode}</td>
                    <td className="px-2 py-2 text-right tabular">{l.rate > 0 ? formatCurrency(l.rate) : "-"}</td>
                    <td className="px-1 py-2">
                      <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => removeLine(l.key)} aria-label="Remove">
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
