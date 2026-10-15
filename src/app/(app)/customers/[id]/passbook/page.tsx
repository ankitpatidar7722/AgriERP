"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCustomerLedger,
  useCustomerProfile,
  useInvoiceSettings,
} from "@/features/masters/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { useLang, useT } from "@/features/i18n/provider";
import { buildKhataMessage, openWhatsApp } from "@/lib/whatsapp";
import { toast } from "@/lib/ag-toast";

const NAVY = "#13294B";
/** Letterhead logo - same mark as the printed invoices. */
const LOGO_SRC = "/gemini-svg.svg";

/** Running balance sign: positive = customer owes (DR), negative = advance (CR). */
function balanceText(v: number) {
  if (v === 0) return "0.00";
  return `${formatCurrency(Math.abs(v))} ${v < 0 ? "CR" : "DR"}`;
}

export default function CustomerPassbookPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { lang } = useLang();
  const customerId = Number(params.id);

  const profile = useCustomerProfile(customerId);
  const ledger = useCustomerLedger(customerId);
  const shop = useInvoiceSettings();

  if (ledger.isLoading || profile.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-64 w-full rounded" />
      </div>
    );
  }

  const data = ledger.data;
  const p = profile.data;
  const s = shop.data;
  if (!data) return null;

  const rows = data.rows ?? [];
  const shopName = s?.shopName || "";
  const shopAddress = [s?.addressLine1, s?.addressLine2, s?.city, s?.stateName, s?.pincode]
    .filter(Boolean)
    .join(", ");
  const licences = [
    s?.seedLicenceNo && `Seed Lic: ${s.seedLicenceNo}`,
    s?.pesticideLicenceNo && `Pest Lic: ${s.pesticideLicenceNo}`,
    s?.fertilizerLicenceNo && `Fert Lic: ${s.fertilizerLicenceNo}`,
  ].filter(Boolean);

  function sendWhatsApp() {
    const recent = rows.slice(-6).map((r) => ({
      dateText: formatDate(r.transactionDate),
      particular: `${r.voucherType}${r.voucherNumber ? ` ${r.voucherNumber}` : ""}`,
      debit: r.debit,
      credit: r.credit,
    }));
    const msg = buildKhataMessage({
      name: data!.customerName,
      recent,
      closingBalance: data!.closingBalance,
      shopName,
      lang,
    });
    if (!openWhatsApp(p?.mobile, msg)) toast.error(t("wa.noMobile"));
  }

  return (
    <div
      id="pb-print-root"
      className="min-h-screen overflow-x-auto bg-slate-100 p-2 text-[11px] leading-tight text-slate-900 md:p-6"
    >
      <style>{`
        #pb-print-doc { width: 210mm; min-height: 297mm; padding: 10mm; }
        #pb-print-doc, #pb-print-doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #ffffff !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          #pb-print-root { background: #ffffff !important; padding: 0 !important; overflow: visible !important; }
          #pb-print-doc { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>

      {/* -------------------------- action bar (screen) ------------------------- */}
      <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <Button variant="outline" size="sm" onClick={() => router.push(`/customers/${customerId}`)}>
          <ArrowLeft className="mr-1.5 size-4" />
          {t("common.back")}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#25D366]/50 text-[#128C7E] hover:bg-[#25D366]/10"
            onClick={sendWhatsApp}
          >
            <MessageCircle className="mr-1.5 size-4" />
            {t("pb.waStatement")}
          </Button>
          <Button
            size="sm"
            style={{ backgroundColor: NAVY }}
            className="text-white hover:opacity-90"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 size-4" />
            {t("common.print")}
          </Button>
        </div>
      </div>

      {/* --------------------------- document container ------------------------- */}
      <div
        id="pb-print-doc"
        className="mx-auto border border-slate-300 bg-white shadow-lg"
        style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
      >
        {/* HEADER */}
        <div className="mb-3 flex items-start justify-between border-b-2 pb-3" style={{ borderColor: NAVY }}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_SRC} alt={shopName} className="size-16 shrink-0 object-contain" />
            <div>
              <div className="text-lg font-bold" style={{ color: NAVY }}>
                {shopName || "My Agriculture Shop"}
              </div>
              {shopAddress && <div className="text-[10px] text-slate-600">{shopAddress}</div>}
              <div className="text-[10px] text-slate-600">
                {s?.phone && (
                  <span>
                    <strong>Mob:</strong> {s.phone}{" "}
                  </span>
                )}
                {s?.gstNumber && (
                  <span>
                    <strong>GSTIN:</strong> {s.gstNumber}
                  </span>
                )}
              </div>
              {licences.length > 0 && (
                <div className="text-[9px] text-slate-500">{licences.join("  |  ")}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold" style={{ color: NAVY }}>
              {t("pb.title")}
            </div>
            <div className="text-[10px] text-slate-500">{t("pb.subtitle")}</div>
          </div>
        </div>

        {/* CUSTOMER + PERIOD */}
        <div className="mb-3 grid grid-cols-2 gap-3 text-[11px]">
          <div className="border border-slate-300 p-2">
            <div className="font-bold" style={{ color: NAVY }}>
              {data.customerName}
            </div>
            <div className="text-slate-600">{data.customerCode}</div>
            {p?.village && (
              <div className="text-slate-600">
                {t("pb.village")}: {p.village}
              </div>
            )}
            {p?.mobile && (
              <div className="text-slate-600">
                <strong>Mob:</strong> {p.mobile}
              </div>
            )}
          </div>
          <div className="border border-slate-300 p-2 text-right">
            <div>
              <strong>{t("pb.period")}:</strong> {t("pb.allTime")}
            </div>
            <div className="text-slate-600">
              {t("pb.asOn")}: {formatDate(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* LEDGER */}
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="text-white" style={{ backgroundColor: NAVY }}>
              <th className="border border-slate-400 px-2 py-1 text-left">{t("pb.date")}</th>
              <th className="border border-slate-400 px-2 py-1 text-left">{t("pb.particulars")}</th>
              <th className="border border-slate-400 px-2 py-1 text-left">{t("pb.voucher")}</th>
              <th className="border border-slate-400 px-2 py-1 text-right">{t("pb.debit")}</th>
              <th className="border border-slate-400 px-2 py-1 text-right">{t("pb.credit")}</th>
              <th className="border border-slate-400 px-2 py-1 text-right">{t("pb.balance")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 font-semibold">
              <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                {t("pb.opening")}
              </td>
              <td className="border border-slate-300 px-2 py-1" />
              <td className="border border-slate-300 px-2 py-1" />
              <td className="border border-slate-300 px-2 py-1 text-right tabular">
                {balanceText(data.openingBalance)}
              </td>
            </tr>
            {rows.map((r) => (
              <tr key={r.seq}>
                <td className="whitespace-nowrap border border-slate-300 px-2 py-1">
                  {formatDate(r.transactionDate)}
                </td>
                <td className="border border-slate-300 px-2 py-1">
                  {r.voucherType}
                  {r.narration ? <span className="text-slate-500"> — {r.narration}</span> : null}
                </td>
                <td className="border border-slate-300 px-2 py-1">{r.voucherNumber ?? "-"}</td>
                <td className="border border-slate-300 px-2 py-1 text-right tabular">
                  {r.debit > 0 ? formatCurrency(r.debit) : ""}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right tabular">
                  {r.credit > 0 ? formatCurrency(r.credit) : ""}
                </td>
                <td className="border border-slate-300 px-2 py-1 text-right tabular">
                  {balanceText(r.runningBalance)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="border border-slate-300 px-2 py-4 text-center text-slate-500" colSpan={6}>
                  {t("pb.noEntries")}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold" style={{ backgroundColor: "#eef2f7" }}>
              <td className="border border-slate-400 px-2 py-1.5" colSpan={3}>
                {t("pb.totals")}
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular">
                {formatCurrency(data.totalDebit)}
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular">
                {formatCurrency(data.totalCredit)}
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular" />
            </tr>
            <tr className="font-bold text-white" style={{ backgroundColor: NAVY }}>
              <td className="border border-slate-400 px-2 py-1.5" colSpan={5}>
                {t("pb.closing")}
              </td>
              <td className="border border-slate-400 px-2 py-1.5 text-right tabular">
                {balanceText(data.closingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {s?.invoiceFooterNote && (
          <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[9px] text-slate-500">
            {s.invoiceFooterNote}
          </p>
        )}
      </div>
    </div>
  );
}
