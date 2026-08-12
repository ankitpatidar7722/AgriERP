"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesOrderPrint } from "@/features/transactions/hooks";
import { formatDate } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/**
 * Printable Sales Order — the order-confirmation handed to a customer.
 *
 * Fully dynamic: the shop letterhead comes from ShopMaster (CompanyProfile
 * fills any licence/UPI/footer gaps), the customer block and lines from the
 * sale, and the totals are the sale's real GST (a posted invoice, not an
 * estimate). Same navy (#13294B) A4 layout family as the purchase order.
 *
 * Kept as a plain English document by design, matching the supplied template.
 */

const NAVY = "#13294B";
/** Letterhead logo. Swap this path to change the mark on every printed sales order. */
const LOGO_SRC = "/gemini-svg.svg";

const num2 = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });

export default function SalesOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const saleId = Number(params.id);

  const print = useSalesOrderPrint(saleId);

  // No auto-print: the preview opens first, and the browser dialog fires only
  // when the user clicks the Print button in the toolbar.

  if (print.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 p-4">
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-64 w-full rounded" />
      </div>
    );
  }

  const data = print.data;
  if (!data) return null;

  const { shop, sale, customer } = data;

  const shopAddress = [shop.address, shop.city, shop.stateName, shop.pincode].filter(Boolean).join(", ");
  const licences = [
    shop.seedLicenceNo && `Seed Lic: ${shop.seedLicenceNo}`,
    shop.pesticideLicenceNo && `Pest Lic: ${shop.pesticideLicenceNo}`,
    shop.fertilizerLicenceNo && `Fert Lic: ${shop.fertilizerLicenceNo}`,
  ].filter(Boolean);

  const totalQty = sale.lines.reduce((s, l) => s + l.quantity, 0);
  // The read model carries no credit-days field, so derive it from the due date.
  const creditDays =
    sale.paymentType === "Credit" && sale.dueDate
      ? Math.max(
          0,
          Math.round((new Date(sale.dueDate).getTime() - new Date(sale.invoiceDate).getTime()) / 86_400_000),
        )
      : null;
  const paymentMode =
    sale.paymentType === "Credit" ? `Credit${creditDays ? ` (${creditDays} Days)` : ""}` : "Cash";

  const terms = (shop.invoiceTerms ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div
      id="so-print-root"
      className="min-h-screen overflow-x-auto bg-slate-100 p-2 text-[11px] leading-tight text-slate-900 md:p-6"
    >
      <style>{`
        #so-print-doc {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
        }
        #so-print-doc, #so-print-doc * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #ffffff !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          #so-print-root { background: #ffffff !important; padding: 0 !important; overflow: visible !important; }
          #so-print-doc {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* -------------------------- action bar (screen) -------------------------- */}
      <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <Button variant="outline" size="sm" onClick={() => router.push(`/sales/${saleId}`)}>
          <ArrowLeft className="mr-1.5 size-4" />
          {t("common.back")}
        </Button>
        <Button size="sm" style={{ backgroundColor: NAVY }} className="text-white hover:opacity-90" onClick={() => window.print()}>
          <Printer className="mr-1.5 size-4" />
          {t("common.print")}
        </Button>
      </div>

      {/* --------------------------- document container -------------------------- */}
      <div
        id="so-print-doc"
        className="mx-auto border border-slate-300 bg-white shadow-lg"
        style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
      >
        {/* HEADER */}
        <div className="mb-3 flex items-center justify-between border-b-2 pb-3" style={{ borderColor: NAVY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt={shop.shopName} className="size-24 shrink-0 object-contain" />
          <div className="flex-1 px-4 text-center">
            <h1 className="text-xl font-extrabold uppercase tracking-wide" style={{ color: NAVY }}>
              {shop.shopName}
            </h1>
            <p className="text-xs font-bold uppercase tracking-tight text-emerald-700">
              Complete Agriculture Solutions (Seeds • Fertilizers • Pesticides • Insecticides)
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600">
              {shopAddress || "—"}
              {shop.phone && (
                <>
                  {" | "}
                  <strong>Mob:</strong> {shop.phone}
                </>
              )}
              {(shop.gstNumber || licences.length > 0) && (
                <>
                  <br />
                  {shop.gstNumber && (
                    <>
                      <strong>GSTIN:</strong> {shop.gstNumber}
                      {licences.length > 0 && " | "}
                    </>
                  )}
                  {licences.join(" | ")}
                </>
              )}
            </p>
          </div>
        </div>

        {/* TITLE */}
        <div
          className="mb-3 py-1 text-center text-xs font-bold uppercase tracking-widest text-white"
          style={{ backgroundColor: NAVY }}
        >
          Sales Order
        </div>

        {/* CUSTOMER & ORDER META */}
        <div className="mb-3 grid grid-cols-2 border text-xs" style={{ borderColor: NAVY }}>
          <div className="space-y-1 p-2" style={{ borderRight: `1px solid ${NAVY}` }}>
            <MetaRow label="Customer Name">
              <strong>{customer.name}</strong>
            </MetaRow>
            {customer.village && <MetaRow label="Village / City">{customer.village}</MetaRow>}
            {customer.mobile && <MetaRow label="Mobile No">{customer.mobile}</MetaRow>}
            {customer.gstNumber && <MetaRow label="GSTIN / Aadhar">{customer.gstNumber}</MetaRow>}
          </div>
          <div className="space-y-1 p-2">
            <MetaRow label="Order No">
              <strong>{sale.invoiceNumber}</strong>
            </MetaRow>
            <MetaRow label="Order Date">{formatDate(sale.invoiceDate)}</MetaRow>
            {sale.salesmanName && <MetaRow label="Sales Person">{sale.salesmanName}</MetaRow>}
            <MetaRow label="Payment Mode">
              <strong>{paymentMode}</strong>
            </MetaRow>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table className="mb-3 w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="text-[11px] font-bold text-white" style={{ backgroundColor: NAVY }}>
              <Th className="w-8">Sr</Th>
              <Th className="text-left">Item Description</Th>
              <Th className="w-12">HSN</Th>
              <Th className="w-20">Batch No</Th>
              <Th className="w-12">Qty</Th>
              <Th className="w-10">Unit</Th>
              <Th className="w-16 text-right">Rate (₹)</Th>
              <Th className="w-10">Disc%</Th>
              <Th className="w-10">GST%</Th>
              <Th className="w-24 text-right">Amount (₹)</Th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((line, i) => (
              <tr key={line.salesDetailId || i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                <Td className="text-center">{i + 1}</Td>
                <Td className="px-2">
                  <strong className="text-slate-900">{line.itemName}</strong>
                </Td>
                <Td className="text-center">{line.hsnCode || "—"}</Td>
                <Td className="text-center">{line.batchNumber || "—"}</Td>
                <Td className="text-center">
                  {qtyFmt(line.quantity)}
                  {line.freeQuantity > 0 && <span className="text-emerald-700"> +{qtyFmt(line.freeQuantity)}</span>}
                </Td>
                <Td className="text-center">{line.unitCode}</Td>
                <Td className="px-2 text-right">{num2(line.rate)}</Td>
                <Td className="text-center">{line.discountPercent > 0 ? num2(line.discountPercent) : "—"}</Td>
                <Td className="text-center">{line.gstPercent}%</Td>
                <Td className="px-2 text-right font-semibold">{num2(line.lineTotal)}</Td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div className="mb-3 grid grid-cols-12 gap-3 text-xs">
          <div className="col-span-7 space-y-2">
            <div className="border p-2" style={{ borderColor: NAVY }}>
              <div className="mb-1 border-b pb-0.5 text-[11px] font-bold uppercase" style={{ color: NAVY, borderColor: NAVY }}>
                Payment Details
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div>
                  <strong>Advance Received:</strong> ₹ {num2(sale.receivedAmount)}
                </div>
                <div>
                  <strong>Outstanding:</strong> ₹ {num2(sale.balanceAmount)}
                </div>
                {sale.dueDate && (
                  <div className="col-span-2">
                    <strong>Payment Due Date:</strong> {formatDate(sale.dueDate)}
                  </div>
                )}
              </div>
            </div>

            <div className="border p-2" style={{ borderColor: NAVY }}>
              <div className="mb-1 border-b pb-0.5 text-[11px] font-bold uppercase" style={{ color: NAVY, borderColor: NAVY }}>
                Remarks / Instructions
              </div>
              <p className="whitespace-pre-line text-[11px] text-slate-700">
                {sale.remarks?.trim() || "Please collect goods against this order; batch and expiry are printed above."}
              </p>
            </div>
          </div>

          <div className="col-span-5">
            <table className="w-full divide-y divide-slate-200 border text-[11px]" style={{ borderColor: NAVY }}>
              <tbody>
                <SumRow label="Total Items / Qty">
                  <strong>{sale.lines.length} Lines / {qtyFmt(totalQty)} Units</strong>
                </SumRow>
                <SumRow label="Sub Total (Gross)">₹ {num2(sale.grossAmount)}</SumRow>
                {sale.discountAmount > 0 && (
                  <SumRow label="Total Discount">
                    <span className="text-red-600">- ₹ {num2(sale.discountAmount)}</span>
                  </SumRow>
                )}
                <SumRow label="Taxable Amount">₹ {num2(sale.taxableAmount)}</SumRow>
                {sale.isInterState ? (
                  <SumRow label="IGST Total">₹ {num2(sale.igstAmount)}</SumRow>
                ) : (
                  <>
                    <SumRow label="CGST Total">₹ {num2(sale.cgstAmount)}</SumRow>
                    <SumRow label="SGST Total">₹ {num2(sale.sgstAmount)}</SumRow>
                  </>
                )}
                {sale.otherCharges > 0 && <SumRow label="Other Charges">₹ {num2(sale.otherCharges)}</SumRow>}
                {sale.roundOff !== 0 && (
                  <SumRow label="Round Off">
                    {sale.roundOff > 0 ? "+ " : "- "}₹ {num2(Math.abs(sale.roundOff))}
                  </SumRow>
                )}
                <tr className="text-xs font-bold text-white" style={{ backgroundColor: NAVY }}>
                  <td className="px-2 py-1.5">GRAND TOTAL:</td>
                  <td className="px-2 py-1.5 text-right">₹ {num2(sale.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-[10px] text-slate-500">
              <strong>In words:</strong> {data.amountInWords}
            </p>
          </div>
        </div>

        {/* TERMS */}
        <div className="mb-8 border border-slate-300 p-2 text-[10px] text-slate-600">
          <div className="mb-0.5 font-bold" style={{ color: NAVY }}>
            Terms &amp; Conditions:
          </div>
          <ol className="list-decimal space-y-0.5 pl-4">
            {(terms.length > 0
              ? terms
              : [
                  "Goods once sold will not be taken back without a valid batch-testing discrepancy report within 7 days.",
                  "All agricultural inputs supplied comply with Government seed and fertilizer quality-control regulations.",
                  "Interest @ 18% p.a. will be charged on overdue payments beyond the agreed credit limit date.",
                  "Subject to local jurisdiction only. E.&O.E.",
                ]
            ).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>

        {/* SIGNATURES */}
        <div className="grid grid-cols-4 gap-2 pt-6 text-center text-[11px] text-slate-800">
          <Sign title="Prepared By" />
          <Sign title="Checked By" />
          <Sign title="Customer Signature" />
          <Sign title={`For ${shop.shopName}`} sub="(Authorized Signatory)" />
        </div>

        {shop.invoiceFooterNote && (
          <p className="mt-4 border-t border-slate-200 pt-2 text-center text-[9px] text-slate-500">
            {shop.invoiceFooterNote}
          </p>
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="inline-block w-28 font-bold" style={{ color: NAVY }}>
        {label}:
      </span>{" "}
      {children}
    </div>
  );
}

function Th({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <th className={`border border-slate-400 px-1 py-1 text-center ${className}`}>{children}</th>;
}

function Td({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <td className={`border border-slate-300 py-1 ${className}`}>{children}</td>;
}

function SumRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="px-2 py-1 text-slate-700">{label}:</td>
      <td className="px-2 py-1 text-right">{children}</td>
    </tr>
  );
}

function Sign({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="mx-2 mb-1 border-t border-dashed border-slate-400" />
      <span>{title}</span>
      {sub && <span className="block text-[9px] text-slate-500">{sub}</span>}
    </div>
  );
}
