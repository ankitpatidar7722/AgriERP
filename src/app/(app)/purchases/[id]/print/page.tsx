"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchasePrint } from "@/features/transactions/hooks";
import {
  PrintFrame,
  PrintLetterhead,
  SectionBar,
  PartyBox,
  InfoRow,
  ItemTh,
  ItemTd,
  TotalRow,
  SignatureRow,
  PrintFooter,
  type PrintMetaRow,
} from "@/features/transactions/print-parts";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/**
 * The printable purchase order / goods-inward bill.
 *
 * Same bordered, letterhead-topped A4 form as the tax invoice - the shared
 * parts keep the two identical - with the purchase side's own columns: landed
 * cost per line and freight in the totals.
 */
export default function PurchasePrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const purchaseId = Number(params.id);

  const print = usePurchasePrint(purchaseId);

  useEffect(() => {
    if (!print.data) return;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [print.data]);

  if (print.isLoading) return <Skeleton className="h-[600px] w-full rounded-xl" />;

  const data = print.data;
  if (!data) return null;

  const { shop, purchase, taxSummary, amountInWords } = data;

  const meta: PrintMetaRow[] = [
    { label: t("pgrn.grnNo"), value: purchase.purchaseNumber },
    { label: t("common.date"), value: formatDate(purchase.purchaseDate) },
    ...(purchase.supplierInvoiceNumber
      ? [{ label: t("pgrn.suppBill"), value: purchase.supplierInvoiceNumber }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[860px] py-1">
      <div className="no-print mb-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push(`/purchases/${purchaseId}`);
          }}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          {t("common.back")}
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-1.5 size-4" />
          {t("common.print")}
        </Button>
      </div>

      <PrintFrame>
        <PrintLetterhead shop={shop} title={t("pgrn.title")} meta={meta} />

        {/* ------------------------------ parties ------------------------------ */}
        <div className="grid grid-cols-2 border-b border-black">
          <PartyBox title={t("pgrn.supplier")} className="border-r border-black">
            <div className="text-[11.5px] font-bold">{purchase.supplierName}</div>
            {purchase.supplierInvoiceNumber && (
              <div className="text-neutral-700">
                {t("pgrn.billNo")} {purchase.supplierInvoiceNumber}
              </div>
            )}
            {purchase.supplierInvoiceDate && (
              <div className="text-neutral-700">
                {t("pgrn.billDate")} {formatDate(purchase.supplierInvoiceDate)}
              </div>
            )}
          </PartyBox>
          <PartyBox title={t("pgrn.orderDetails")}>
            <InfoRow label={t("pgrn.deliverTo")} value={purchase.locationName} labelClassName="w-[74px]" />
            <InfoRow label={t("common.status")} value={purchase.paymentStatus} labelClassName="w-[74px]" />
            {purchase.dueDate && (
              <InfoRow
                label={t("prn.dueDate")}
                value={formatDate(purchase.dueDate)}
                labelClassName="w-[74px]"
              />
            )}
          </PartyBox>
        </div>

        <SectionBar>{t("prn.itemDetails")}</SectionBar>

        {/* ------------------------------- lines ------------------------------- */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-neutral-200">
              <ItemTh className="w-8 text-center">{t("prn.sr")}</ItemTh>
              <ItemTh className="text-left">{t("prn.particulars")}</ItemTh>
              <ItemTh className="w-20 text-center">{t("prn.batch")}</ItemTh>
              <ItemTh className="w-16 text-center">{t("prn.expiry")}</ItemTh>
              <ItemTh className="w-20 text-right">{t("prn.qty")}</ItemTh>
              <ItemTh className="w-16 text-right">{t("prn.rate")}</ItemTh>
              <ItemTh className="w-16 text-right">{t("pgrn.landed")}</ItemTh>
              <ItemTh className="w-11 text-center">{t("prn.gst")}</ItemTh>
              <ItemTh className="w-20 text-right">{t("common.amount")}</ItemTh>
            </tr>
          </thead>
          <tbody>
            {purchase.lines.map((line, index) => (
              <tr key={line.purchaseDetailId}>
                <ItemTd className="text-center text-neutral-600">{index + 1}</ItemTd>
                <ItemTd>
                  <span className="font-semibold">{line.itemName}</span>
                  {line.hsnCode && (
                    <span className="ml-1.5 text-[9px] text-neutral-500">
                      {t("prn.hsnLabel")} {line.hsnCode}
                    </span>
                  )}
                </ItemTd>
                <ItemTd className="text-center">{line.batchNumber ?? "-"}</ItemTd>
                <ItemTd className="text-center">
                  {line.expiryDate ? formatDate(line.expiryDate) : "-"}
                </ItemTd>
                <ItemTd className="text-right tabular">
                  {formatQuantity(line.quantity)}
                  {line.freeQuantity > 0 && ` +${formatQuantity(line.freeQuantity)}`} {line.unitCode}
                </ItemTd>
                <ItemTd className="text-right tabular">{formatCurrency(line.rate)}</ItemTd>
                <ItemTd className="text-right tabular">{formatCurrency(line.landedRate)}</ItemTd>
                <ItemTd className="text-center tabular">{line.gstPercent}%</ItemTd>
                <ItemTd className="text-right tabular font-semibold">
                  {formatCurrency(line.lineTotal)}
                </ItemTd>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ------------------------------ summary ------------------------------ */}
        <div className="grid grid-cols-[1fr_300px] border-t border-black">
          <div>
            <div className="flex border-b border-black">
              <div className="w-[96px] shrink-0 border-r border-black bg-neutral-50 px-2.5 py-1.5 font-semibold text-neutral-700">
                {t("prn.totalItems")}
              </div>
              <div className="px-2.5 py-1.5 font-semibold">{purchase.lines.length}</div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-[96px] shrink-0 border-r border-black bg-neutral-50 px-2.5 py-1.5 font-semibold text-neutral-700">
                {t("prn.inWords")}
              </div>
              <div className="px-2.5 py-1.5 font-semibold text-[#19547b]">{amountInWords}</div>
            </div>
            {(purchase.remarks || shop.invoiceTerms) && (
              <div className="space-y-1 px-2.5 py-1.5 text-[9.5px] leading-snug text-neutral-700">
                {purchase.remarks && (
                  <div>
                    <span className="font-semibold text-black">{t("pgrn.remark")} </span>
                    {purchase.remarks}
                  </div>
                )}
                {shop.invoiceTerms && (
                  <div className="whitespace-pre-line">
                    <span className="font-semibold text-black">{t("prn.terms")} </span>
                    {shop.invoiceTerms}
                  </div>
                )}
              </div>
            )}
          </div>

          <table className="w-full border-collapse border-l border-black">
            <tbody>
              <TotalRow label={t("prn.taxable")} value={formatCurrency(purchase.taxableAmount)} />
              {purchase.isInterState ? (
                <TotalRow label={t("prn.igst")} value={formatCurrency(purchase.igstAmount)} />
              ) : (
                <>
                  <TotalRow label={t("prn.cgst")} value={formatCurrency(purchase.cgstAmount)} />
                  <TotalRow label={t("prn.sgst")} value={formatCurrency(purchase.sgstAmount)} />
                </>
              )}
              {purchase.freightCharges > 0 && (
                <TotalRow label={t("pgrn.freight")} value={formatCurrency(purchase.freightCharges)} />
              )}
              {purchase.otherCharges > 0 && (
                <TotalRow label={t("prn.otherCharges")} value={formatCurrency(purchase.otherCharges)} />
              )}
              {purchase.roundOff !== 0 && (
                <TotalRow label={t("prn.roundOff")} value={formatCurrency(purchase.roundOff)} />
              )}
              <TotalRow label={t("prn.grandTotal")} value={formatCurrency(purchase.grandTotal)} strong />
              <TotalRow label={t("pgrn.paid")} value={formatCurrency(purchase.paidAmount)} />
              {purchase.balanceAmount > 0 && (
                <TotalRow
                  label={t("pgrn.balancePayable")}
                  value={formatCurrency(purchase.balanceAmount)}
                  accent
                />
              )}
            </tbody>
          </table>
        </div>

        <SignatureRow shopName={shop.shopName} leftLabel={t("pgrn.receivedCheckedBy")} />

        {taxSummary.length > 0 && (
          <div className="border-t border-black px-2.5 py-2">
            <div className="mb-1 text-[8.5px] font-bold uppercase tracking-wide text-neutral-500">
              {t("prn.taxSummaryHsnWise")}
            </div>
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr className="text-neutral-500">
                  <th className="border-b border-neutral-300 py-0.5 text-left font-semibold">
                    {t("prn.hsnLabel")}
                  </th>
                  <th className="border-b border-neutral-300 py-0.5 text-right font-semibold">
                    {t("prn.taxable")}
                  </th>
                  <th className="border-b border-neutral-300 py-0.5 text-right font-semibold">
                    {t("prn.rate")}
                  </th>
                  <th className="border-b border-neutral-300 py-0.5 text-right font-semibold">
                    {t("prn.tax")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {taxSummary.map((row, index) => (
                  <tr key={index}>
                    <td className="py-0.5">{row.hsnCode ?? "-"}</td>
                    <td className="py-0.5 text-right tabular">{formatCurrency(row.taxableAmount)}</td>
                    <td className="py-0.5 text-right tabular">{row.gstPercent}%</td>
                    <td className="py-0.5 text-right tabular">{formatCurrency(row.totalTax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PrintFooter
          note={shop.invoiceFooterNote || t("pgrn.footerNote")}
        />
      </PrintFrame>
    </div>
  );
}
