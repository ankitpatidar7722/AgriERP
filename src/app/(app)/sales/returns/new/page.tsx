"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDevice } from "indas-ui";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "@/lib/ag-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { Field, NumberInput } from "@/components/common/form-dialog";
import { SearchPicker, type SearchPickerOption } from "@/components/common/search-picker";
import { useAuth } from "@/features/auth/auth-context";
import {
  useCreateSalesReturn,
  usePostSalesReturn,
  useSale,
  useSales,
} from "@/features/transactions/hooks";
import type {
  SalesReturnRefundMode,
  SaveSalesReturnRequest,
} from "@/features/transactions/types";
import { formatCurrency, formatQuantity, toIsoDate } from "@/lib/format";
import { round2 } from "@/features/transactions/billing-math";
import { Permissions } from "@/lib/permissions";
import { useT } from "@/features/i18n/provider";

interface ReturnLine {
  salesDetailId: number;
  itemName: string;
  batchId: number;
  batchNumber: string;
  unitCode: string;
  soldQty: number;
  rate: number;
  gstPercent: number;
  returnQty: number;
  isSaleable: boolean;
  reason: string;
}

const REFUND_MODES: SalesReturnRefundMode[] = ["Adjust", "Cash", "Bank", "Replacement"];

export default function NewSalesReturnPage() {
  const router = useRouter();
  const { can } = useAuth();
  const t = useT();
  const { isMobile } = useDevice();

  const [saleId, setSaleId] = useState<number | null>(null);
  const [appliedSaleId, setAppliedSaleId] = useState<number | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const [returnDate, setReturnDate] = useState(toIsoDate(new Date()));
  const [returnReason, setReturnReason] = useState("");
  const [refundMode, setRefundMode] = useState<SalesReturnRefundMode>("Adjust");
  const [refundedAmount, setRefundedAmount] = useState(0);
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<ReturnLine[]>([]);

  // ?saleId= deep link from an invoice's "Return" button.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("saleId"));
    if (id > 0) setSaleId(id);
  }, []);

  const sale = useSale(saleId);
  const postedSales = useSales({ page: 1, pageSize: 50, status: "Posted" });
  const createReturn = useCreateSalesReturn();
  const postReturn = usePostSalesReturn();

  const fromInvoice = saleId != null;
  const isBusy = createReturn.isPending || postReturn.isPending;

  // Load the invoice's lines once it (and its detail) has arrived.
  useEffect(() => {
    const s = sale.data;
    if (s && s.saleId !== appliedSaleId) {
      setLines(
        s.lines.map((l) => ({
          salesDetailId: l.salesDetailId,
          itemName: l.itemName,
          batchId: l.batchId,
          batchNumber: l.batchNumber ?? "",
          unitCode: l.unitCode,
          soldQty: l.quantity,
          rate: l.rate,
          gstPercent: l.gstPercent,
          returnQty: 0,
          isSaleable: true,
          reason: "",
        })),
      );
      setAppliedSaleId(s.saleId);
    }
  }, [sale.data, appliedSaleId]);

  const invoiceOptions: SearchPickerOption[] = (postedSales.data?.items ?? [])
    .filter(
      (s) =>
        s.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        s.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()),
    )
    .map((s) => ({
      id: s.saleId,
      primary: s.invoiceNumber,
      secondary: s.customerName,
      trailing: formatCurrency(s.grandTotal),
    }));

  function setLine(index: number, patch: Partial<ReturnLine>) {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function clearInvoice() {
    setSaleId(null);
    setAppliedSaleId(null);
    setInvoiceSearch("");
    setLines([]);
  }

  const totals = useMemo(() => {
    let taxable = 0;
    let gst = 0;
    for (const l of lines) {
      if (l.returnQty <= 0) continue;
      const lineTaxable = round2(l.returnQty * l.rate);
      taxable += lineTaxable;
      gst += round2((lineTaxable * l.gstPercent) / 100);
    }
    return { taxable: round2(taxable), gst: round2(gst), grand: round2(taxable + gst) };
  }, [lines]);

  async function save(andPost: boolean) {
    if (!fromInvoice) {
      toast.error(t("sret.pickInvoice", "Pick the invoice being returned against first."));
      return;
    }
    const active = lines.filter((l) => l.returnQty > 0);
    if (active.length === 0) {
      toast.error(t("sret.noQty", "Enter a return quantity for at least one item."));
      return;
    }
    const overReturn = active.find((l) => l.returnQty > l.soldQty);
    if (overReturn) {
      toast.error(
        `${overReturn.itemName}: ${t("sret.overReturn", "cannot return more than was sold")} (${formatQuantity(overReturn.soldQty)}).`,
      );
      return;
    }

    const body: SaveSalesReturnRequest = {
      returnDate,
      customerId: sale.data?.customerId ?? null,
      saleId,
      returnReason: returnReason || null,
      refundMode,
      refundedAmount: refundMode === "Cash" || refundMode === "Bank" ? refundedAmount : 0,
      remarks: remark || null,
      lines: active.map((l) => ({
        batchId: l.batchId,
        salesDetailId: l.salesDetailId,
        quantity: l.returnQty,
        rate: l.rate,
        discountAmount: 0,
        isSaleable: l.isSaleable,
        returnReason: l.reason || null,
      })),
    };

    try {
      const created = await createReturn.mutateAsync(body);
      if (andPost) await postReturn.mutateAsync(created.salesReturnId);
      router.push(`/sales/returns/${created.salesReturnId}`);
    } catch {
      /* the hook already toasts the reason; stay on the form */
    }
  }

  return (
    <>
      <PageHeader title={t("sret.newTitle", "New Sales Return")} description={t("sret.newDesc", "Credit a customer for goods returned against an invoice.")} />

      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("sret.date", "Return Date")} htmlFor="returnDate">
              <Input id="returnDate" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </Field>

            <Field label={t("sret.invoice", "Against Invoice")} required>
              {fromInvoice ? (
                <div className="flex h-9 items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 text-sm">
                  <span className="truncate font-medium">
                    {sale.data?.invoiceNumber ?? t("common.loading")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={clearInvoice}
                    aria-label="Clear invoice"
                    title={t("common.clear")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <SearchPicker
                  value={invoiceSearch}
                  onValueChange={setInvoiceSearch}
                  options={invoiceOptions}
                  isLoading={postedSales.isFetching}
                  openOnFocus
                  placeholder={t("sret.searchInvoice", "Search invoice no or customer...")}
                  emptyMessage={t("sret.noInvoices", "No posted invoices found")}
                  onSelect={(option) => setSaleId(option.id)}
                />
              )}
            </Field>

            <Field label={t("sret.customer", "Customer")}>
              <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                {sale.data?.customerName || "—"}
              </div>
            </Field>
          </CardContent>
        </Card>

        {fromInvoice && (
          <Card>
            <CardContent className="p-0">
              {isMobile ? (
                /* Phone: each returnable line as a stacked card. */
                <div className="space-y-3 p-3">
                  {sale.isLoading && lines.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
                  ) : (
                    lines.map((line, index) => (
                      <div key={line.salesDetailId} className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="mb-2.5 min-w-0">
                          <p className="font-medium leading-tight">{line.itemName}</p>
                          {line.batchNumber && (
                            <p className="truncate text-xs text-muted-foreground">
                              {t("sret.batch", "Batch")}: {line.batchNumber}
                            </p>
                          )}
                        </div>

                        <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
                            <span className="text-muted-foreground">{t("sret.sold", "Sold")}</span>
                            <span className="tabular font-medium">
                              {formatQuantity(line.soldQty)} {line.unitCode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
                            <span className="text-muted-foreground">{t("sret.rate", "Rate")}</span>
                            <span className="tabular font-medium">{formatCurrency(line.rate)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 items-end gap-2.5">
                          <label className="block">
                            <span className="mb-1 block text-xs text-muted-foreground">{t("sret.returnQty", "Return Qty")}</span>
                            <NumberInput
                              value={line.returnQty}
                              onChange={(value) =>
                                setLine(index, { returnQty: Math.min(Math.max(value, 0), line.soldQty) })
                              }
                              min={0}
                              max={line.soldQty}
                              step="0.001"
                              className="h-9 text-right tabular"
                            />
                          </label>
                          <div className="flex h-9 items-center justify-between rounded-md border px-3">
                            <span className="text-xs text-muted-foreground">{t("sret.saleable", "Saleable")}</span>
                            <Switch
                              checked={line.isSaleable}
                              onCheckedChange={(checked) => setLine(index, { isSaleable: checked })}
                              aria-label="Saleable"
                            />
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t pt-2.5">
                          <span className="text-sm text-muted-foreground">{t("sret.lineTotal", "Total")}</span>
                          <span className="tabular text-base font-semibold">
                            {formatCurrency(round2(line.returnQty * line.rate))}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t("sret.item", "Item")}</th>
                      <th className="px-3 py-2 font-medium">{t("sret.batch", "Batch")}</th>
                      <th className="w-24 px-3 py-2 text-right font-medium">{t("sret.sold", "Sold")}</th>
                      <th className="w-32 px-3 py-2 text-right font-medium">{t("sret.returnQty", "Return Qty")}</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">{t("sret.rate", "Rate")}</th>
                      <th className="w-24 px-3 py-2 text-center font-medium">{t("sret.saleable", "Saleable")}</th>
                      <th className="w-28 px-3 py-2 text-right font-medium">{t("sret.lineTotal", "Total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.isLoading && lines.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                          {t("common.loading")}
                        </td>
                      </tr>
                    )}
                    {lines.map((line, index) => (
                      <tr key={line.salesDetailId} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="max-w-[220px] truncate font-medium">{line.itemName}</div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{line.batchNumber || "-"}</td>
                        <td className="px-3 py-2 text-right tabular">
                          {formatQuantity(line.soldQty)} {line.unitCode}
                        </td>
                        <td className="px-3 py-2">
                          <NumberInput
                            value={line.returnQty}
                            onChange={(value) =>
                              setLine(index, { returnQty: Math.min(Math.max(value, 0), line.soldQty) })
                            }
                            min={0}
                            max={line.soldQty}
                            step="0.001"
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular">{formatCurrency(line.rate)}</td>
                        <td className="px-3 py-2 text-center">
                          <Switch
                            checked={line.isSaleable}
                            onCheckedChange={(checked) => setLine(index, { isSaleable: checked })}
                            aria-label="Saleable"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular font-medium">
                          {formatCurrency(round2(line.returnQty * line.rate))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("sret.refundMode", "Refund Mode")} hint={t("sret.refundHint", "Adjust = knock off the customer's balance.")}>
              <Select value={refundMode} onValueChange={(v) => setRefundMode(v as SalesReturnRefundMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {(refundMode === "Cash" || refundMode === "Bank") && (
              <Field label={t("sret.refundedAmount", "Refunded Amount")}>
                <NumberInput value={refundedAmount} onChange={setRefundedAmount} min={0} step="0.01" />
              </Field>
            )}
            <Field label={t("sret.reason", "Reason")}>
              <Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder={t("sret.reasonEg", "e.g. wrong item, damaged")} />
            </Field>
            <Field label={t("common.remarks", "Remarks")}>
              <Textarea rows={1} value={remark} onChange={(e) => setRemark(e.target.value)} />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------- sticky action bar --------------------------- */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
        <div className="hidden text-sm text-muted-foreground sm:block">
          {t("sret.creditTotal", "Credit total")}{" "}
          <span className="font-medium text-foreground">{formatCurrency(totals.grand)}</span>
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/sales/returns")} disabled={isBusy}>
            {t("common.cancel")}
          </Button>
          <Button variant="outline" onClick={() => void save(false)} disabled={isBusy}>
            {t("sret.saveDraft", "Save Draft")}
          </Button>
          {can(Permissions.Sales.Return) && (
            <Button variant="success" onClick={() => void save(true)} disabled={isBusy}>
              {isBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
              {t("sret.savePost", "Save & Post")}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
