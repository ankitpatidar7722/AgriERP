import { QRCodeSVG } from "qrcode.react";

/**
 * Builds a UPI deep link (NPCI spec) that any UPI app scans to pre-fill the
 * shop's VPA and the bill amount. Space is percent-encoded (not "+") so apps
 * that treat "+" literally still parse the payee name correctly.
 */
export function buildUpiUri(opts: {
  payeeVpa: string;
  payeeName?: string | null;
  amount?: number | null;
  note?: string | null;
}): string {
  const parts = [`pa=${encodeURIComponent(opts.payeeVpa.trim())}`];
  if (opts.payeeName?.trim()) parts.push(`pn=${encodeURIComponent(opts.payeeName.trim())}`);
  if (opts.amount && opts.amount > 0) parts.push(`am=${opts.amount.toFixed(2)}`);
  parts.push("cu=INR");
  if (opts.note?.trim()) parts.push(`tn=${encodeURIComponent(opts.note.trim())}`);
  return `upi://pay?${parts.join("&")}`;
}

interface UpiQrProps {
  /** The shop's UPI VPA (e.g. shop@okaxis). Nothing renders without it. */
  payeeVpa?: string | null;
  payeeName?: string | null;
  amount?: number | null;
  note?: string | null;
  size?: number;
  caption?: string;
}

/**
 * Scan-to-pay QR for the invoice. Always dark-on-white (QR codes must be, and
 * it must survive dark mode + printing), so it sits on an explicit white tile.
 */
export function UpiQr({ payeeVpa, payeeName, amount, note, size = 116, caption }: UpiQrProps) {
  if (!payeeVpa?.trim()) return null;
  const uri = buildUpiUri({ payeeVpa, payeeName, amount, note });
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-md border border-gray-200 bg-white p-2">
        <QRCodeSVG value={uri} size={size} level="M" />
      </div>
      {caption && <span className="text-[10px] leading-tight text-muted-foreground">{caption}</span>}
    </div>
  );
}
