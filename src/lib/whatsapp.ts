import type { Lang } from "@/features/i18n/config";

/**
 * Free WhatsApp "click to send" helper.
 *
 * Builds a wa.me deep link that opens WhatsApp (phone app or web) with the
 * farmer's chat already selected and the message pre-filled - the shopkeeper
 * just taps Send. No API, no per-message cost, and ToS-safe because a human
 * sends it manually. See the official Business API only if automation is ever
 * needed (that one is paid).
 */

/**
 * Indian mobiles only: drop everything that is not a digit, strip a leading 0,
 * and make sure the 91 country code is present. Returns null when the number
 * is too short / unusable so callers can disable the button.
 */
export function normalizeIndianMobile(raw?: string | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) return "91" + d; // bare 10-digit local number
  if (d.length === 12 && d.startsWith("91")) return d; // already 91 + 10 digits
  if (d.length === 11 && d.startsWith("91")) return null; // 91 + only 9 digits -> bad
  if (d.length >= 11 && d.length <= 13) return d; // some other country code, trust it
  return null;
}

export function buildWaLink(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

/** Opens WhatsApp in a new tab. Returns false if the number is unusable. */
export function openWhatsApp(rawPhone: string | null | undefined, message: string): boolean {
  const phone = normalizeIndianMobile(rawPhone);
  if (!phone) return false;
  if (typeof window !== "undefined") {
    window.open(buildWaLink(phone, message), "_blank", "noopener,noreferrer");
  }
  return true;
}

const rupees = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Udhaar (outstanding) reminder, written in the shopkeeper's chosen language. */
export function buildUdhaarMessage(opts: {
  name: string;
  amount: number;
  shopName?: string | null;
  lang: Lang;
}): string {
  const { name, amount, shopName, lang } = opts;
  const amt = rupees(amount);
  const sign = shopName?.trim() ? `\n— ${shopName.trim()}` : "";
  if (lang === "hi") {
    return `नमस्ते ${name} जी 🙏\nआपके ऊपर ${amt} उधार बाकी है। कृपया सुविधानुसार भुगतान कर दें।\nधन्यवाद।${sign}`;
  }
  if (lang === "hg") {
    return `Namaste ${name} ji 🙏\nAapke upar ${amt} udhaar baaki hai. Kripya jaldi bhugtaan kar dein.\nDhanyavaad.${sign}`;
  }
  return `Namaste ${name} ji 🙏\nYour outstanding balance is ${amt}. Please clear it at your convenience.\nThank you.${sign}`;
}

/**
 * Compact khata (passbook) statement: a few recent entries + the running
 * balance, in the shopkeeper's chosen language. For the full statement the
 * shopkeeper prints the passbook; this is the quick WhatsApp summary.
 * closingBalance: positive = customer owes (DR), negative = advance (CR).
 */
export function buildKhataMessage(opts: {
  name: string;
  recent: { dateText: string; particular: string; debit: number; credit: number }[];
  closingBalance: number;
  shopName?: string | null;
  lang: Lang;
}): string {
  const { name, recent, closingBalance, shopName, lang } = opts;
  const sign = shopName?.trim() ? `\n— ${shopName.trim()}` : "";
  const bal = rupees(Math.abs(closingBalance));
  const lines = recent
    .map((r) => {
      const amt = r.debit > 0 ? `+${rupees(r.debit)}` : `-${rupees(r.credit)}`;
      return `${r.dateText}  ${r.particular}  ${amt}`;
    })
    .join("\n");

  if (lang === "hi") {
    const status =
      closingBalance > 0 ? `बाकी (उधार): ${bal}` : closingBalance < 0 ? `जमा (एडवांस): ${bal}` : "कोई बकाया नहीं ✅";
    return `नमस्ते ${name} जी 🙏\nआपका खाता:\n${lines}\n————————\n${status}${sign}`;
  }
  if (lang === "hg") {
    const status =
      closingBalance > 0 ? `Baaki (udhaar): ${bal}` : closingBalance < 0 ? `Jama (advance): ${bal}` : "Koi baaki nahi ✅";
    return `Namaste ${name} ji 🙏\nAapka khata:\n${lines}\n————————\n${status}${sign}`;
  }
  const status =
    closingBalance > 0 ? `Balance due: ${bal}` : closingBalance < 0 ? `Advance (credit): ${bal}` : "Nothing outstanding ✅";
  return `Namaste ${name} ji 🙏\nYour account:\n${lines}\n————————\n${status}${sign}`;
}

/** Sale bill summary, written in the shopkeeper's chosen language. */
export function buildBillMessage(opts: {
  name: string;
  invoiceNumber: string;
  dateText: string;
  grandTotal: number;
  balance: number;
  shopName?: string | null;
  lang: Lang;
}): string {
  const { name, invoiceNumber, dateText, grandTotal, balance, shopName, lang } = opts;
  const total = rupees(grandTotal);
  const sign = shopName?.trim() ? `\n— ${shopName.trim()}` : "";
  if (lang === "hi") {
    const bal = balance > 0 ? `\nबाकी राशि: ${rupees(balance)}` : `\nपूरा भुगतान प्राप्त ✅`;
    return `नमस्ते ${name} जी 🙏\nबिल ${invoiceNumber} (${dateText})\nकुल राशि: ${total}${bal}\nधन्यवाद!${sign}`;
  }
  if (lang === "hg") {
    const bal = balance > 0 ? `\nBaaki raashi: ${rupees(balance)}` : `\nPura bhugtaan prapt ✅`;
    return `Namaste ${name} ji 🙏\nBill ${invoiceNumber} (${dateText})\nKul raashi: ${total}${bal}\nDhanyavaad!${sign}`;
  }
  const bal = balance > 0 ? `\nBalance due: ${rupees(balance)}` : `\nFully paid ✅`;
  return `Namaste ${name} ji 🙏\nBill ${invoiceNumber} (${dateText})\nTotal: ${total}${bal}\nThank you!${sign}`;
}
