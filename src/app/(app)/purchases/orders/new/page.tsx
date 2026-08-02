"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw, Trash2, UserPlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Field } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { supplierHooks } from "@/features/masters/hooks";
import {
  useCreatePurchaseOrder,
  useItemSearch,
  usePurchaseOrder,
  usePurchaseRequisition,
  usePurchaseRequisitions,
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
import { formatCurrency, toIsoDate } from "@/lib/format";
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
  orderedQty: number;
  rate: number;
  /** Set when this line was pulled from a requisition. */
  requisitionDetailId?: number | null;
}

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
  const [reqNumber, setReqNumber] = useState<string | null>(null);
  const [reqSearch, setReqSearch] = useState("");

  // Edit mode: `?editId=` loads an existing OPEN order into the same form.
  const [editId, setEditId] = useState<number | null>(null);
  const [appliedEditId, setAppliedEditId] = useState<number | null>(null);
  const isEdit = editId != null;

  const itemInputRef = useRef<HTMLInputElement>(null);

  const debouncedItem = useDebouncedValue(itemSearch);
  const items = useItemSearch(debouncedItem);
  const suppliers = supplierHooks.useLookup();
  const queryClient = useQueryClient();
  const openReqs = usePurchaseRequisitions({ page: 1, pageSize: 50, pendingOnly: true });
  const reqDetail = usePurchaseRequisition(reqId);
  const orderDetail = usePurchaseOrder(editId);
  const createOrder = useCreatePurchaseOrder();
  const updateOrder = useUpdatePurchaseOrder();
  const createSupplier = supplierHooks.useCreate();

  const fromReq = reqId != null;

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
      code: "",
      name: l.itemName,
      shortName: null,
      description: null,
      barcode: null,
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

    // Only an untouched order can be edited; the backend enforces this too.
    if (order.status !== "Open") {
      toast.error(
        `${t("po.orderWord", "Order")} ${order.orderNumber} ${t("pur.isWord", "is")} ${t(`pur.status.${order.status.toLowerCase()}`, order.status)} ${t("pur.cannotEditSuffix", "and can no longer be edited.")}`,
      );
      router.replace(`/purchases/orders/${order.purchaseOrderId}`);
      return;
    }

    setOrderDate(order.orderDate.slice(0, 10));
    setExpectedDate(order.expectedDate ? order.expectedDate.slice(0, 10) : "");
    setSupplierId(order.supplierId);
    setSupplierSearch(order.supplierName);
    setRemark(order.remarks ?? "");
    setLines(
      order.lines.map((l) => ({
        key: `po-${l.purchaseOrderDetailId}`,
        item: orderLineToLookup(l),
        orderedQty: l.orderedQty,
        rate: l.rate,
        requisitionDetailId: l.requisitionDetailId ?? null,
      })),
    );
    setAppliedEditId(order.purchaseOrderId);
    // t is a stable translate function; re-adding it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDetail.data, appliedEditId, router]);

  function reqLineToLookup(l: PurchaseRequisitionLineDto): ItemLookupDto {
    return {
      id: l.itemId,
      code: "",
      name: l.itemName,
      shortName: null,
      description: null,
      barcode: null,
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
    setReqNumber(req.requisitionNumber);
    setLines(
      req.lines
        .filter((l) => l.pendingQty > 0)
        .map((l) => ({
          key: `req-${l.requisitionDetailId}`,
          item: reqLineToLookup(l),
          // Order defaults to what is still pending on the requisition line.
          orderedQty: l.pendingQty,
          rate: l.estimatedRate,
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
    setReqNumber(null);
    setReqSearch("");
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
        orderedQty: 1,
        // Seeded from the master; corrected here. A search hit carries no
        // purchase rate, so fall back to an estimate off the selling rate.
        rate: rate ?? (item.sellingRate > 0 ? round2(item.sellingRate * 0.8) : 0),
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

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  async function save() {
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

  const reqOptions: SearchPickerOption[] = (openReqs.data?.items ?? [])
    .filter((r) => r.requisitionNumber.toLowerCase().includes(reqSearch.toLowerCase()))
    .slice(0, 30)
    .map((r) => ({
      id: r.requisitionId,
      primary: r.requisitionNumber,
      secondary: r.status,
      trailing: `Qty ${round2(r.totalQty)}`,
    }));

  return (
    <>
      <PageHeader
        title={isEdit ? t("po.editTitle") : t("po.createTitle")}
        description={t("po.newDesc")}
      />

      <div className="space-y-4">
        {/* --------------------------- header strip --------------------------- */}
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Requisition source is fixed once an order exists; hidden while editing. */}
            {!isEdit && (
              <Field
                label={t("po.fromRequisition")}
                hint={fromReq ? t("po.orderingAgainstReq") : t("po.optionalOrDirect")}
              >
                {fromReq ? (
                  <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 text-sm">
                    <span className="truncate font-medium">{reqNumber ?? t("common.loading")}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      onClick={clearRequisition}
                      aria-label="Clear requisition"
                      title={t("common.clear")}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <SearchPicker
                    value={reqSearch}
                    onValueChange={setReqSearch}
                    options={reqOptions}
                    isLoading={openReqs.isFetching}
                    openOnFocus
                    placeholder={t("po.searchOpenReq")}
                    emptyMessage={t("po.noOpenReqs")}
                    onSelect={(option) => setReqId(option.id)}
                  />
                )}
              </Field>
            )}

            <Field label={t("po.orderNo")}>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                {isEdit ? orderDetail.data?.orderNumber ?? t("common.loading") : t("po.autoOnSave")}
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

            <Field label={t("po.expectedDate")} htmlFor="expectedDate" hint={t("po.expectedDateHint")}>
              <Input
                id="expectedDate"
                type="date"
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
              />
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
                      <th className="min-w-[220px] px-3 py-2 text-left font-medium">{t("pur.item")}</th>
                      <th className="w-32 px-2 py-2 text-right font-medium">{t("po.orderedQtyCol")}</th>
                      <th className="w-32 px-2 py-2 text-right font-medium">{t("pur.rate")}</th>
                      <th className="w-32 px-3 py-2 text-right font-medium">{t("common.amount")}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={line.key} className="border-t align-top">
                        <td className="px-2 py-2 text-right tabular text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2">
                          <div className="min-w-[200px] truncate font-medium">{line.item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {line.item.code} · {line.item.unitCode}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            value={line.orderedQty}
                            onChange={(e) =>
                              updateLine(line.key, { orderedQty: Number(e.target.value) })
                            }
                            className="h-8 text-right tabular"
                            aria-label={`Ordered quantity for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.rate}
                            onChange={(e) => updateLine(line.key, { rate: Number(e.target.value) })}
                            className="h-8 text-right tabular"
                            aria-label={`Rate for ${line.item.name}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular font-medium">
                          {formatCurrency(round2(line.orderedQty * line.rate))}
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

      {/* --------------------------- sticky action bar --------------------------- */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
        <div className="hidden text-sm text-muted-foreground sm:block">
          {lines.length} {lines.length === 1 ? t("pur.itemLower", "item") : t("pur.itemsLower", "items")} ·{" "}
          {t("po.estimatedLabel", "Estimated")}{" "}
          <span className="font-medium text-foreground">{formatCurrency(estimatedValue)}</span>
        </div>
        <div className="flex flex-1 justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(isEdit ? `/purchases/orders/${editId}` : "/purchases/orders")}
            disabled={isBusy}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="success" onClick={() => void save()} disabled={isBusy}>
            {isBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
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
    </>
  );
}
