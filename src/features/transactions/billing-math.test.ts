import { describe, expect, it } from "vitest";
import {
  computeBillTotals,
  discountAmountsForTarget,
  previewLandedRate,
  rateFor,
  round2,
  type BillLineInput,
} from "./billing-math";
import type { ItemLookupDto } from "./types";

/**
 * The billing screen's money preview.
 *
 * These figures must agree with the server's, or the operator reads one total
 * on screen and the printed bill shows another. The server cases live in
 * tests/AgriERP.Application.Tests; these pin the client half.
 */

function item(overrides: Partial<ItemLookupDto> = {}): ItemLookupDto {
  return {
    id: 1,
    code: "PRD-000001",
    name: "Confidor 250ml",
    unitId: 1,
    unitCode: "BTL",
    sellingRate: 500,
    wholesaleRate: 460,
    dealerRate: 440,
    mrp: 600,
    minSellingRate: 400,
    gstPercent: 18,
    currentStock: 100,
    isActive: true,
    ...overrides,
  };
}

describe("rateFor", () => {
  it("uses the selling rate for a retail sale", () => {
    expect(rateFor(item(), "Retail")).toBe(500);
  });

  it("uses the wholesale and dealer rates for their price types", () => {
    expect(rateFor(item(), "Wholesale")).toBe(460);
    expect(rateFor(item(), "Dealer")).toBe(440);
  });

  it("falls back to the selling rate when a price type has none set", () => {
    // A shop that never configured a dealer rate should bill at retail rather
    // than at zero.
    expect(rateFor(item({ wholesaleRate: 0 }), "Wholesale")).toBe(500);
    expect(rateFor(item({ dealerRate: 0 }), "Dealer")).toBe(500);
  });
});

describe("computeBillTotals", () => {
  const line = (overrides: Partial<BillLineInput> = {}): BillLineInput => ({
    quantity: 3,
    rate: 500,
    discountPercent: 0,
    gstPercent: 18,
    ...overrides,
  });

  it("matches the worked example that was posted through the UI", () => {
    // 3 @ 500 = 1500 taxable, 18% = 270 tax, split 135/135, total 1770.
    const totals = computeBillTotals([line()]);

    expect(totals.taxable).toBe(1500);
    expect(totals.tax).toBe(270);
    expect(totals.halfTax).toBe(135);
    expect(totals.grandTotal).toBe(1770);
  });

  it("applies a line discount before tax", () => {
    const totals = computeBillTotals([line({ discountPercent: 10 })]);

    expect(totals.gross).toBe(1500);
    expect(totals.discount).toBe(150);
    expect(totals.taxable).toBe(1350);
    expect(totals.tax).toBe(243);
  });

  it("taxes each line at its own rate, not the total at one rate", () => {
    // A pesticide at 18% beside seeds at 0%. Applying a blended rate to the
    // sum would overcharge tax on the seeds and understate it on the rest.
    const totals = computeBillTotals([
      line({ quantity: 1, rate: 1000, gstPercent: 18 }),
      line({ quantity: 1, rate: 1000, gstPercent: 0 }),
    ]);

    expect(totals.taxable).toBe(2000);
    expect(totals.tax).toBe(180);
  });

  it("keeps cgst plus sgst exactly equal to the total tax", () => {
    const totals = computeBillTotals([line({ quantity: 7, rate: 333.33, gstPercent: 18 })]);
    const sgst = round2(totals.tax - totals.halfTax);

    expect(round2(totals.halfTax + sgst)).toBe(totals.tax);
  });

  it("rounds the grand total to a whole rupee", () => {
    const totals = computeBillTotals([line({ quantity: 1, rate: 123.45, gstPercent: 18 })]);

    expect(Number.isInteger(totals.grandTotal)).toBe(true);
    expect(round2(totals.taxable + totals.tax + totals.roundOff)).toBe(totals.grandTotal);
  });

  it("adds other charges before rounding", () => {
    const withCharges = computeBillTotals([line()], 50);

    expect(withCharges.grandTotal).toBe(1820);
  });

  it("carries the purchase screen's freight through the same term", () => {
    // The purchase screen has no separate freight slot in this calculation: it
    // passes freight + other charges as one figure, because both sit outside
    // the taxable base and before the round-off. If that term were ever dropped
    // the supplier bill would tally on screen and be short on paper.
    const freight = 500;
    const otherCharges = 120;
    const withBoth = computeBillTotals([line()], freight + otherCharges);
    const withNeither = computeBillTotals([line()]);

    expect(withBoth.grandTotal - withNeither.grandTotal).toBe(freight + otherCharges);
    // Charges are not taxed - only the goods are.
    expect(withBoth.taxable).toBe(withNeither.taxable);
    expect(withBoth.tax).toBe(withNeither.tax);
  });

  it("still reaches a whole rupee once charges are added", () => {
    // Charges join the total before the round-off, so an awkward charge must
    // not leave paise on the bill.
    const totals = computeBillTotals([line({ quantity: 1, rate: 123.45 })], 77.77);

    expect(Number.isInteger(totals.grandTotal)).toBe(true);
  });

  it("returns zeros for an empty bill", () => {
    const totals = computeBillTotals([]);

    expect(totals.gross).toBe(0);
    expect(totals.taxable).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  it("handles fractional quantities", () => {
    // Seeds sell in half kilos.
    const totals = computeBillTotals([line({ quantity: 2.5, rate: 180, gstPercent: 0 })]);

    expect(totals.taxable).toBe(450);
  });
});

describe("discountAmountsForTarget", () => {
  const line = (overrides: Partial<BillLineInput> = {}): BillLineInput => ({
    quantity: 3,
    rate: 500,
    discountPercent: 0,
    gstPercent: 18,
    ...overrides,
  });

  /** The grand total the server would store for a set of flat line discounts. */
  function grandTotalWith(lines: BillLineInput[], discounts: number[], otherCharges = 0): number {
    let taxable = 0;
    let tax = 0;
    lines.forEach((l, i) => {
      const t = round2(l.quantity * l.rate) - discounts[i];
      taxable += t;
      tax += round2((t * l.gstPercent) / 100);
    });
    const before = round2(round2(taxable) + round2(tax) + otherCharges);
    return Math.round(before); // the bill rounds to a whole rupee
  }

  it("spreads a discount so the recomputed total lands on the typed figure", () => {
    // 3 @ 500, 18% = 1770. Operator settles at 1700.
    const lines = [line()];
    const discounts = discountAmountsForTarget(lines, 0, 1700);

    expect(grandTotalWith(lines, discounts)).toBe(1700);
  });

  it("spreads across mixed GST rates and still hits the figure", () => {
    const lines = [
      line({ quantity: 1, rate: 1000, gstPercent: 18 }),
      line({ quantity: 2, rate: 250, gstPercent: 5 }),
    ];
    const discounts = discountAmountsForTarget(lines, 0, 1400);

    expect(grandTotalWith(lines, discounts)).toBe(1400);
  });

  it("folds an existing line discount into the flat amount", () => {
    // The line already carries 10% off; the target adds more on top.
    const lines = [line({ discountPercent: 10 })];
    const discounts = discountAmountsForTarget(lines, 0, 1500);

    // Its own 10% (150) plus the extra to reach 1500.
    expect(discounts[0]).toBeGreaterThan(150);
    expect(grandTotalWith(lines, discounts)).toBe(1500);
  });

  it("gives nothing extra away when the target is at or above the total", () => {
    const lines = [line({ discountPercent: 10 })];

    // 3 @ 500 less 10% = 1593. A target of 1770 asks for no extra discount.
    expect(discountAmountsForTarget(lines, 0, 1770)).toEqual([150]);
  });

  it("never discounts a line below zero", () => {
    const lines = [line()];
    const discounts = discountAmountsForTarget(lines, 0, 0);

    // The whole gross is taken off, leaving a zero-value line - not a negative.
    expect(discounts[0]).toBe(1500);
    expect(grandTotalWith(lines, discounts)).toBe(0);
  });
});

describe("previewLandedRate", () => {
  const line = (
    quantity: number,
    rate: number,
    freeQuantity = 0,
    discountPercent = 0,
  ) => ({ quantity, rate, freeQuantity, discountPercent });

  it("matches the server's apportionment for the worked example", () => {
    // 100 @ 400 and 50 @ 420 with 1000 freight, split 40000:21000.
    const lines = [line(100, 400), line(50, 420)];

    expect(previewLandedRate(lines[0], lines, 1000)).toBe(406.5574);
    expect(previewLandedRate(lines[1], lines, 1000)).toBe(426.8852);
  });

  it("divides by quantity including free goods", () => {
    const lines = [line(10, 400, 1)];

    // 4000 over 11 units, not 10.
    expect(previewLandedRate(lines[0], lines, 0)).toBe(363.6364);
  });

  it("shows a scheme lowering the effective cost", () => {
    const without = [line(10, 100)];
    const withFree = [line(10, 100, 2)];

    expect(previewLandedRate(withFree[0], withFree, 0)).toBeLessThan(
      previewLandedRate(without[0], without, 0),
    );
  });

  it("returns zero rather than dividing by zero", () => {
    const lines = [line(0, 400)];

    expect(previewLandedRate(lines[0], lines, 100)).toBe(0);
  });

  it("ignores a discount-free line when spreading charges by value", () => {
    const lines = [line(10, 0), line(10, 100)];

    // The zero-value line attracts no freight share; it all lands on the other.
    expect(previewLandedRate(lines[0], lines, 100)).toBe(0);
    expect(previewLandedRate(lines[1], lines, 100)).toBe(110);
  });
});
