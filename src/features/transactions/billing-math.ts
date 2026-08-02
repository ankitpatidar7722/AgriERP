import type { ItemLookupDto, SaleType } from "./types";

/**
 * The billing screen's money preview, as pure functions.
 *
 * Split out of the page so it can be tested without a browser. These figures
 * are a PREVIEW: the server recalculates everything on save and its numbers
 * are what get stored - not least because the CGST/SGST-versus-IGST decision
 * depends on comparing the shop's state to the customer's, which the browser
 * has no business deciding.
 *
 * The arithmetic still has to match, or the operator sees one total and the
 * printed bill shows another.
 */

/** Rounds to paise, half away from zero - the same rule the server applies. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Picks the rate for the customer's price type, falling back to retail. */
export function rateFor(item: ItemLookupDto, saleType: SaleType): number {
  if (saleType === "Wholesale" && item.wholesaleRate > 0) return item.wholesaleRate;
  if (saleType === "Dealer" && item.dealerRate > 0) return item.dealerRate;
  return item.sellingRate;
}

export interface BillLineInput {
  quantity: number;
  rate: number;
  discountPercent: number;
  gstPercent: number;
}

export interface BillTotals {
  gross: number;
  discount: number;
  taxable: number;
  tax: number;
  /** CGST; SGST is `tax - halfTax` so the two always sum to the total. */
  halfTax: number;
  roundOff: number;
  grandTotal: number;
}

export function computeBillTotals(lines: BillLineInput[], otherCharges = 0): BillTotals {
  let gross = 0;
  let discount = 0;
  let taxable = 0;
  let tax = 0;

  for (const line of lines) {
    const lineGross = round2(line.quantity * line.rate);
    const lineDiscount = round2((lineGross * line.discountPercent) / 100);
    const lineTaxable = lineGross - lineDiscount;

    gross += lineGross;
    discount += lineDiscount;
    taxable += lineTaxable;
    // Tax is computed per line, not on the total: different items carry
    // different rates, and 18% of the sum is not the sum of the rates.
    tax += round2((lineTaxable * line.gstPercent) / 100);
  }

  gross = round2(gross);
  discount = round2(discount);
  taxable = round2(taxable);
  tax = round2(tax);

  const beforeRounding = round2(taxable + tax + otherCharges);
  const roundOff = round2(Math.round(beforeRounding) - beforeRounding);

  return {
    gross,
    discount,
    taxable,
    tax,
    // Rounded once and the remainder given to SGST, so CGST + SGST is always
    // exactly the total tax.
    halfTax: round2(tax / 2),
    roundOff,
    grandTotal: round2(beforeRounding + roundOff),
  };
}

/**
 * Per-line discount amounts that make the bill's grand total equal `targetTotal`.
 *
 * The operator types a final figure - "5,000 ka bill, 4,800 le lo" - and the
 * shortfall is spread across the lines in proportion to each line's taxable
 * value, with GST recomputed on the reduced base so the printed total lands on
 * the typed figure (the server's round-off absorbs any sub-rupee remainder).
 *
 * The returned amount folds in any per-line discount% already on the line, so
 * the caller sends it as a flat discountAmount with discountPercent = 0 - which
 * is also how the server apportions it back across FEFO batch splits.
 *
 * A target at or above the computed total gives nothing extra away (returns the
 * plain line discounts); a target is never allowed to push a line below zero.
 */
export function discountAmountsForTarget(
  lines: BillLineInput[],
  otherCharges: number,
  targetTotal: number,
): number[] {
  const grosses = lines.map((line) => round2(line.quantity * line.rate));
  const lineDiscounts = lines.map((line, i) => round2((grosses[i] * line.discountPercent) / 100));
  const taxables = grosses.map((gross, i) => gross - lineDiscounts[i]);
  const beforeOther = round2(
    taxables.reduce((sum, taxable, i) => sum + taxable * (1 + lines[i].gstPercent / 100), 0),
  );

  if (beforeOther <= 0) return lineDiscounts;

  const factor = (targetTotal - otherCharges) / beforeOther;
  if (!(factor < 1)) return lineDiscounts; // target >= computed: give nothing extra
  const clamped = Math.max(0, factor); // never discount a line below zero

  // Each line keeps taxable * factor; the discount is what that removes from gross.
  return grosses.map((gross, i) => round2(gross - taxables[i] * clamped));
}

export interface LandedCostLine {
  quantity: number;
  freeQuantity: number;
  rate: number;
  discountPercent: number;
}

/**
 * Landed-cost preview for the purchase screen. Mirrors LandedCost.Apportion on
 * the server: charges spread by taxable value, divided by quantity INCLUDING
 * free goods.
 */
export function previewLandedRate(
  line: LandedCostLine,
  allLines: LandedCostLine[],
  chargesToSpread: number,
): number {
  const taxableOf = (candidate: LandedCostLine) => {
    const lineGross = round2(candidate.quantity * candidate.rate);
    return lineGross - round2((lineGross * candidate.discountPercent) / 100);
  };

  const totalTaxable = round2(allLines.reduce((sum, candidate) => sum + taxableOf(candidate), 0));
  const lineTaxable = taxableOf(line);

  const share =
    totalTaxable > 0 && chargesToSpread > 0
      ? round2((chargesToSpread * lineTaxable) / totalTaxable)
      : 0;

  const costableQty = line.quantity + line.freeQuantity;
  if (costableQty <= 0) return 0;

  // Four decimals: a rate rounded to paise loses real money once multiplied
  // back out over a few hundred units.
  return Math.round(((lineTaxable + share) / costableQty + Number.EPSILON) * 10000) / 10000;
}
