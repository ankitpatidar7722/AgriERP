"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePurchaseOrderPrint } from "@/features/transactions/hooks";
import type { PurchaseOrderStatus } from "@/features/transactions/types";
import { formatDate } from "@/lib/format";
import { useT } from "@/features/i18n/provider";

/**
 * Printable Purchase Order — a B2B procurement document sent to the supplier.
 *
 * The whole sheet is dynamic: the shop letterhead comes from ShopMaster (with
 * CompanyProfile filling any licence/UPI/footer gaps), the supplier block and
 * lines from the order, and the totals are the backend's estimate off each
 * line's GST slab. A purchase order is a booking, so the tax shown here is an
 * estimate — the binding figure is struck on the goods-receipt note.
 *
 * The layout follows the supplied template: navy (#13294B) letterhead, a navy
 * item table, a two-column meta grid, an estimate summary and a signature row.
 * Kept as a plain English document by design — a supplier-facing PO is
 * conventionally English, and the template is too.
 */

const NAVY = "#13294B";
/** Letterhead logo. Swap this path to change the mark on every printed PO. */
const LOGO_SRC = "/gemini-svg.svg";

/** Number with Indian grouping and exactly two decimals (rates, amounts). */
const num2 = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Quantity: Indian grouping, up to three decimals, no forced trailing zeros. */
const qty = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 3 });

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  Draft: "DRAFT",
  Open: "CONFIRMED",
  Partial: "PARTIALLY RECEIVED",
  Received: "RECEIVED",
  Cancelled: "CANCELLED",
};

export default function PurchaseOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const orderId = Number(params.id);

  const print = usePurchaseOrderPrint(orderId);

  // No auto-print: the preview opens first, and the browser dialog fires only
  // when the user clicks the Print button in the toolbar.

  if (print.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <Skeleton className="h-24 w-full rounded" />
        <Skeleton className="h-64 w-full rounded" />
      </div>
    );
  }

  const data = print.data;
  if (!data) return null;

  const { shop, order, supplier } = data;

  const shopAddress = [shop.address, shop.city, shop.stateName, shop.pincode]
    .filter(Boolean)
    .join(", ");
  const licences = [
    shop.seedLicenceNo && `Seed Lic: ${shop.seedLicenceNo}`,
    shop.pesticideLicenceNo && `Pest Lic: ${shop.pesticideLicenceNo}`,
    shop.fertilizerLicenceNo && `Fert Lic: ${shop.fertilizerLicenceNo}`,
  ].filter(Boolean);

  const supplierAddress = [supplier.address, supplier.city, supplier.stateName, supplier.pincode]
    .filter(Boolean)
    .join(", ");
  const supplierContact = [supplier.phone, supplier.email].filter(Boolean).join(" | ");

  const terms = (shop.invoiceTerms ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div
      id="po-print-root"
      className="min-h-screen overflow-x-auto bg-slate-100 p-2 text-[11px] leading-tight text-slate-900 md:p-6"
    >
      <style>{`
        /* On screen the document is a true A4 sheet (210x297mm) so it looks
           exactly as it prints; on paper the @page margin does the insetting. */
        #po-print-doc {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm;
        }
        #po-print-doc, #po-print-doc * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { background: #ffffff !important; }
          main { padding: 0 !important; }
          .no-print { display: none !important; }
          #po-print-root { background: #ffffff !important; padding: 0 !important; overflow: visible !important; }
          #po-print-doc {
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
        <Button variant="outline" size="sm" onClick={() => router.push(`/purchases/orders/${orderId}`)}>
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
        id="po-print-doc"
        className="mx-auto border border-slate-300 bg-white shadow-lg"
        style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
      >
        {/* HEADER */}
        <div className="mb-2 flex items-center justify-between border-b-2 pb-3" style={{ borderColor: NAVY }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt={shop.shopName} className="size-24 shrink-0 object-contain" />

          <div className="flex-1 px-4 text-center">
            <h1 className="text-xl font-black uppercase tracking-wide" style={{ color: NAVY }}>
              {shop.shopName}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-tight text-emerald-700">
              Complete Agriculture Solutions (Seeds • Fertilizers • Pesticides • Micronutrients)
            </p>
            <p className="mt-1 text-[10px] text-slate-600">
              {shopAddress || "—"}
              <br />
              {shop.phone && (
                <>
                  <strong>Mob:</strong> {shop.phone}
                  {shop.email && " | "}
                </>
              )}
              {shop.email && (
                <>
                  <strong>Email:</strong> {shop.email}
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

          <div className="w-16 shrink-0 text-right text-[9px] text-slate-400">
            ORIGINAL
            <br />
            FOR SUPPLIER
          </div>
        </div>

        {/* TITLE */}
        <div
          className="mb-3 rounded-sm py-1 text-center text-xs font-bold uppercase tracking-widest text-white"
          style={{ backgroundColor: NAVY }}
        >
          Purchase Order
        </div>

        {/* META GRID */}
        <div className="mb-3 grid grid-cols-2 divide-x divide-slate-300 border border-slate-300 text-[10px]">
          {/* Supplier */}
          <div className="space-y-1 p-2">
            <div
              className="mb-1 flex justify-between border-b border-slate-200 pb-1 text-[11px] font-bold uppercase"
              style={{ color: NAVY }}
            >
              <span>Supplier Details</span>
              {supplier.supplierCode && (
                <span className="font-normal text-slate-500">
                  Code: <strong className="text-slate-800">{supplier.supplierCode}</strong>
                </span>
              )}
            </div>
            <MetaRow label="Vendor Name" w="w-24">
              <strong className="text-slate-900">{supplier.supplierName}</strong>
            </MetaRow>
            {supplier.gstNumber && (
              <MetaRow label="GSTIN / UIN" w="w-24">
                {supplier.gstNumber}
              </MetaRow>
            )}
            {supplierAddress && (
              <MetaRow label="Address" w="w-24">
                {supplierAddress}
              </MetaRow>
            )}
            {supplier.contactPerson && (
              <MetaRow label="Contact Person" w="w-24">
                {supplier.contactPerson}
              </MetaRow>
            )}
            {supplierContact && (
              <MetaRow label="Phone / Email" w="w-24">
                {supplierContact}
              </MetaRow>
            )}
          </div>

          {/* Order specs */}
          <div className="space-y-1 p-2">
            <div
              className="mb-1 flex justify-between border-b border-slate-200 pb-1 text-[11px] font-bold uppercase"
              style={{ color: NAVY }}
            >
              <span>Order Specifications</span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <MetaRow label="PO Number" w="w-28">
              <strong className="text-slate-900">{order.orderNumber}</strong>
            </MetaRow>
            <MetaRow label="PO Date" w="w-28">
              {formatDate(order.orderDate)}
            </MetaRow>
            {order.expectedDate && (
              <MetaRow label="Exp. Delivery Date" w="w-28">
                <strong>{formatDate(order.expectedDate)}</strong>
              </MetaRow>
            )}
            <MetaRow label="Payment Terms" w="w-28">
              {supplier.paymentTermDays > 0 ? `${supplier.paymentTermDays} Days Net Credit` : "Advance / As agreed"}
            </MetaRow>
            {data.deliveryLocationName && (
              <MetaRow label="Delivery Location" w="w-28">
                {data.deliveryLocationName}
              </MetaRow>
            )}
          </div>
        </div>

        {/* ITEM TABLE */}
        <table className="mb-3 w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: NAVY }}>
              <Th className="w-6">#</Th>
              <Th className="w-16">Code</Th>
              <Th className="text-left">Product Description</Th>
              <Th className="w-12">HSN</Th>
              <Th className="w-[46px]">Packs</Th>
              <Th className="w-[50px]">Qty/Pk</Th>
              <Th className="w-[46px]">Total</Th>
              <Th className="w-10">Unit</Th>
              <Th className="w-16 text-right">Rate (₹)</Th>
              <Th className="w-10">GST%</Th>
              <Th className="w-24 text-right">Amount (₹)</Th>
            </tr>
          </thead>
          <tbody className="text-[10px]">
            {order.lines.map((line, i) => {
              const desc = [line.itemGroupName, line.itemSubGroupName].filter(Boolean).join(" • ");
              return (
                <tr key={line.purchaseOrderDetailId || i} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                  <Td className="text-center">{i + 1}</Td>
                  <Td className="text-center font-mono text-slate-600">{line.itemCode || "—"}</Td>
                  <Td className="px-2">
                    <strong className="text-slate-900">{line.itemName}</strong>
                    {desc && <span className="block text-[8.5px] text-slate-500">{desc}</span>}
                    {line.itemRemark && (
                      <span className="block text-[8.5px] italic text-slate-500">{line.itemRemark}</span>
                    )}
                  </Td>
                  <Td className="text-center">{line.hsnCode || "—"}</Td>
                  <Td className="text-center">{qty(line.noOfPacks)}</Td>
                  <Td className="text-center">{qty(line.qtyPerPack)}</Td>
                  <Td className="text-center font-bold">{qty(line.orderedQty)}</Td>
                  <Td className="text-center">{line.unitCode}</Td>
                  <Td className="px-1.5 text-right">{num2(line.rate)}</Td>
                  <Td className="text-center">{line.gstPercent}%</Td>
                  <Td className="px-2 text-right font-semibold">{num2(line.estimatedAmount)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* NOTES + SUMMARY */}
        <div className="mb-3 grid grid-cols-12 gap-3">
          <div className="col-span-7 space-y-2">
            <div className="border border-slate-300 bg-white p-2">
              <div className="mb-1 border-b border-slate-200 pb-0.5 text-[10px] font-bold uppercase" style={{ color: NAVY }}>
                Delivery &amp; Notes
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9.5px] text-slate-700">
                {data.deliveryLocationName && (
                  <div className="col-span-2">
                    <strong>Delivery Location:</strong> {data.deliveryLocationName}
                  </div>
                )}
                {order.expectedDate && (
                  <div>
                    <strong>Expected By:</strong> {formatDate(order.expectedDate)}
                  </div>
                )}
                <div>
                  <strong>Payment:</strong>{" "}
                  {supplier.paymentTermDays > 0 ? `${supplier.paymentTermDays} Days Credit` : "As agreed"}
                </div>
              </div>
            </div>

            <div className="border border-slate-300 bg-white p-2">
              <div className="mb-1 border-b border-slate-200 pb-0.5 text-[10px] font-bold uppercase" style={{ color: NAVY }}>
                Special Remarks &amp; Internal Notes
              </div>
              <p className="whitespace-pre-line text-[9.5px] text-slate-700">
                {order.remarks?.trim() ||
                  "Please supply strictly as per the specifications, rates and HSN listed above."}
              </p>
            </div>
          </div>

          {/* Financial estimate */}
          <div className="col-span-5">
            <table className="w-full divide-y divide-slate-200 border border-slate-300 text-[10px]">
              <tbody>
                <SumRow label="Total Lines / Packs">
                  <strong className="text-slate-800">
                    {order.lines.length} Lines / {data.totalPacks} Packs
                  </strong>
                </SumRow>
                <SumRow label="Total Quantity">
                  <strong className="text-slate-800">{qty(order.totalQty)} Units</strong>
                </SumRow>
                <SumRow label="Subtotal (Gross)">
                  <span className="font-mono">₹ {num2(data.subTotal)}</span>
                </SumRow>
                <tr className="bg-slate-50">
                  <td className="px-2 py-1 font-semibold text-slate-800">Taxable Amount:</td>
                  <td className="px-2 py-1 text-right font-mono font-semibold">₹ {num2(data.taxableAmount)}</td>
                </tr>
                {!data.isInterState && (
                  <>
                    <SumRow label="CGST Total">
                      <span className="font-mono">₹ {num2(data.cgstAmount)}</span>
                    </SumRow>
                    <SumRow label="SGST Total">
                      <span className="font-mono">₹ {num2(data.sgstAmount)}</span>
                    </SumRow>
                  </>
                )}
                {data.isInterState && (
                  <SumRow label="IGST Total">
                    <span className="font-mono">₹ {num2(data.igstAmount)}</span>
                  </SumRow>
                )}
                {data.roundOff !== 0 && (
                  <SumRow label="Round Off">
                    <span className="font-mono">
                      {data.roundOff > 0 ? "+ " : "- "}₹ {num2(Math.abs(data.roundOff))}
                    </span>
                  </SumRow>
                )}
                <tr className="text-[11px] font-bold text-white" style={{ backgroundColor: NAVY }}>
                  <td className="px-2 py-1.5">GRAND TOTAL (Est.):</td>
                  <td className="px-2 py-1.5 text-right font-mono text-xs">₹ {num2(data.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-1 text-[9px] text-slate-500">
              <strong>In words:</strong> {data.amountInWords}
            </p>
            <p className="mt-0.5 text-[8.5px] italic text-slate-400">
              GST shown is an estimate; the binding tax is set on the goods-receipt note.
            </p>
          </div>
        </div>

        {/* TERMS */}
        <div className="mb-6 border border-slate-300 bg-slate-50/50 p-2 text-[9px] text-slate-600">
          <div className="mb-0.5 font-bold uppercase tracking-tight" style={{ color: NAVY }}>
            Terms &amp; Conditions:
          </div>
          <ol className="list-decimal space-y-0.5 pl-3.5">
            {(terms.length > 0
              ? terms
              : [
                  "Goods should be supplied strictly before or on the expected delivery date mentioned above.",
                  "Damaged, broken-seal, or near-expiry products will be rejected at the warehouse gate at vendor cost.",
                  "Batch Number, Manufacturing Date and Expiry Date must be stated on the GST tax invoice.",
                  "Invoice details (HSN, Rates, GST) must match this Purchase Order prior to dispatch.",
                  "Quantity variances beyond ±2% require prior written approval from our procurement department.",
                ]
            ).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>

        {/* SIGNATURES */}
        <div className="grid grid-cols-4 gap-2 pt-4 text-center text-[10px] text-slate-800">
          <Sign title="Prepared By" sub="(Procurement Officer)" />
          <Sign title="Checked By" sub="(Accounts Department)" />
          <Sign title="Supplier Acceptance" sub="(Sign & Stamp)" />
          <Sign title="Authorized Signatory" sub={shop.shopName} />
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

function MetaRow({ label, w, children }: { label: string; w: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={`inline-block ${w} font-semibold text-slate-600`}>{label}:</span> {children}
    </div>
  );
}

function Th({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <th className={`border border-slate-400 px-1 py-1.5 text-center ${className}`}>{children}</th>;
}

function Td({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <td className={`border border-slate-300 py-1 ${className}`}>{children}</td>;
}

function SumRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="px-2 py-1 text-slate-600">{label}:</td>
      <td className="px-2 py-1 text-right">{children}</td>
    </tr>
  );
}

function Sign({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <div className="mx-2 mb-1 border-t border-dashed border-slate-400" />
      <strong>{title}</strong>
      <span className="block text-[8px] text-slate-500">{sub}</span>
    </div>
  );
}
