"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoicePrint } from "@/features/transactions/hooks";
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
 * The printable tax invoice.
 *
 * Ordinary HTML printed through the browser rather than a generated PDF: the
 * shop picks its own paper, the layout is the one on screen, and there is no
 * second rendering path to keep in step. Everything outside the document carries
 * `no-print`. A bordered, letterhead-topped A4 form.
 */
export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const saleId = Number(params.id);

  const print = useInvoicePrint(saleId);

  useEffect(() => {
    if (!print.data) return;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [print.data]);

  if (print.isLoading) return <Skeleton className="h-[600px] w-full rounded-xl" />;

  const data = print.data;
  if (!data) return null;

  const { shop, invoice, taxSummary, amountInWords } = data;

  const meta: PrintMetaRow[] = [
    { label: t("inv.invoiceNo"), value: invoice.invoiceNumber },
    { label: t("common.date"), value: formatDate(invoice.invoiceDate) },
  ];

  return (
    <div className="mx-auto max-w-[860px] py-1">
      <div className="no-print mb-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push(`/sales/${saleId}`);
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
        <PrintLetterhead
          shop={shop}
          title={t("inv.taxInvoice")}
          meta={meta}
          badge={invoice.printCount > 1 ? t("prn.duplicateCopy") : undefined}
        />

        {/* ------------------------------ parties ------------------------------ */}
        <div className="grid grid-cols-2 border-b border-black">
          <PartyBox title={t("inv.billTo")} className="border-r border-black">
            <div className="text-[11.5px] font-bold">{invoice.customerName}</div>
            {invoice.village && <div className="text-neutral-700">{invoice.village}</div>}
            {invoice.walkInMobile && (
              <div className="text-neutral-700">
                {t("inv.mobilePrefix")} {invoice.walkInMobile}
              </div>
            )}
          </PartyBox>
          <PartyBox title={t("inv.invoiceDetails")}>
            <InfoRow label={t("inv.priceType")} value={invoice.saleType} labelClassName="w-[74px]" />
            <InfoRow label={t("inv.payment")} value={invoice.paymentType} labelClassName="w-[74px]" />
            {invoice.paymentType === "Credit" && invoice.dueDate && (
              <InfoRow
                label={t("prn.dueDate")}
                value={formatDate(invoice.dueDate)}
                labelClassName="w-[74px]"
              />
            )}
            <InfoRow label={t("common.status")} value={invoice.paymentStatus} labelClassName="w-[74px]" />
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
              <ItemTh className="w-16 text-right">{t("inv.mrp")}</ItemTh>
              <ItemTh className="w-16 text-right">{t("prn.rate")}</ItemTh>
              <ItemTh className="w-11 text-center">{t("prn.gst")}</ItemTh>
              <ItemTh className="w-20 text-right">{t("common.amount")}</ItemTh>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={line.salesDetailId}>
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
                <ItemTd className="text-right tabular">{formatCurrency(line.mrp)}</ItemTd>
                <ItemTd className="text-right tabular">{formatCurrency(line.rate)}</ItemTd>
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
              <div className="px-2.5 py-1.5 font-semibold">{invoice.lines.length}</div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-[96px] shrink-0 border-r border-black bg-neutral-50 px-2.5 py-1.5 font-semibold text-neutral-700">
                {t("prn.inWords")}
              </div>
              <div className="px-2.5 py-1.5 font-semibold text-[#19547b]">{amountInWords}</div>
            </div>
            {(shop.invoiceTerms || shop.upiId) && (
              <div className="space-y-1 px-2.5 py-1.5 text-[9.5px] leading-snug text-neutral-700">
                {shop.invoiceTerms && (
                  <div className="whitespace-pre-line">
                    <span className="font-semibold text-black">{t("prn.terms")} </span>
                    {shop.invoiceTerms}
                  </div>
                )}
                {shop.upiId && (
                  <div>
                    <span className="font-semibold text-black">{t("prn.payViaUpi")} </span>
                    {shop.upiId}
                  </div>
                )}
              </div>
            )}
          </div>

          <table className="w-full border-collapse border-l border-black">
            <tbody>
              <TotalRow label={t("prn.taxable")} value={formatCurrency(invoice.taxableAmount)} />
              {invoice.isInterState ? (
                <TotalRow label={t("prn.igst")} value={formatCurrency(invoice.igstAmount)} />
              ) : (
                <>
                  <TotalRow label={t("prn.cgst")} value={formatCurrency(invoice.cgstAmount)} />
                  <TotalRow label={t("prn.sgst")} value={formatCurrency(invoice.sgstAmount)} />
                </>
              )}
              {invoice.otherCharges > 0 && (
                <TotalRow label={t("prn.otherCharges")} value={formatCurrency(invoice.otherCharges)} />
              )}
              {invoice.roundOff !== 0 && (
                <TotalRow label={t("prn.roundOff")} value={formatCurrency(invoice.roundOff)} />
              )}
              <TotalRow label={t("prn.grandTotal")} value={formatCurrency(invoice.grandTotal)} strong />
              <TotalRow label={t("inv.received")} value={formatCurrency(invoice.receivedAmount)} />
              {invoice.balanceAmount > 0 && (
                <TotalRow label={t("inv.balanceDue")} value={formatCurrency(invoice.balanceAmount)} accent />
              )}
            </tbody>
          </table>
        </div>

        <SignatureRow shopName={shop.shopName} />

        {/* HSN / rate-wise tax breakup, required on the face of a GST invoice. */}
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

        <PrintFooter note={shop.invoiceFooterNote || t("inv.thankYouFooter")} />
      </PrintFrame>
    </div>
  );
}
