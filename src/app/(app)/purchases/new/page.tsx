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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { Field } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { useAuth } from "@/features/auth/auth-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { supplierHooks, warehouseHooks } from "@/features/masters/hooks";
import {
  useCreatePurchase,
  usePostPurchase,
  usePurchase,
  usePurchaseOrder,
  usePurchaseOrders,
  useItemSearch,
  useUpdatePurchase,
} from "@/features/transactions/hooks";
import {
  computeBillTotals,
  discountAmountsForTarget,
  previewLandedRate,
  round2,
} from "@/features/transactions/billing-math";
import type {
  ItemLookupDto,
  PurchaseLineDto,
  PurchaseOrderDto,
} from "@/features/transactions/types";
import type { ItemListDto } from "@/features/masters/types";
import { ItemMasterPicker } from "@/features/transactions/item-master-picker";
import { formatCurrency, toIsoDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

/**
 * The Purchase GRN (Goods Receipt Note): the document that RECEIVES a
 * consignment into stock. It records the batch, expiry and actual rate of what
 * arrived and, on posting, creates the batches and takes the goods in.
 *
 * It may be raised against a purchase order - in which case the ordered lines
 * are pulled in and the receipt quantity defaults to what is still pending - or
 * on its own, for goods bought without a formal order. The PO is optional.
 */
interface GrnLine {
  key: string;
  item: ItemLookupDto;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  rate: number;
  discountPercent: number;
  mrp: number;
  sellingRate: number;
  /** Present when the line came from a PO, for the ordered/pending hint. */
  orderedQty?: number;
  pendingQty?: number;
}

export default function NewGrnPage() {
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();

  const [purchaseDate, setPurchaseDate] = useState(toIsoDate(new Date()));
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierBillNo, setSupplierBillNo] = useState("");
  const [supplierBillDate, setSupplierBillDate] = useState("");
  const [freight, setFreight] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [lines, setLines] = useState<GrnLine[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [grandTotalInput, setGrandTotalInput] = useState<number | null>(null);
  const [paidInput, setPaidInput] = useState<number | null>(null);
  const [creditDays, setCreditDays] = useState(30);
  const [remark, setRemark] = useState("");
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Purchase-order link. `poId` drives the detail fetch; `appliedPoId` remembers
  // which order's lines are already loaded so the effect applies each one once.
  const [poId, setPoId] = useState<number | null>(null);
  const [appliedPoId, setAppliedPoId] = useState<number | null>(null);
  const [poNumber, setPoNumber] = useState<string | null>(null);
  const [poSearch, setPoSearch] = useState("");

  // Edit mode: `?editId=` loads an existing DRAFT GRN into the same form.
  const [editId, setEditId] = useState<number | null>(null);
  const [appliedEditId, setAppliedEditId] = useState<number | null>(null);
  const isEdit = editId != null;

  // Deep-links read after mount (rather than useSearchParams, which would force
  // the whole page behind a Suspense boundary): ?editId= edits an existing GRN;
  // ?poId= starts a new GRN receiving against an order.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eId = Number(params.get("editId"));
    if (eId > 0) {
      setEditId(eId);
      return;
    }
    const id = Number(params.get("poId"));
    if (id > 0) setPoId(id);
  }, []);

  const itemInputRef = useRef<HTMLInputElement>(null);

  const debouncedItem = useDebouncedValue(itemSearch);
  const items = useItemSearch(debouncedItem);
  const suppliers = supplierHooks.useLookup();
  const queryClient = useQueryClient();
  const openOrders = usePurchaseOrders({ page: 1, pageSize: 50, pendingOnly: true });
  const poDetail = usePurchaseOrder(poId);
  const purchaseDetail = usePurchase(editId);
  const warehouses = warehouseHooks.useLookup();
  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const postPurchase = usePostPurchase();
  const createSupplier = supplierHooks.useCreate();

  const fromPo = poId != null;

  /* --------------------- apply a chosen purchase order ------------------- */
  function applyOrder(order: PurchaseOrderDto) {
    setSupplierId(order.supplierId);
    setSupplierSearch(order.supplierName);
    setPoNumber(order.orderNumber);
    setLines(
      order.lines
        .filter((l) => l.pendingQty > 0)
        .map((l) => ({
          key: `po-${l.purchaseOrderDetailId}`,
          item: {
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
          },
          batchNumber: "",
          expiryDate: "",
          // Receipt defaults to what is still owed on the order; edit down for a
          // short delivery.
          quantity: l.pendingQty,
          freeQuantity: 0,
          rate: l.rate,
          discountPercent: 0,
          mrp: l.mrp,
          sellingRate: l.sellingRate,
          orderedQty: l.orderedQty,
          pendingQty: l.pendingQty,
        })),
    );
  }

  // Prefill once the linked order's detail (with its lines) has loaded. Skipped
  // while editing: the draft brings its own lines and `appliedPoId` is pre-set.
  useEffect(() => {
    const order = poDetail.data;
    if (order && order.purchaseOrderId !== appliedPoId) {
      applyOrder(order);
      setAppliedPoId(order.purchaseOrderId);
    }
  }, [poDetail.data, appliedPoId]);

  function purchaseLineToGrn(l: PurchaseLineDto): GrnLine {
    // The stored line keeps a discount amount, not a percent; recover an
    // equivalent percent so the grid and totals reproduce the saved bill.
    const discountPercent = l.grossAmount > 0 ? round2((l.discountAmount / l.grossAmount) * 100) : 0;
    return {
      key: `grn-${l.purchaseDetailId}`,
      item: {
        id: l.itemId,
        code: "",
        name: l.itemName,
        shortName: null,
        description: null,
        barcode: null,
        unitId: 0,
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
      },
      batchNumber: l.batchNumber && l.batchNumber !== "GEN" ? l.batchNumber : "",
      expiryDate: l.expiryDate ? l.expiryDate.slice(0, 10) : "",
      quantity: l.quantity,
      freeQuantity: l.freeQuantity,
      rate: l.rate,
      discountPercent,
      mrp: l.mrp,
      sellingRate: l.sellingRate,
    };
  }

  // Load the existing draft GRN once, when editing.
  useEffect(() => {
    const data = purchaseDetail.data;
    if (!data || data.purchaseId === appliedEditId) return;

    // Any GRN opens in the form; a non-Draft (posted) one — its stock has
    // already moved — is blocked at save with a clear message instead.
    setPurchaseDate(data.purchaseDate.slice(0, 10));
    setSupplierId(data.supplierId);
    setSupplierSearch(data.supplierName);
    setSupplierBillNo(data.supplierInvoiceNumber ?? "");
    setSupplierBillDate(data.supplierInvoiceDate ? data.supplierInvoiceDate.slice(0, 10) : "");
    setFreight(data.freightCharges);
    setOtherCharges(data.otherCharges);
    setPaidInput(data.paidAmount > 0 ? data.paidAmount : null);
    setRemark(data.remarks ?? "");
    setWarehouseId(data.warehouseId ?? null);
    setLines(data.lines.map(purchaseLineToGrn));

    // Keep the PO link but suppress applyOrder (which would replace the lines
    // with the order's pending rows) by marking the order already applied.
    if (data.purchaseOrderId) {
      setPoId(data.purchaseOrderId);
      setAppliedPoId(data.purchaseOrderId);
    }

    setAppliedEditId(data.purchaseId);
  }, [purchaseDetail.data, appliedEditId]);

  function clearOrder() {
    setPoId(null);
    setAppliedPoId(null);
    setPoNumber(null);
    setPoSearch("");
    setLines([]);
    setSupplierId(null);
    setSupplierSearch("");
  }

  /* ------------------------------- totals -------------------------------- */
  const totals = useMemo(
    () =>
      computeBillTotals(
        lines.map((line) => ({
          quantity: line.quantity,
          rate: line.rate,
          discountPercent: line.discountPercent,
          gstPercent: line.item.gstPercent,
        })),
        freight + otherCharges,
      ),
    [lines, freight, otherCharges],
  );

  const autoTotal = totals.grandTotal;
  const overrideActive = grandTotalInput != null && grandTotalInput < autoTotal;
  const effectiveTotal = overrideActive ? grandTotalInput! : autoTotal;
  const billDiscount = round2(autoTotal - effectiveTotal);
  const paid = paidInput ?? 0;
  const pending = round2(Math.max(0, effectiveTotal - paid));

  function landedRateFor(line: GrnLine): number {
    return previewLandedRate(line, lines, freight + otherCharges);
  }

  function addItem(item: ItemLookupDto, rate?: number) {
    setLines((current) => [
      ...current,
      {
        key: `${item.id}-${Date.now()}`,
        item,
        batchNumber: "",
        expiryDate: "",
        quantity: 1,
        freeQuantity: 0,
        rate: rate ?? (item.sellingRate > 0 ? round2(item.sellingRate * 0.8) : 0),
        discountPercent: 0,
        mrp: item.mrp,
        sellingRate: item.sellingRate,
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
      const rate = row.purchaseRate > 0 ? row.purchaseRate : undefined;
      addItem(itemListToLookup(row), rate);
    }
  }

  function updateLine(key: string, patch: Partial<GrnLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  async function save(andPost: boolean) {
    // A posted GRN has already moved stock; it can no longer be edited.
    if (isEdit && purchaseDetail.data && purchaseDetail.data.status !== "Draft") {
      toast.error(t("pur.alreadyTransacted"));
      return;
    }
    if (lines.length === 0) {
      toast.error(t("grn.addAtLeastOneLine"));
      return;
    }
    if (lines.some((line) => line.quantity <= 0)) {
      toast.error(t("grn.qtyGreaterThanZero"));
      return;
    }

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
          phone: supplierPhone.trim() || null,
          paymentTermDays: creditDays,
          creditLimit: 0,
          openingBalance: 0,
          openingBalanceType: "DR",
          isActive: true,
        });
        effectiveSupplierId = created.supplierId;
      } catch {
        return;
      }
    }

    const overrideDiscounts = overrideActive
      ? discountAmountsForTarget(
          lines.map((line) => ({
            quantity: line.quantity,
            rate: line.rate,
            discountPercent: line.discountPercent,
            gstPercent: line.item.gstPercent,
          })),
          freight + otherCharges,
          effectiveTotal,
        )
      : null;

    const body = {
      purchaseDate,
      supplierId: effectiveSupplierId,
      purchaseOrderId: poId,
      warehouseId,
      supplierInvoiceNumber: supplierBillNo || null,
      supplierInvoiceDate: supplierBillDate || null,
      freightCharges: freight,
      otherCharges,
      paidAmount: Math.min(paid, effectiveTotal),
      remarks: remark || null,
      creditDays: pending > 0 ? creditDays : null,
      lines: lines.map((line, index) => ({
        itemId: line.item.id,
        batchNumber: line.batchNumber || null,
        expiryDate: line.expiryDate || null,
        quantity: line.quantity,
        freeQuantity: line.freeQuantity,
        rate: line.rate,
        discountPercent: overrideDiscounts ? 0 : line.discountPercent,
        discountAmount: overrideDiscounts ? overrideDiscounts[index] : 0,
        mrp: line.mrp,
        sellingRate: line.sellingRate,
      })),
    };

    try {
      const purchase = isEdit
        ? await updatePurchase.mutateAsync({ id: editId!, body })
        : await createPurchase.mutateAsync(body);

      if (andPost) {
        await postPurchase.mutateAsync(purchase.purchaseId);
      } else {
        toast.success(
          `${t("grn.entityWord", "GRN")} ${purchase.purchaseNumber} ${isEdit ? t("pur.updatedWord", "updated") : t("grn.savedAsDraftWord", "saved as draft")}.`,
        );
      }
      router.push(`/purchases/${purchase.purchaseId}`);
    } catch {
      /* the hooks surface the reason */
    }
  }

  const isBusy =
    createPurchase.isPending ||
    updatePurchase.isPending ||
    postPurchase.isPending ||
    createSupplier.isPending;

  const itemOptions: SearchPickerOption[] = (items.data ?? []).map((item) => ({
    id: item.id,
    primary: item.name,
    secondary: [item.description, item.code].filter(Boolean).join(" · "),
    trailing: `GST ${item.gstPercent}%`,
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

  const orderOptions: SearchPickerOption[] = (openOrders.data?.items ?? [])
    .filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
        order.supplierName.toLowerCase().includes(poSearch.toLowerCase()),
    )
    .slice(0, 30)
    .map((order) => ({
      id: order.purchaseOrderId,
      primary: order.orderNumber,
      secondary: order.supplierName,
      trailing: formatCurrency(order.estimatedValue),
    }));

  return (
    <>
      <PageHeader
        title={isEdit ? t("grn.editTitle") : t("grn.title")}
        description={t("grn.newDesc")}
      />

      <div className="space-y-4">
        {/* --------------------------- header strip --------------------------- */}
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label={t("grn.fromPo")}
              hint={
                isEdit
                  ? t("grn.fixedForGrn")
                  : fromPo
                    ? t("grn.receivingAgainstOrder")
                    : t("grn.optionalOrDirect")
              }
            >
              {isEdit ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                  {poId ? poDetail.data?.orderNumber ?? t("common.loading") : t("grn.directReceipt")}
                </div>
              ) : fromPo ? (
                <div className="flex h-10 items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 text-sm">
                  <span className="truncate font-medium">{poNumber ?? t("common.loading")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={clearOrder}
                    aria-label="Clear purchase order"
                    title={t("common.clear")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <SearchPicker
                  value={poSearch}
                  onValueChange={setPoSearch}
                  options={orderOptions}
                  isLoading={openOrders.isFetching}
                  openOnFocus
                  placeholder={t("grn.searchOpenOrder")}
                  emptyMessage={t("grn.noOpenOrders")}
                  onSelect={(option) => setPoId(option.id)}
                />
              )}
            </Field>

            <Field label={t("grn.date")} htmlFor="purchaseDate">
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
              />
            </Field>

            <Field label={t("pur.warehouse")} hint={t("grn.warehouseHint")}>
              <Select
                value={warehouseId != null ? String(warehouseId) : "none"}
                onValueChange={(v) => setWarehouseId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger aria-label="Warehouse">
                  <SelectValue placeholder={t("pur.selectWarehouse")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("pur.notSet")}</SelectItem>
                  {(warehouses.data ?? []).map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                      {w.code ? ` (${w.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={t("pur.supplierName")}
              required
              hint={
                fromPo
                  ? t("grn.setByOrder")
                  : supplierId
                    ? t("pur.savedSupplierSelected")
                    : t("pur.typeOrPickHint")
              }
            >
              {fromPo ? (
                <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                  {supplierSearch || t("common.loading")}
                </div>
              ) : (
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
              )}
            </Field>

            <Field label={t("common.mobile")} htmlFor="supplierPhone">
              <Input
                id="supplierPhone"
                value={supplierPhone}
                onChange={(event) => setSupplierPhone(event.target.value)}
                inputMode="numeric"
                maxLength={15}
                placeholder={t("common.optional")}
                disabled={fromPo}
              />
            </Field>

            <Field label={t("grn.supplierBillNo")} htmlFor="supplierBillNo" hint={t("grn.billNoHint")}>
              <Input
                id="supplierBillNo"
                value={supplierBillNo}
                onChange={(event) => setSupplierBillNo(event.target.value)}
              />
            </Field>

            <Field label={t("grn.supplierBillDate")} htmlFor="supplierBillDate">
              <Input
                id="supplierBillDate"
                type="date"
                value={supplierBillDate}
                onChange={(event) => setSupplierBillDate(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        {/* ----------------------------- items grid ---------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{t("grn.receivedItems")}</CardTitle>
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
                {fromPo
                  ? t("grn.orderNothingLeft")
                  : t("grn.pickOrderHint")}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="w-8 px-2 py-2 text-right font-medium">#</th>
                      <th className="min-w-[180px] px-3 py-2 text-left font-medium">{t("pur.item")}</th>
                      <th className="w-28 px-2 py-2 text-left font-medium">{t("grn.batch")}</th>
                      <th className="w-36 px-2 py-2 text-left font-medium">{t("grn.expiry")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("grn.receivedQtyCol")}</th>
                      <th className="w-16 px-2 py-2 text-right font-medium">{t("grn.free")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("pur.rate")}</th>
                      <th className="w-16 px-2 py-2 text-right font-medium">{t("pur.discPercent")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("grn.newMrp")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("grn.newSelling")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("grn.landed")}</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">{t("common.total")}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      const lineGross = round2(line.quantity * line.rate);
                      const lineNet = round2(lineGross - (lineGross * line.discountPercent) / 100);
                      return (
                        <tr key={line.key} className="border-t align-top">
                          <td className="px-2 py-2 text-right tabular text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <div className="min-w-[160px] truncate font-medium">{line.item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              GST {line.item.gstPercent}% · {line.item.unitCode}
                              {line.pendingQty != null && (
                                <>
                                  {" "}
                                  · {t("grn.orderedLabel", "ordered")} {line.orderedQty}, {t("grn.pendingLabel", "pending")} {line.pendingQty}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              value={line.batchNumber}
                              onChange={(e) => updateLine(line.key, { batchNumber: e.target.value })}
                              className="h-8"
                              placeholder="GEN"
                              aria-label={`Batch for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="date"
                              value={line.expiryDate}
                              onChange={(e) => updateLine(line.key, { expiryDate: e.target.value })}
                              className="h-8"
                              aria-label={`Expiry for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.001"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                              className="h-8 text-right tabular"
                              aria-label={`Received quantity for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.001"
                              value={line.freeQuantity}
                              onChange={(e) =>
                                updateLine(line.key, { freeQuantity: Number(e.target.value) })
                              }
                              className="h-8 text-right tabular"
                              aria-label={`Free quantity for ${line.item.name}`}
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
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              value={line.discountPercent}
                              onChange={(e) =>
                                updateLine(line.key, { discountPercent: Number(e.target.value) })
                              }
                              className="h-8 text-right tabular"
                              aria-label={`Discount for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.mrp}
                              onChange={(e) => updateLine(line.key, { mrp: Number(e.target.value) })}
                              className="h-8 text-right tabular"
                              aria-label={`New MRP for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.sellingRate}
                              onChange={(e) =>
                                updateLine(line.key, { sellingRate: Number(e.target.value) })
                              }
                              className="h-8 text-right tabular"
                              aria-label={`New selling rate for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2 text-right tabular text-muted-foreground">
                            {formatCurrency(landedRateFor(line))}
                          </td>
                          <td className="px-3 py-2 text-right tabular font-medium">
                            {formatCurrency(lineNet)}
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
                      );
                    })}
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
                placeholder={t("grn.remarkPlaceholder")}
              />
            </Field>

            <div className="space-y-2 text-sm">
              <Row label={t("grn.subTotal")} value={formatCurrency(totals.taxable)} />
              <Row label={t("pur.cgst")} value={formatCurrency(totals.halfTax)} muted />
              <Row label={t("pur.sgst")} value={formatCurrency(round2(totals.tax - totals.halfTax))} muted />

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("pur.freight")}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={freight}
                  onChange={(e) => setFreight(Number(e.target.value) || 0)}
                  className="h-8 w-32 text-right tabular"
                  aria-label="Freight charges"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("pur.otherCharges")}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                  className="h-8 w-32 text-right tabular"
                  aria-label="Other charges"
                />
              </div>

              {billDiscount > 0 && (
                <Row label={t("grn.billDiscount")} value={`- ${formatCurrency(billDiscount)}`} />
              )}

              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className="text-base font-semibold">{t("grn.grandTotal")}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={effectiveTotal}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setGrandTotalInput(raw === "" ? null : Number(raw));
                    setPaidInput(null);
                  }}
                  className="h-9 w-32 text-right text-base font-semibold tabular"
                  aria-label="Grand total"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("grn.amountPaid")}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paid}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setPaidInput(raw === "" ? null : Number(raw));
                  }}
                  className="h-8 w-32 text-right tabular"
                  aria-label="Amount paid"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className={pending > 0 ? "font-medium text-warning" : "text-muted-foreground"}>
                  {t("grn.amountPending")}
                </span>
                <span className="tabular font-medium">{formatCurrency(pending)}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className={pending > 0 ? "" : "text-muted-foreground"}>{t("grn.creditDays")}</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={creditDays}
                  disabled={pending <= 0}
                  onChange={(event) =>
                    setCreditDays(Math.max(0, Math.floor(Number(event.target.value) || 0)))
                  }
                  className="h-8 w-32 text-right tabular"
                  aria-label="Credit days"
                />
              </div>

              <p className="pt-1 text-xs text-muted-foreground">
                {t("grn.freightSpreadNote")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- sticky action bar --------------------------- */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
        <div className="hidden text-sm text-muted-foreground sm:block">
          {lines.length} {lines.length === 1 ? t("pur.itemLower", "item") : t("pur.itemsLower", "items")} ·{" "}
          {t("grn.grandTotalLower", "Grand total")}{" "}
          <span className="font-medium text-foreground">{formatCurrency(effectiveTotal)}</span>
        </div>
        <div className="flex flex-1 justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(isEdit ? `/purchases/${editId}` : "/purchases")}
            disabled={isBusy}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="outline" onClick={() => void save(false)} disabled={isBusy}>
            {isEdit ? t("common.saveChanges") : t("grn.saveDraft")}
          </Button>
          {can(Permissions.Purchase.Post) && (
            <Button variant="success" onClick={() => void save(true)} disabled={isBusy}>
              {isBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? t("grn.saveAndPost") : t("grn.receiveAndPost")}
            </Button>
          )}
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

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
