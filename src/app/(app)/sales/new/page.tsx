"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw, ScanLine, Trash2, UserPlus } from "lucide-react";
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
import {
  useBarcodeLookup,
  useCreateSale,
  useCustomerLookup,
  usePaymentModes,
  usePostSale,
  useItemSearch,
} from "@/features/transactions/hooks";
import { customerHooks } from "@/features/masters/hooks";
import {
  computeBillTotals,
  discountAmountsForTarget,
  rateFor,
  round2,
} from "@/features/transactions/billing-math";
import type {
  ItemLookupDto,
  SalePaymentType,
  SaleType,
} from "@/features/transactions/types";
import type { ItemListDto } from "@/features/masters/types";
import { ItemMasterPicker } from "@/features/transactions/item-master-picker";
import { formatCurrency, formatQuantity, toIsoDate } from "@/lib/format";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

/** One row on the bill, before the server splits it across batches. */
interface BillLine {
  key: string;
  item: ItemLookupDto;
  quantity: number;
  freeQuantity: number;
  rate: number;
  discountPercent: number;
}

export default function NewSaleOrderPage() {
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();

  const [invoiceDate, setInvoiceDate] = useState(toIsoDate(new Date()));
  const [saleType, setSaleType] = useState<SaleType>("Retail");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [walkInMobile, setWalkInMobile] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [lines, setLines] = useState<BillLine[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [otherCharges, setOtherCharges] = useState(0);
  // Null means "not overridden" - the grand total field then tracks the live
  // computed total. A number below the computed total is a bill-level discount.
  const [grandTotalInput, setGrandTotalInput] = useState<number | null>(null);
  // Null means "fully paid" - the paid field defaults to the whole total, which
  // is what a cash counter wants; a smaller number leaves a pending balance.
  const [paidInput, setPaidInput] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  // Credit term for a balance, enabled only when something is left pending.
  const [creditDays, setCreditDays] = useState(30);
  const [pickerOpen, setPickerOpen] = useState(false);

  const itemInputRef = useRef<HTMLInputElement>(null);

  const debouncedItem = useDebouncedValue(itemSearch);
  const debouncedCustomer = useDebouncedValue(customerSearch);

  const items = useItemSearch(debouncedItem);
  const customers = useCustomerLookup(debouncedCustomer);
  const queryClient = useQueryClient();
  const paymentModes = usePaymentModes();
  const createSale = useCreateSale();
  const postSale = usePostSale();
  const createCustomer = customerHooks.useCreate();
  // Full record of the picked customer, so choosing them fills mobile + father
  // name straight from the master instead of being retyped at the counter.
  const selectedCustomer = customerHooks.useOne(customerId);

  useEffect(() => {
    const c = selectedCustomer.data;
    if (c && c.customerId === customerId) {
      setWalkInMobile(c.mobile ?? "");
      setFatherName(c.fatherName ?? "");
    }
  }, [selectedCustomer.data, customerId]);

  const canDiscount = can(Permissions.Sales.Discount);

  /* ------------------------------ line maths ------------------------------ */
  // computeBillTotals mirrors the server's arithmetic so the operator sees the
  // real figure before saving; the server recomputes on save and its numbers
  // are the ones stored.
  const totals = useMemo(
    () =>
      computeBillTotals(
        lines.map((line) => ({
          quantity: line.quantity,
          rate: line.rate,
          discountPercent: line.discountPercent,
          gstPercent: line.item.gstPercent,
        })),
        otherCharges,
      ),
    [lines, otherCharges],
  );

  const autoTotal = totals.grandTotal;
  // An override only counts while it sits below the live total; anything at or
  // above it (including a stale value after a line was removed) falls back to
  // the computed figure, so the field always makes sense.
  const overrideActive = grandTotalInput != null && grandTotalInput < autoTotal;
  const effectiveTotal = overrideActive ? grandTotalInput! : autoTotal;
  const billDiscount = round2(autoTotal - effectiveTotal);
  const paid = paidInput ?? effectiveTotal;
  const pending = round2(Math.max(0, effectiveTotal - paid));
  const paymentType: SalePaymentType = pending > 0 ? "Credit" : "Cash";

  /* ------------------------------- actions -------------------------------- */

  function addItem(item: ItemLookupDto) {
    setLines((current) => {
      // A second scan of the same item bumps the quantity rather than adding a
      // duplicate row - which is what a counter operator expects.
      const existing = current.find((line) => line.item.id === item.id);
      if (existing) {
        return current.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...current,
        {
          key: `${item.id}-${Date.now()}`,
          item,
          quantity: 1,
          freeQuantity: 0,
          rate: rateFor(item, saleType),
          discountPercent: 0,
        },
      ];
    });
    setItemSearch("");
    itemInputRef.current?.focus();
  }

  /** A picked master row carries enough to build a bill line without re-fetching. */
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

  /** Adds every ticked master row at once; a repeat bumps its quantity. */
  function addFromPicker(picked: ItemListDto[]) {
    setLines((current) => {
      let next = current;
      for (const row of picked) {
        const item = itemListToLookup(row);
        const existing = next.find((line) => line.item.id === item.id);
        next = existing
          ? next.map((line) =>
              line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line,
            )
          : [
              ...next,
              {
                key: `${item.id}-${Date.now()}`,
                item,
                quantity: 1,
                freeQuantity: 0,
                rate: rateFor(item, saleType),
                discountPercent: 0,
              },
            ];
      }
      return next;
    });
  }

  const barcodeLookup = useBarcodeLookup();

  async function onBarcodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    try {
      const item = await barcodeLookup.mutateAsync(code);
      addItem(item);
      setBarcode("");
    } catch {
      /* the hook already reported it */
    }
  }

  function updateLine(key: string, patch: Partial<BillLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function onSaleTypeChange(next: SaleType) {
    setSaleType(next);
    // Re-price existing lines, but leave any rate the operator typed by hand
    // alone - overwriting a negotiated price would be worse than stale.
    setLines((current) =>
      current.map((line) =>
        line.rate === rateFor(line.item, saleType)
          ? { ...line, rate: rateFor(line.item, next) }
          : line,
      ),
    );
  }

  async function save(andPost: boolean) {
    if (lines.length === 0) {
      toast.error(t("bill.toastAddItem"));
      return;
    }

    const typedName = customerSearch.trim();
    let effectiveCustomerId = customerId;

    // A balance is credit, and a credit has to be owed by someone. If no saved
    // customer was picked, the typed name is added as a new customer so the due
    // and its term can be tracked. A fully-paid walk-in needs none of this and
    // leaves no record behind.
    if (paymentType === "Credit") {
      if (!can(Permissions.Sales.CreditSale)) {
        toast.error(t("bill.toastNoCreditPermission"));
        return;
      }
      if (effectiveCustomerId == null) {
        if (!typedName) {
          toast.error(t("bill.toastNeedCustomerName"));
          return;
        }
        try {
          const created = await createCustomer.mutateAsync({
            customerName: typedName,
            fatherName: fatherName.trim() || null,
            mobile: walkInMobile.trim() || null,
            customerType: saleType,
            creditLimit: 0,
            creditDays,
            openingBalance: 0,
            openingBalanceType: "DR",
            isActive: true,
          });
          effectiveCustomerId = created.customerId;
        } catch {
          return; // the hook surfaced the reason
        }
      }
    }

    // When the operator has overridden the grand total, the shortfall becomes a
    // flat per-line discount; otherwise each line keeps its own discount%.
    const overrideDiscounts = overrideActive
      ? discountAmountsForTarget(
          lines.map((line) => ({
            quantity: line.quantity,
            rate: line.rate,
            discountPercent: line.discountPercent,
            gstPercent: line.item.gstPercent,
          })),
          otherCharges,
          effectiveTotal,
        )
      : null;

    // A fully-paid cash sale is sent with no tender line: the server settles it
    // in full against its own recomputed total, so a paisa of rounding drift can
    // never make the tender exceed the bill.
    const cashMode = paymentModes.data?.find((mode) => mode.code === "CASH");
    const payments =
      paymentType === "Cash"
        ? []
        : paid > 0 && cashMode
          ? [{ paymentModeId: cashMode.id, amount: round2(paid) }]
          : [];

    try {
      const sale = await createSale.mutateAsync({
        invoiceDate,
        customerId: effectiveCustomerId,
        walkInCustomerName: effectiveCustomerId ? null : typedName || null,
        walkInMobile: effectiveCustomerId ? null : walkInMobile.trim() || null,
        saleType,
        paymentType,
        otherCharges,
        remarks: remark || null,
        creditDays: pending > 0 ? creditDays : null,
        lines: lines.map((line, index) => ({
          itemId: line.item.id,
          // Null: the server picks batches by FEFO and may split this into
          // several invoice lines, one per batch.
          batchId: null,
          quantity: line.quantity,
          freeQuantity: line.freeQuantity,
          rate: line.rate,
          discountPercent: overrideDiscounts ? 0 : line.discountPercent,
          discountAmount: overrideDiscounts ? overrideDiscounts[index] : 0,
        })),
        payments,
      });

      if (andPost) {
        await postSale.mutateAsync(sale.saleId);
      } else {
        toast.success(`${t("bill.orderPrefix")} ${sale.invoiceNumber} ${t("bill.savedAsDraft")}`);
      }
      router.push(`/sales/${sale.saleId}`);
    } catch {
      /* the hooks surface the reason */
    }
  }

  const isBusy = createSale.isPending || postSale.isPending || createCustomer.isPending;

  const itemOptions: SearchPickerOption[] = (items.data ?? []).map((item) => ({
    id: item.id,
    primary: item.name,
    secondary: [item.description, item.code].filter(Boolean).join(" · "),
    trailing: `${formatQuantity(item.currentStock)} ${item.unitCode} · ${formatCurrency(
      rateFor(item, saleType),
    )}`,
    disabled: item.currentStock <= 0,
  }));

  const customerOptions: SearchPickerOption[] = (customers.data ?? []).map((customer) => ({
    id: customer.id,
    primary: customer.name,
    secondary: customer.description ?? undefined,
    trailing: customer.code,
  }));

  return (
    <>
      <PageHeader
        title={t("bill.title")}
        description={t("bill.desc")}
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/sales")} disabled={isBusy}>
              {t("common.cancel")}
            </Button>
            <Button variant="outline" onClick={() => void save(false)} disabled={isBusy}>
              {t("bill.saveDraft")}
            </Button>
            {can(Permissions.Sales.Post) && (
              <Button onClick={() => void save(true)} disabled={isBusy}>
                {isBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("bill.savePost")}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {/* --------------------------- header strip --------------------------- */}
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("bill.orderNo")}>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                {t("bill.autoOnSave")}
              </div>
            </Field>

            <Field label={t("bill.orderDate")} htmlFor="invoiceDate">
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(event) => setInvoiceDate(event.target.value)}
              />
            </Field>

            <Field label={t("cust.priceType")}>
              <Select value={saleType} onValueChange={(v) => onSaleTypeChange(v as SaleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">{t("cust.retail")}</SelectItem>
                  <SelectItem value="Wholesale">{t("cust.wholesale")}</SelectItem>
                  <SelectItem value="Dealer">{t("cust.dealer")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={t("cust.name")}
              hint={
                customerId
                  ? t("bill.customerSelectedHint")
                  : pending > 0
                    ? t("bill.customerBalanceHint")
                    : t("bill.customerBlankHint")
              }
            >
              <div className="flex items-center gap-1.5">
                <SearchPicker
                  className="flex-1"
                  value={customerSearch}
                  onValueChange={(value) => {
                    setCustomerSearch(value);
                    // Editing the name means it is no longer the picked customer.
                    setCustomerId(null);
                  }}
                  options={customerOptions}
                  isLoading={customers.isFetching}
                  openOnFocus
                  placeholder={t("bill.customerPlaceholder")}
                  emptyMessage={t("bill.customerEmptyMessage")}
                  onSelect={(option) => {
                    setCustomerId(option.id);
                    setCustomerSearch(option.primary);
                  }}
                />
                {/* Add a customer without leaving this half-filled order: opens the
                    Customer master in a new tab, then Refresh pulls it into the list. */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t("bill.addCustomer")}
                  aria-label={t("bill.addCustomer")}
                  onClick={() => window.open("/customers?new=1", "_blank", "noopener")}
                >
                  <UserPlus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={t("bill.refreshCustomers")}
                  aria-label={t("bill.refreshCustomers")}
                  disabled={customers.isFetching}
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ["customers", "lookup"] })
                  }
                >
                  <RefreshCw className={`size-4 ${customers.isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </Field>

            <Field label={t("common.mobile")} htmlFor="mobile">
              <Input
                id="mobile"
                value={walkInMobile}
                onChange={(event) => setWalkInMobile(event.target.value)}
                inputMode="numeric"
                maxLength={10}
                placeholder={t("common.optional")}
              />
            </Field>

            <Field label={t("cust.fatherName")} htmlFor="fatherName">
              <Input
                id="fatherName"
                value={fatherName}
                onChange={(event) => setFatherName(event.target.value)}
                placeholder={t("common.optional")}
              />
            </Field>
          </CardContent>
        </Card>

        {/* ----------------------------- items grid ---------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">{t("bill.orderItems")}</CardTitle>
            <Button variant="neutral" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              {t("bill.addItem")}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* quick add - search or scan a known item straight in */}
            <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
              <SearchPicker
                inputRef={itemInputRef}
                value={itemSearch}
                onValueChange={setItemSearch}
                options={itemOptions}
                isLoading={items.isFetching}
                placeholder={t("bill.searchItemPlaceholder")}
                emptyMessage={t("bill.noItemFound")}
                onSelect={(option) => {
                  const item = items.data?.find((p) => p.id === option.id);
                  if (item) addItem(item);
                }}
              />
              <form onSubmit={onBarcodeSubmit} className="relative">
                <ScanLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder={t("bill.scanBarcode")}
                  className="pl-8"
                  aria-label="Scan barcode"
                />
              </form>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-xs text-muted-foreground">
                    <tr>
                      <th className="w-10 px-2 py-2 text-right font-medium">#</th>
                      <th className="px-3 py-2 text-left font-medium">{t("sale.item")}</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">{t("bill.quantity")}</th>
                      <th className="w-16 px-2 py-2 text-left font-medium">{t("bill.unit")}</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">{t("sale.rate")}</th>
                      <th className="w-20 px-2 py-2 text-right font-medium">{t("bill.discPercent")}</th>
                      <th className="w-16 px-2 py-2 text-right font-medium">{t("sale.gst")}</th>
                      <th className="w-32 px-3 py-2 text-right font-medium">{t("bill.totalAmount")}</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="h-28 px-3 text-center align-middle text-sm text-muted-foreground"
                        >
                          {t("bill.emptyItemsHint")}
                        </td>
                      </tr>
                    )}
                    {lines.map((line, index) => {
                      const lineGross = round2(line.quantity * line.rate);
                      const lineNet = round2(lineGross - (lineGross * line.discountPercent) / 100);
                      const belowMin =
                        line.item.minSellingRate > 0 && line.rate < line.item.minSellingRate;
                      const overStock =
                        line.quantity + line.freeQuantity > line.item.currentStock;

                      return (
                        <tr key={line.key} className="border-t">
                          <td className="px-2 py-2 text-right tabular text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2">
                            <div className="max-w-[280px] truncate font-medium">{line.item.name}</div>
                            <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                              <span>
                                {formatQuantity(line.item.currentStock)} {line.item.unitCode} {t("bill.inStock")}
                              </span>
                              {belowMin && (
                                <span className="text-destructive">
                                  {t("bill.belowMin")} {formatCurrency(line.item.minSellingRate)}
                                </span>
                              )}
                              {overStock && <span className="text-destructive">{t("bill.exceedsStock")}</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.001"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.key, { quantity: Number(event.target.value) })
                              }
                              className="h-8 text-right tabular"
                              aria-label={`Quantity for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">{line.item.unitCode}</td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.rate}
                              onChange={(event) =>
                                updateLine(line.key, { rate: Number(event.target.value) })
                              }
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
                              disabled={!canDiscount}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  discountPercent: Number(event.target.value),
                                })
                              }
                              className="h-8 text-right tabular"
                              aria-label={`Discount for ${line.item.name}`}
                            />
                          </td>
                          <td className="px-2 py-2 text-right tabular text-muted-foreground">
                            {line.item.gstPercent}%
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
          </CardContent>
        </Card>

        {/* --------------------------- summary strip --------------------------- */}
        <Card>
          <CardContent className="grid gap-6 p-4 lg:grid-cols-[1fr_340px]">
            <Field label={t("bill.remark")} htmlFor="remark">
              <Textarea
                id="remark"
                rows={4}
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                placeholder={t("bill.remarkPlaceholder")}
              />
            </Field>

            <div className="space-y-2 text-sm">
              <Row label={t("bill.subTotal")} value={formatCurrency(totals.taxable)} />
              <Row label={t("sale.cgst")} value={formatCurrency(totals.halfTax)} muted />
              <Row label={t("sale.sgst")} value={formatCurrency(round2(totals.tax - totals.halfTax))} muted />

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("sale.otherCharges")}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={otherCharges}
                  onChange={(event) => setOtherCharges(Number(event.target.value) || 0)}
                  className="h-8 w-32 text-right tabular"
                  aria-label="Other charges"
                />
              </div>

              {billDiscount > 0 && (
                <Row label={t("bill.billDiscount")} value={`- ${formatCurrency(billDiscount)}`} />
              )}

              {/* Grand total is editable: type the agreed final figure and the
                  difference is spread across the lines as a discount. */}
              <div className="flex items-center justify-between gap-2 border-t pt-2">
                <span className="text-base font-semibold">{t("bill.grandTotal")}</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={effectiveTotal}
                  disabled={!canDiscount}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setGrandTotalInput(raw === "" ? null : Number(raw));
                    // Retyping the total re-defaults the paid amount to it.
                    setPaidInput(null);
                  }}
                  className="h-9 w-32 text-right text-base font-semibold tabular"
                  aria-label="Grand total"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("bill.amountPaid")}</span>
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
                  {t("bill.amountPending")}
                </span>
                <span className="tabular font-medium">{formatCurrency(pending)}</span>
              </div>

              {/* Enabled only when a balance is left - a paid-in-full bill has no term. */}
              <div className="flex items-center justify-between gap-2">
                <span className={pending > 0 ? "" : "text-muted-foreground"}>{t("bill.creditDays")}</span>
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
                {pending > 0
                  ? `${t("bill.creditDue")} - ${formatCurrency(pending)} ${t("bill.dueIn")} ${creditDays} ${creditDays === 1 ? t("bill.day") : t("bill.days")}.`
                  : t("bill.paidInFull")}
              </p>
            </div>
          </CardContent>
        </Card>
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
