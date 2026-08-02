"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ShopHeaderDto } from "./types";
import { useT } from "@/features/i18n/provider";

/**
 * Shared building blocks for the printable sales invoice and purchase order.
 *
 * Both documents are the same bordered, letterhead-topped A4 form - only the
 * party details, the line columns and the totals differ - so the frame, the
 * letterhead, the section bars and the row helpers live here and are composed
 * by each page. Hairline black borders, grey section headers, one consistent
 * type scale and even padding throughout.
 */

export interface PrintMetaRow {
  label: string;
  value: string;
}

/** A4 frame with colour-accurate backgrounds (grey headers must survive print). */
export function PrintFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 9mm; }
          .no-print { display: none !important; }
          #print-doc { box-shadow: none !important; }
        }
        #print-doc, #print-doc * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>
      <div
        id="print-doc"
        className="mx-auto max-w-[820px] border border-black bg-white text-[10.5px] leading-[1.4] text-black shadow-sm print:max-w-none print:shadow-none"
        style={{ fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif" }}
      >
        {children}
      </div>
    </>
  );
}

/** Logo + shop identity on the left, document title + reference rows on the right. */
export function PrintLetterhead({
  shop,
  title,
  meta,
  badge,
}: {
  shop: ShopHeaderDto;
  title: string;
  meta: PrintMetaRow[];
  badge?: string;
}) {
  const t = useT();
  const address = [shop.address, shop.city, shop.stateName, shop.pincode]
    .filter(Boolean)
    .join(", ");
  const contact = [shop.phone && `${t("prn.phPrefix")} ${shop.phone}`, shop.email]
    .filter(Boolean)
    .join("    ");
  const licences = [
    shop.pesticideLicenceNo && `${t("prn.pesticideLic")} ${shop.pesticideLicenceNo}`,
    shop.seedLicenceNo && `${t("prn.seedLic")} ${shop.seedLicenceNo}`,
    shop.fertilizerLicenceNo && `${t("prn.fertilizerLic")} ${shop.fertilizerLicenceNo}`,
  ]
    .filter(Boolean)
    .join("    ");

  return (
    <div className="flex items-stretch border-b border-black">
      <div className="flex flex-1 flex-col justify-center p-3.5">
        {/* The lockup already carries the shop name, so it stands as the header. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/shree-ram-logo.png"
          alt={shop.shopName}
          className="h-auto w-[230px] max-w-full object-contain"
        />
        <div className="mt-2 space-y-[2px] text-[9.5px] leading-snug text-neutral-800">
          {address && <div>{address}</div>}
          {contact && <div>{contact}</div>}
          {shop.gstNumber && (
            <div className="font-semibold text-black">
              {t("prn.gstinPrefix")} {shop.gstNumber}
            </div>
          )}
          {licences && <div className="text-[9px] text-neutral-600">{licences}</div>}
        </div>
      </div>

      <div className="flex w-[248px] shrink-0 flex-col justify-center border-l border-black px-3.5 py-3">
        <div className="text-center text-[17px] font-bold tracking-[0.06em]">{title}</div>
        {badge && (
          <div className="mt-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-red-700">
            {badge}
          </div>
        )}
        <div className="mx-auto mt-1.5 h-[2px] w-12 bg-neutral-400" />
        <div className="mt-2.5 space-y-[3px]">
          {meta.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} strong />
          ))}
        </div>
      </div>
    </div>
  );
}

/** A centred grey section bar, e.g. "ITEM DETAILS". */
export function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-black bg-neutral-200 px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-[0.08em]">
      {children}
    </div>
  );
}

/** A titled party block (BILL TO / SUPPLIER / SHIP TO). */
export function PartyBox({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="border-b border-black bg-neutral-200 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.06em]">
        {title}
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}

/** A label:value line whose labels share a fixed width, so every value aligns. */
export function InfoRow({
  label,
  value,
  strong,
  labelClassName = "w-[66px]",
}: {
  label: string;
  value: string;
  strong?: boolean;
  labelClassName?: string;
}) {
  return (
    <div className="flex gap-2 py-[1.5px] leading-snug">
      <span className={cn(labelClassName, "shrink-0 font-semibold text-neutral-700")}>{label}</span>
      <span className={cn("min-w-0 flex-1", strong && "font-semibold text-black")}>{value}</span>
    </div>
  );
}

/** Header cell for the line-items table. */
export function ItemTh({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border border-black px-2 py-1.5 text-[9px] font-bold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Body cell for the line-items table. */
export function ItemTd({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("border border-black px-2 py-1.5 align-top", className)}>{children}</td>;
}

/** A row in the totals table. `strong` highlights the grand total; `accent` reds a balance. */
export function TotalRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <tr className={strong ? "bg-neutral-200" : undefined}>
      <td
        className={cn(
          "border border-black px-2.5 py-1.5",
          strong ? "text-[12px] font-bold" : "font-semibold text-neutral-700",
        )}
      >
        {label}
      </td>
      <td
        className={cn(
          "border border-black px-2.5 py-1.5 text-right tabular",
          strong ? "text-[12px] font-bold" : accent ? "font-bold text-red-700" : "",
        )}
      >
        {value}
      </td>
    </tr>
  );
}

/** Two signature panels with a signing line, sized for a stamp. */
export function SignatureRow({
  shopName,
  leftLabel,
}: {
  shopName: string;
  leftLabel?: string;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 border-t border-black">
      <div className="border-r border-black p-2.5">
        <div className="font-semibold">{leftLabel ?? t("prn.receiverSignature")}</div>
        <div className="mt-11 border-t border-neutral-400 pt-1 text-center text-[9px] text-neutral-500">
          {t("prn.signatureAndDate")}
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-right font-semibold">
          {t("prn.for")} {shopName}
        </div>
        <div className="mt-11 border-t border-neutral-400 pt-1 text-center text-[9px] text-neutral-500">
          {t("prn.authorisedSignatory")}
        </div>
      </div>
    </div>
  );
}

/** Footer stamp: a note on the left, the print time on the right. */
export function PrintFooter({ note }: { note?: string | null }) {
  const t = useT();
  const [printedAt, setPrintedAt] = useState("");
  // Computed on the client so the printed time is the operator's, not the
  // server's, and to keep this out of any server render.
  useEffect(() => {
    setPrintedAt(
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-black px-2.5 py-1.5 text-[9px] text-neutral-600">
      <span>{note || t("prn.computerGenerated")}</span>
      {printedAt && (
        <span>
          {t("prn.printed")} {printedAt}
        </span>
      )}
    </div>
  );
}
