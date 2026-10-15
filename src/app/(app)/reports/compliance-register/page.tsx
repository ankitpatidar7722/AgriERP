"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvoiceSettings } from "@/features/masters/hooks";
import { useComplianceRegister } from "@/features/reports/hooks";
import { formatDate, formatQuantity } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

const NAVY = "#13294B";
const LOGO_SRC = "/gemini-svg.svg";
const ALL = "ALL";

function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ComplianceRegisterPage() {
  const router = useRouter();
  const t = useT();

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(fmtISO(monthStart));
  const [to, setTo] = useState(fmtISO(today));
  const [group, setGroup] = useState(ALL);
  const [direction, setDirection] = useState(ALL);

  const shop = useInvoiceSettings();
  const register = useComplianceRegister({
    fromDate: from,
    toDate: to,
    groupCode: group === ALL ? null : group,
    direction: direction === ALL ? null : direction,
  });

  const rows = register.data ?? [];
  const totalIn = rows.reduce((sum, r) => sum + r.inwardQty, 0);
  const totalOut = rows.reduce((sum, r) => sum + r.outwardQty, 0);

  const s = shop.data;
  const shopName = s?.shopName || "My Agriculture Shop";
  const shopAddress = [s?.addressLine1, s?.addressLine2, s?.city, s?.stateName, s?.pincode]
    .filter(Boolean)
    .join(", ");
  const licences = [
    s?.pesticideLicenceNo && `${t("inv.pesticideLic")}: ${s.pesticideLicenceNo}`,
    s?.seedLicenceNo && `${t("inv.seedLic")}: ${s.seedLicenceNo}`,
    s?.fertilizerLicenceNo && `${t("inv.fertilizerLic")}: ${s.fertilizerLicenceNo}`,
  ].filter(Boolean);

  return (
    <div
      id="creg-print-root"
      className="min-h-screen overflow-x-auto bg-slate-100 p-2 text-[11px] leading-tight text-slate-900 md:p-6"
    >
      <style>{`
        #creg-print-doc { width: 297mm; min-height: 210mm; padding: 10mm; }
        #creg-print-doc, #creg-print-doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body { background: #ffffff !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          #creg-print-root { background: #ffffff !important; padding: 0 !important; overflow: visible !important; }
          #creg-print-doc { width: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        }
      `}</style>

      {/* ----------------------------- filter bar ------------------------------ */}
      <div className="no-print mx-auto mb-4 flex w-[297mm] max-w-full flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <Button variant="outline" size="sm" onClick={() => router.push("/reports")}>
          <ArrowLeft className="mr-1.5 size-4" />
          {t("common.back")}
        </Button>

        <Labeled label={t("common.fromDate")}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
        </Labeled>
        <Labeled label={t("common.toDate")}>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
        </Labeled>

        <Labeled label={t("creg.group")}>
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("creg.allRegulated")}</SelectItem>
              <SelectItem value="PRDGRP">{t("creg.pesticide")}</SelectItem>
              <SelectItem value="SEDGRP">{t("creg.seed")}</SelectItem>
              <SelectItem value="FRTGRP">{t("creg.fertilizer")}</SelectItem>
            </SelectContent>
          </Select>
        </Labeled>

        <Labeled label={t("creg.direction")}>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("creg.both")}</SelectItem>
              <SelectItem value="Inward">{t("creg.inward")}</SelectItem>
              <SelectItem value="Outward">{t("creg.outward")}</SelectItem>
            </SelectContent>
          </Select>
        </Labeled>

        <div className="ml-auto">
          <Button
            size="sm"
            style={{ backgroundColor: NAVY }}
            className="text-white hover:opacity-90"
            onClick={() => window.print()}
            disabled={rows.length === 0}
          >
            <Printer className="mr-1.5 size-4" />
            {t("common.print")}
          </Button>
        </div>
      </div>

      {/* --------------------------- document container ------------------------- */}
      <div
        id="creg-print-doc"
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
                {shopName}
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
                <div className="text-[9px] font-medium text-slate-700">{licences.join("   |   ")}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold" style={{ color: NAVY }}>
              {t("creg.title")}
            </div>
            <div className="max-w-[300px] text-[9px] text-slate-500">{t("creg.subtitle")}</div>
            <div className="mt-1 text-[10px]">
              <strong>{t("pb.period")}:</strong> {formatDate(from)} – {formatDate(to)}
            </div>
          </div>
        </div>

        {/* REGISTER */}
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="text-white" style={{ backgroundColor: NAVY }}>
              <th className="border border-slate-400 px-1 py-1 text-left">#</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("pb.date")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.type")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.voucher")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.party")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.item")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.batch")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.mfg")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.exp")}</th>
              <th className="border border-slate-400 px-1 py-1 text-right">{t("creg.inQty")}</th>
              <th className="border border-slate-400 px-1 py-1 text-right">{t("creg.outQty")}</th>
              <th className="border border-slate-400 px-1 py-1 text-left">{t("creg.unit")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.direction}-${r.voucherNumber}-${r.itemId}-${i}`}>
                <td className="border border-slate-300 px-1 py-0.5">{i + 1}</td>
                <td className="whitespace-nowrap border border-slate-300 px-1 py-0.5">{formatDate(r.date)}</td>
                <td className="border border-slate-300 px-1 py-0.5">{r.voucherType}</td>
                <td className="border border-slate-300 px-1 py-0.5">
                  {r.voucherNumber}
                  {r.supplierInvoiceNumber ? (
                    <span className="text-slate-500"> / {r.supplierInvoiceNumber}</span>
                  ) : null}
                </td>
                <td className="border border-slate-300 px-1 py-0.5">
                  {r.partyName}
                  {r.partyGst ? <span className="block text-slate-500">{r.partyGst}</span> : null}
                </td>
                <td className="border border-slate-300 px-1 py-0.5">
                  {r.itemName}
                  <span className="block text-slate-500">{r.itemCode}</span>
                </td>
                <td className="border border-slate-300 px-1 py-0.5">{r.batchNumber ?? "-"}</td>
                <td className="whitespace-nowrap border border-slate-300 px-1 py-0.5">
                  {r.manufacturingDate ? formatDate(r.manufacturingDate) : "-"}
                </td>
                <td className="whitespace-nowrap border border-slate-300 px-1 py-0.5">
                  {r.expiryDate ? formatDate(r.expiryDate) : "-"}
                </td>
                <td className="border border-slate-300 px-1 py-0.5 text-right tabular">
                  {r.inwardQty > 0 ? formatQuantity(r.inwardQty) : ""}
                </td>
                <td className="border border-slate-300 px-1 py-0.5 text-right tabular">
                  {r.outwardQty > 0 ? formatQuantity(r.outwardQty) : ""}
                </td>
                <td className="border border-slate-300 px-1 py-0.5">{r.unitCode ?? ""}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="border border-slate-300 px-2 py-6 text-center text-slate-500" colSpan={12}>
                  {register.isLoading ? "…" : t("creg.noRows")}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-bold" style={{ backgroundColor: "#eef2f7" }}>
                <td className="border border-slate-400 px-1 py-1" colSpan={9}>
                  {t("creg.totals")} ({rows.length} {t("creg.rows")})
                </td>
                <td className="border border-slate-400 px-1 py-1 text-right tabular">{formatQuantity(totalIn)}</td>
                <td className="border border-slate-400 px-1 py-1 text-right tabular">{formatQuantity(totalOut)}</td>
                <td className="border border-slate-400 px-1 py-1" />
              </tr>
            </tfoot>
          )}
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

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
