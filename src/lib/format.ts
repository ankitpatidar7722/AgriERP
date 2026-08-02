/**
 * Indian formatting throughout: the lakh/crore digit grouping and dd-MM-yyyy
 * dates are what the shop reads on paper, so the screen matches.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 1,
  notation: "compact",
});

const numberFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatCurrency(value: number | null | undefined): string {
  return inrFormatter.format(value ?? 0);
}

/** For dashboard tiles, where "₹12.4L" beats "₹12,40,000.00". */
export function formatCurrencyCompact(value: number | null | undefined): string {
  return inrCompactFormatter.format(value ?? 0);
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

/**
 * Quantities drop trailing zeros - "12" not "12.000" - but keep up to three
 * decimals, because seeds genuinely sell in fractions of a kilo.
 */
export function formatQuantity(value: number | null | undefined): string {
  return quantityFormatter.format(value ?? 0);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** ISO yyyy-MM-dd, which is what the API's date query parameters expect. */
export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatPercent(value: number | null | undefined): string {
  return `${numberFormatter.format(value ?? 0)}%`;
}

/**
 * Time-of-day greeting.
 *
 *   05:00 - 11:59  Good Morning
 *   12:00 - 16:59  Good Afternoon
 *   17:00 - 23:59  Good Evening
 *   00:00 - 04:59  Good Night
 *
 * The last band is the one nobody specifies. Carrying "Good Evening" through
 * to 5am would greet the 3am stock-take with the wrong word, so the small hours
 * get their own.
 */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17) return "Good Evening";
  return "Good Night";
}

/**
 * The Indian financial year containing a date, as "FY 2026-2027".
 *
 * It runs 1 April to 31 March, so January to March belongs to the year that
 * started the PREVIOUS calendar year - the off-by-one that makes every Q4
 * report wrong when it is assumed to follow the calendar.
 */
export function financialYearLabel(date: Date): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `FY ${startYear}-${startYear + 1}`;
}

/** "250 ML" from a pack size and its unit; empty when the item has no pack. */
export function formatPacking(
  size: number | null | undefined,
  unitCode: string | null | undefined,
): string {
  if (size == null || !unitCode) return "-";
  return `${quantityFormatter.format(size)} ${unitCode}`;
}
