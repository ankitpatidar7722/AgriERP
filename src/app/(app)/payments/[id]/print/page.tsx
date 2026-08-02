"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReceiptPrint } from "@/features/transactions/hooks";
import {
  PrintFrame,
  PrintLetterhead,
  SectionBar,
  PartyBox,
  InfoRow,
  TotalRow,
  SignatureRow,
  PrintFooter,
  type PrintMetaRow,
} from "@/features/transactions/print-parts";
import { formatCurrency, formatDate } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/** A printable money receipt for a customer payment, reusing the invoice letterhead/frame. */
export default function ReceiptPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const paymentId = Number(params.id);

  const print = useReceiptPrint(paymentId);

  useEffect(() => {
    if (!print.data) return;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [print.data]);

  if (print.isLoading) return <Skeleton className="h-[500px] w-full rounded-xl" />;

  const data = print.data;
  if (!data) return null;

  const { shop, payment, amountInWords } = data;
  const cancelled = payment.status === "Cancelled";

  const meta: PrintMetaRow[] = [
    { label: t("rcpt.receiptNo"), value: payment.voucherNumber },
    { label: t("common.date"), value: formatDate(payment.paymentDate) },
  ];

  return (
    <div className="mx-auto max-w-[720px] py-1">
      <div className="no-print mb-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/accounts/customer-payment");
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
          title={t("rcpt.title")}
          meta={meta}
          badge={cancelled ? t("badge.status.cancelled") : undefined}
        />

        <div className="grid grid-cols-2 border-b border-black">
          <PartyBox title={t("rcpt.receivedFrom")} className="border-r border-black">
            <div className="text-[11.5px] font-bold">{payment.partyName}</div>
          </PartyBox>
          <PartyBox title={t("rcpt.receiptDetails")}>
            <InfoRow label={t("rcpt.mode")} value={payment.paymentModeName} labelClassName="w-[74px]" />
            {payment.referenceNumber && (
              <InfoRow label={t("rcpt.reference")} value={payment.referenceNumber} labelClassName="w-[74px]" />
            )}
            <InfoRow label={t("common.status")} value={payment.status} labelClassName="w-[74px]" />
          </PartyBox>
        </div>

        <SectionBar>{t("common.amount")}</SectionBar>

        <div className="grid grid-cols-[1fr_280px] border-t border-black">
          <div>
            <div className="flex border-b border-black">
              <div className="w-[96px] shrink-0 border-r border-black bg-neutral-50 px-2.5 py-1.5 font-semibold text-neutral-700">
                {t("prn.inWords")}
              </div>
              <div className="px-2.5 py-1.5 font-semibold text-[#19547b]">{amountInWords}</div>
            </div>
            {payment.remarks && (
              <div className="px-2.5 py-1.5 text-[10px] leading-snug text-neutral-700">
                <span className="font-semibold text-black">{t("rcpt.remarks")} </span>
                {payment.remarks}
              </div>
            )}
          </div>
          <table className="w-full border-collapse border-l border-black">
            <tbody>
              <TotalRow label={t("rcpt.amountReceived")} value={formatCurrency(payment.amount)} strong />
              {payment.allocatedAmount > 0 && (
                <TotalRow label={t("rcpt.appliedToBills")} value={formatCurrency(payment.allocatedAmount)} />
              )}
              {payment.unallocatedAmount > 0 && (
                <TotalRow label={t("rcpt.onAccount")} value={formatCurrency(payment.unallocatedAmount)} accent />
              )}
            </tbody>
          </table>
        </div>

        <SignatureRow shopName={shop.shopName} />
        <PrintFooter note={shop.invoiceFooterNote || t("rcpt.thankYouFooter")} />
      </PrintFrame>
    </div>
  );
}
