"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw, RotateCcw, Save, Trash2, UserPlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { supplierHooks } from "@/features/masters/hooks";
import {
  useCreatePurchaseOrder,
  useItemSearch,
  useNextPurchaseOrderNumber,
  usePurchaseOrder,
  usePurchaseRequisition,
  useUpdatePurchaseOrder,
} from "@/features/transactions/hooks";
import { round2 } from "@/features/transactions/billing-math";
import type {
  ItemLookupDto,
  PurchaseOrderLineDto,
  PurchaseRequisitionDto,
  PurchaseRequisitionLineDto,
} from "@/features/transactions/types";
import type { ItemListDto } from "@/features/masters/types";
import { ItemMasterPicker } from "@/features/transactions/item-master-picker";
import { formatCurrency, formatQuantity, toIsoDate } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/**
 * A Purchase Order is a BOOKING, not a receipt: it records what the shop asked
 * a supplier for, at what rate, and nothing else. No batch, no stock movement,
 * no payment - those belong to the goods-receipt note (GRN) raised against this
 * order once the consignment actually arrives.
 */
interface OrderLine {
  key: string;
  item: ItemLookupDto;
  /** From the requisition line this was raised from; null for a direct add. */
  requiredQty: number | null;
  noOfPacks: number;
  qtyPerPack: number;
  /** P.O. Qty (In PU) = noOfPacks x qtyPerPack. */
  orderedQty: number;
  /** Purchase Unit Rate. */
  rate: number;
  itemRemark: string;
  lineRemark: string;
  /** Set when this line was pulled from a requisition. */
  requisitionDetailId?: number | null;
}

/** P.O. Qty = packs x qty-per-pack, rounded to the 0.001 the field allows. */
function packQty(packs: number, qtyPerPack: number): number {
  return Math.round(packs * qtyPerPack * 1000) / 1000;
}

// Highlighted grid cells (matches the reference PO screen): editable number
// inputs get a teal border, the derived P.O. Qty box a blue one. cn/twMerge in
// Input lets these override the default border-input colour.
const GRID_EDIT =
  "h-8 rounded-md border-teal-400 bg-teal-50/40 text-right tabular " +
  "focus-visible:border-teal-500 focus-visible:ring-teal-400/40 " +
  "dark:border-teal-500/60 dark:bg-teal-500/10";
const GRID_DERIVED =
  "flex h-8 items-center justify-end rounded-md border border-blue-400 bg-blue-50/50 " +
  "px-3 text-right tabular font-medium text-blue-700 " +
  "dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const t = useT();

  const [orderDate, setOrderDate] = useState(toIsoDate(new Date()));
  const [expectedDate, setExpectedDate] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [remark, setRemark] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Requisition link. `reqId` drives the detail fetch; `appliedReqId` remembers
  // which requisition's lines are already loaded so the effect applies each once.
  const [reqId, setReqId] = useState<number | null>(null);
  const [appliedReqId, setAppliedReqId] = useState<number | null>(null);

  // Edit mode: `?editId=` loads an existing OPEN order into the same form.
  const [editId, setEditId] = useState<number | null>(null);
  const [appliedEditId, setAppliedEditId] = useState<number | null>(null);
  const isEdit = editId != null;

  const itemInputRef = useRef<HTMLInputElement>(null);

  const debouncedItem = useDebouncedValue(itemSearch);
  const items = useItemSearch(debouncedItem);
  const suppliers = supplierHooks.useLookup();
  const queryClient = useQueryClient();
  const reqDetail = usePurchaseRequisition(reqId);
  const orderDetail = usePurchaseOrder(editId);
  // Indicative next PO number for a new order (read-only; the real one is
  // assigned atomically on save, so this is a likely-next preview).
  const nextOrderNumber = useNextPurchaseOrderNumber(!isEdit);
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const createSupplier = supplierHooks.useCreate();

  // Deep-links: ?editId= opens an existing order for edit; ?reqId= starts a new
  // order pre-filled from a requisition. Edit wins if both are somehow present.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eId = Number(params.get("editId"));
    if (eId > 0) {
      setEditId(eId);
      return;
    }
    const rId = Number(params.get("reqId"));
    if (rId > 0) setReqId(rId);
  }, []);

  function orderLineToLookup(l: PurchaseOrderLineDto): ItemLookupDto {
    return {
      id: l.itemId,
      code: l.itemCode,
      name: l.itemName,
      shortName: null,
      description: null,
      barcode: null,
      itemGroupName: l.itemGroupName,
      itemSubGroupName: l.itemSubGroupName,
      unitId: l.unitId,
      unitCode: l.unitCode,
      sellingRate: l.sellingRate,
      wholesaleRate: 0,
      dealerRate: 0,
      mrp: l.mrp,
      minSellingRate: 0,
      gstPercent: l.gstPercent,
      hsnCode: l.hsnCode,
      currentStock: 0,
      isActive: true,
    };
  }

  // Load the existing order once, when editing.
  useEffect(() => {
    const order = orderDetail.data;
    if (!order || order.purchaseOrderId === appliedEditId) return;

    // Any order opens in the form; a non-Open order (a GRN has drawn on it) is
    // blocked at save with a clear message rather than being un-openable here.
    setOrderDate(order.orderDate.slice(0, 10));
    setExpectedDate(order.expectedDate ? order.expectedDate.slice(0, 10) : "");
    setSupplierId(order.supplierId);
    setSupplierSearch(order.supplierName);
    setRemark(order.remarks ?? "");
    setLines(
      order.lines.map((l) => ({
        key: `po-${l.purchaseOrderDetailId}`,
        item: orderLineToLookup(l),
        requiredQty: l.requiredQty ?? null,
        // Older lines saved no split; show them as N packs of 1 so P.O. Qty holds.
        noOfPacks: l.noOfPacks > 0 ? l.noOfPacks : l.orderedQty,
        qtyPerPack: l.qtyPerPack > 0 ? l.qtyPerPack : 1,
        orderedQty: l.orderedQty,
        rate: l.rate,
        itemRemark: l.itemRemark ?? "",
        lineRemark: l.remarks ?? "",
        requisitionDetailId: l.requisitionDetailId ?? null,
      })),
    );
    setAppliedEditId(order.purchaseOrderId);
  }, [orderDetail.data, appliedEditId]);

  function reqLineToLookup(l: PurchaseRequisitionLineDto): ItemLookupDto {
    return {
      id: l.itemId,
      code: l.itemCode,
      name: l.itemName,
      shortName: null,
      description: null,
      barcode: null,
      itemGroupName: l.itemGroupName,
      itemSubGroupName: l.itemSubGroupName,
      unitId: l.unitId,
      unitCode: l.unitCode,
      sellingRate: l.sellingRate,
      wholesaleRate: 0,
      dealerRate: 0,
      mrp: l.mrp,
      minSellingRate: 0,
      gstPercent: l.gstPercent,
      hsnCode: l.hsnCode,
      currentStock: 0,
      isActive: true,
    };
  }

  function applyRequisition(req: PurchaseRequisitionDto) {
    setLines(
      req.lines
        .filter((l) => l.pendingQty > 0)
        .map((l) => ({
          key: `req-${l.requisitionDetailId}`,
          item: reqLineToLookup(l),
          // Required Qty is the figure the requisition asked for.
          requiredQty: l.requiredQty,
          // P.O. Qty defaults to what is still pending, as one pack each.
          noOfPacks: l.pendingQty,
          qtyPerPack: 1,
          orderedQty: l.pendingQty,
          rate: l.estimatedRate,
          itemRemark: "",
          lineRemark: l.remarks ?? "",
          requisitionDetailId: l.requisitionDetailId,
        })),
    );
  }

  useEffect(() => {
    const req = reqDetail.data;
    if (req && req.requisitionId !== appliedReqId) {
      applyRequisition(req);
      setAppliedReqId(req.requisitionId);
    }
    // applyRequisition is a stable local builder; re-adding it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqDetail.data, appliedReqId]);

  function clearRequisition() {
    setReqId(null);
    setAppliedReqId(null);
    setLines([]);
  }

  const estimatedValue = useMemo(
    () => round2(lines.reduce((sum, line) => sum + line.orderedQty * line.rate, 0)),
    [lines],
  );
  const totalQty = useMemo(
    () => round2(lines.reduce((sum, line) => sum + line.orderedQty, 0)),
    [lines],
  );

  function addItem(item: ItemLookupDto, rate?: number) {
    setLines((current) => [
      ...current,
      {
        key: `${item.id}-${Date.now()}`,
        item,
        // A direct add has no requisition behind it, so no Required Qty.
        requiredQty: null,
        noOfPacks: 1,
        qtyPerPack: 1,
        orderedQty: 1,
        // Seeded from the master; corrected here. A search hit carries no
        // purchase rate, so fall back to an estimate off the selling rate.
        rate: rate ?? (item.sellingRate > 0 ? round2(item.sellingRate * 0.8) : 0),
        itemRemark: "",
        lineRemark: "",
      },
    ]);
    setItemSearch("");
    itemInputRef.current?.focus();
  }

  function itemListToLookup(row: ItemListDto): ItemLookupDto {
    return {
      id: row.itemId,
      code: row.itemCode,
      name: row.itemName,
      shortName: row.shortName,
      description: row.technicalName,
      barcode: row.barcode,
      itemGroupName: row.itemGroupName,
      itemSubGroupName: row.itemSubGroupName,
      unitId: row.unitId,
      unitCode: row.unitCode,
      sellingRate: row.sellingRate,
      wholesaleRate: row.wholesaleRate,
      dealerRate: row.dealerRate,
      mrp: row.mrp,
      minSellingRate: row.minSellingRate,
      gstPercent: row.gstPercent,
      hsnCode: row.hsnCode,
      currentStock: row.currentStock,
      isActive: row.isActive,
    };
  }

  function addFromPicker(picked: ItemListDto[]) {
    for (const row of picked) {
      addItem(itemListToLookup(row), row.purchaseRate > 0 ? row.purchaseRate : undefined);
    }
  }

  function updateLine(key: string, patch: Partial<OrderLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  /** Edit packs or qty-per-pack and re-derive P.O. Qty (In PU) from the two. */
  function updatePack(key: string, patch: Partial<Pick<OrderLine, "noOfPacks" | "qtyPerPack">>) {
    setLines((current) =>
      current.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        next.orderedQty = packQty(next.noOfPacks, next.qtyPerPack);
        return next;
      }),
    );
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  /** Close the full-screen frame: back to the order (edit) or the list (new). */
  function close() {
    router.push(isEdit ? `/purchases/orders/${editId}` : "/purchases/orders");
  }

  /** Reset the whole form to an empty order (keeps today's date). */
  function clearAll() {
    setLines([]);
    setSupplierId(null);
    setSupplierSearch("");
    setRemark("");
    setItemSearch("");
    clearRequisition();
  }

  async function save() {
    // A booked order can no longer be edited once a GRN has drawn on it.
    if (isEdit && orderDetail.data && orderDetail.data.status !== "Open") {
      toast.error(t("pur.alreadyTransacted"));
      return;
    }
    if (lines.length === 0) {
      toast.error(t("po.addAtLeastOneItem"));
      return;
    }
    if (lines.some((line) => line.orderedQty <= 0)) {
      toast.error(t("po.orderedQtyGreaterThanZero"));
      return;
    }

    // An order always names who it is placed with. A typed-but-unsaved name is
    // added as a supplier so goods can later be received against a known party.
    let effectiveSupplierId = supplierId;
    const typedName = supplierSearch.trim();
    if (effectiveSupplierId == null) {
      if (!typedName) {
        toast.error(t("pur.selectOrEnterSupplier"));
        return;
      }
      try {
        const created = await createSupplier.mutateAsync({
          supplierName: typedName,
          phone: null,
          paymentTermDays: 30,
          creditLimit: 0,
          openingBalance: 0,
          openingBalanceType: "DR",
          isActive: true,
        });
        effectiveSupplierId = created.supplierId;
      } catch {
        return; // the hook surfaced the reason
      }
    }

    const body = {
      orderDate,
      expectedDate: expectedDate || null,
      supplierId: effectiveSupplierId,
      remarks: remark || null,
      lines: lines.map((line) => ({
        itemId: line.item.id,
        orderedQty: line.orderedQty,
        unitId: line.item.unitId,
        rate: line.rate,
        noOfPacks: line.noOfPacks,
        qtyPerPack: line.qtyPerPack,
        requiredQty: line.requiredQty,
        remarks: line.lineRemark || null,
        itemRemark: line.itemRemark || null,
        requisitionDetailId: line.requisitionDetailId ?? null,
      })),
    };

    try {
      if (isEdit) {
        const order = await updateOrder.mutateAsync({ id: editId!, body });
        toast.success(`${t("po.entityPhrase", "Purchase order")} ${order.orderNumber} ${t("pur.updatedWord", "updated")}.`);
        router.push(`/purchases/orders/${order.purchaseOrderId}`);
        return;
      }
      const order = await createOrder.mutateAsync(body);
      toast.success(`${t("po.entityPhrase", "Purchase order")} ${order.orderNumber} ${t("pur.createdWord", "created")}.`);
      router.push(`/purchases/orders/${order.purchaseOrderId}`);
    } catch {
      /* the hook surfaces the reason */
    }
  }

  const isBusy = createOrder.isPending || updateOrder.isPending || createSupplier.isPending;

  const itemOptions: SearchPickerOption[] = (items.data ?? []).map((item) => ({
    id: item.id,
    primary: item.name,
    secondary: [item.description, item.code].filter(Boolean).join(" · "),
    trailing: item.unitCode,
  }));

  const supplierOptions: SearchPickerOption[] = (suppliers.data ?? [])
    .filter((supplier) => supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()))
    .slice(0, 30)
    .map((supplier) => ({
      id: supplier.id,
      primary: supplier.name,
      secondary: supplier.description ?? undefined,
      trailing: supplier.code,
    }));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* frame header with a close button, like the reference PO screen */}
      <div className="flex items-center justify-between border-b bg-card px-5 py-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEdit ? t("po.editTitle") : t("po.createTitle")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label={t("common.close", "Close")}
          title={t("common.close", "Close")}
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* --------------------------- header strip --------------------------- */}
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("po.orderNo")}>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                {isEdit
                  ? orderDetail.data?.orderNumber ?? t("common.loading")
                  : nextOrderNumber.data?.number ?? t("po.autoOnSave")}
              </div>
            </Field>

            <Field label={t("po.orderDate")} htmlFor="orderDate">
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </Field>

            <Field
              className="lg:col-span-2"
              label={t("pur.supplierName")}
              required
              hint={supplierId ? t("pur.savedSupplierSelected") : t("pur.typeOrPickHint")}
            >
              <div className="flex items-center gap-1.5">
                <SearchPicker
                  className="flex-1"
                  value={supplierSearch}
                  onValueChange={(value) => {
                    setSupplierSearch(value);
                    setSupplierId(null);
                  }}
                  options={supplierOptions}
                  isLoading={suppliers.isFetching}
                  openOnFocus
                  placeholder={t("pur.typeOrPickSupplier")}
                  emptyMessage={t("pur.noSavedSupplier")}
                  onSelect={(option) => {
                    setSupplierId(option.id);
                    setSupplierSearch(option.primary);
                  }}
                />
                {/* Add a supplier mid-entry: opens the Supplier master in a new
                    tab; Refresh then pulls the new one into the list. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t("pur.addSupplier")}
                  aria-label={t("pur.addSupplier")}
                  onClick={() => window.open("/suppliers?new=1", "_blank", "noopener")}
                >
                  <UserPlus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t("pur.refreshSuppliers")}
                  aria-label={t("pur.refreshSuppliers")}
                  disabled={suppliers.isFetching}
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ["suppliers", "lookup"] })
                  }
                >
                  <RefreshCw className={`size-4 ${suppliers.isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* ----------------------------- items grid ---------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{t("po.orderItems")}</CardTitle>
            <Button variant="neutral" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t("pur.addItem")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <SearchPicker
              inputRef={itemInputRef}
              value={itemSearch}
              onValueChange={setItemSearch}
              options={itemOptions}
              isLoading={items.isFetching}
              placeholder={t("pur.searchItemPlaceholder")}
              emptyMessage={t("pur.noItemFound")}
              onSelect={(option) => {
                const item = items.data?.find((p) => p.id === option.id);
                if (item) addItem(item);
              }}
            />

            {lines.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                {t("po.emptyItemsHint")}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="w-8 px-2 py-2 text-right font-medium">#</th>
                      <th className="w-24 px-2 py-2 text-left font-medium">{t("po.itemCodeCol")}</th>
                      <th className="min-w-[120px] px-2 py-2 text-left font-medium">{t("po.itemGroupCol")}</th>
                      <th className="min-w-[130px] px-2 py-2 text-left font-medium">{t("po.itemSubGroupCol")}</th>
                      <th className="min-w-[200px] px-3 py-2 text-left font-medium">{t("po.itemNameCol")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("po.requiredQtyCol")}</th>
                      <th className="w-20 px-2 py-2 text-left font-medium">{t("po.stockUnitCol")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("po.noOfPacksCol")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("po.qtyPerPackCol")}</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">{t("po.poQtyInPuCol")}</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">{t("po.purchaseUnitRateCol")}</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">{t("po.totalAmountCol")}</th>
                      <th className="min-w-[140px] px-2 py-2 text-left font-medium">{t("po.itemRemarkCol")}</th>
                      <th className="min-w-[140px] px-2 py-2 text-left font-medium">{t("po.remarkCol")}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={line.key} className="border-t align-top">
                        <td className="px-2 py-2 text-right tabular text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {line.item.code || "-"}
                        </td>
                        <td className="px-2 py-2">
                          <span className="block max-w-[160px] truncate" title={line.item.itemGroupName ?? ""}>
                            {line.item.itemGroupName || "-"}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="block max-w-[170px] truncate" title={line.item.itemSubGroupName ?? ""}>
                            {line.item.itemSubGroupName || "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="min-w-[180px] truncate font-medium">{line.item.name}</div>
                        </td>
                        <td className="px-2 py-2 text-right tabular text-muted-foreground">
                          {line.requiredQty != null ? formatQuantity(line.requiredQty) : "-"}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground">{line.item.unitCode}</td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="1"
                            value={line.noOfPacks}
                            onChange={(e) => updatePack(line.key, { noOfPacks: Number(e.target.value) })}
                            className={GRID_EDIT}
                            aria-label={`Number of packs for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            value={line.qtyPerPack}
                            onChange={(e) => updatePack(line.key, { qtyPerPack: Number(e.target.value) })}
                            className={GRID_EDIT}
                            aria-label={`Quantity per pack for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {/* Derived: packs x qty-per-pack. Read-only so the two inputs stay the source. */}
                          <div
                            className={GRID_DERIVED}
                            aria-label={`P.O. quantity for ${line.item.name}`}
                          >
                            {formatQuantity(line.orderedQty)}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.rate}
                            onChange={(e) => updateLine(line.key, { rate: Number(e.target.value) })}
                            className={GRID_EDIT}
                            aria-label={`Purchase unit rate for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular font-medium">
                          {formatCurrency(round2(line.orderedQty * line.rate))}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={line.itemRemark}
                            onChange={(e) => updateLine(line.key, { itemRemark: e.target.value })}
                            className="h-8"
                            placeholder={t("common.optional")}
                            aria-label={`Item remark for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={line.lineRemark}
                            onChange={(e) => updateLine(line.key, { lineRemark: e.target.value })}
                            className="h-8"
                            placeholder={t("common.optional")}
                            aria-label={`Remark for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-1 py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => removeLine(line.key)}
                            aria-label={`Remove ${line.item.name}`}
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
          </CardContent>
        </Card>

        {/* --------------------------- summary strip --------------------------- */}
        <Card>
          <CardContent className="grid gap-6 p-4 lg:grid-cols-[1fr_340px]">
            <Field label={t("pur.remark")} htmlFor="remark">
              <Textarea
                id="remark"
                rows={4}
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder={t("po.remarkPlaceholder")}
              />
            </Field>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("pur.totalItems")}</span>
                <span className="tabular">{lines.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("pur.totalQuantity")}</span>
                <span className="tabular">{totalQty}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-base font-semibold">{t("po.estimatedValueLabel")}</span>
                <span className="tabular text-base font-semibold">
                  {formatCurrency(estimatedValue)}
                </span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                {t("po.estimateNote")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- action footer --------------------------- */}
      <div className="flex items-center justify-between gap-3 border-t bg-card px-5 py-3">
        <div className="hidden text-sm text-muted-foreground sm:block">
          {lines.length} {lines.length === 1 ? t("pur.itemLower", "item") : t("pur.itemsLower", "items")} ·{" "}
          {t("po.estimatedLabel", "Estimated")}{" "}
          <span className="font-medium text-foreground">{formatCurrency(estimatedValue)}</span>
        </div>
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="outline" onClick={clearAll} disabled={isBusy}>
            <RotateCcw className="mr-1.5 size-4" />
            {t("common.clear", "Clear")}
          </Button>
          <Button variant="outline" onClick={close} disabled={isBusy}>
            <X className="mr-1.5 size-4" />
            {t("common.cancel")}
          </Button>
          <Button variant="success" onClick={() => void save()} disabled={isBusy}>
            {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
            {isEdit ? t("common.saveChanges") : t("po.createOrder")}
          </Button>
        </div>
      </div>

      <ItemMasterPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        addedIds={lines.map((line) => line.item.id)}
        onConfirm={addFromPicker}
      />
    </div>
  );
}
