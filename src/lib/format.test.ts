import { describe, expect, it } from "vitest";
import {
  financialYearLabel,
  formatCurrency,
  formatDate,
  formatPacking,
  formatQuantity,
  greetingFor,
  toIsoDate,
} from "./format";

/**
 * Display formatting.
 *
 * These are the strings a shopkeeper reads on screen and on paper, so the
 * cases that matter are the Indian conventions: lakh digit grouping, dd-MMM-yyyy
 * dates, and quantities that keep fractions without printing "12.000".
 */

describe("formatCurrency", () => {
  it("uses the Indian digit grouping, not thousands", () => {
    // 1,23,456.78 - lakh grouping. "123,456.78" would read as wrong.
    const formatted = formatCurrency(123456.78);

    expect(formatted).toContain("1,23,456.78");
  });

  it("always shows two decimals", () => {
    expect(formatCurrency(1500)).toContain("1,500.00");
  });

  it("treats null and undefined as zero rather than printing NaN", () => {
    // These reach the UI from optional API fields; "₹NaN" on a bill is worse
    // than a zero.
    expect(formatCurrency(null)).toContain("0.00");
    expect(formatCurrency(undefined)).toContain("0.00");
  });

  it("keeps the sign on a negative amount", () => {
    expect(formatCurrency(-500)).toContain("-");
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros", () => {
    expect(formatQuantity(12)).toBe("12");
  });

  it("keeps up to three decimals", () => {
    // Seeds genuinely sell in fractions of a kilo.
    expect(formatQuantity(2.5)).toBe("2.5");
    expect(formatQuantity(0.125)).toBe("0.125");
  });

  it("treats null as zero", () => {
    expect(formatQuantity(null)).toBe("0");
  });
});

describe("formatDate", () => {
  it("renders day-month-year", () => {
    const formatted = formatDate("2026-07-26T00:00:00");

    expect(formatted).toContain("2026");
    expect(formatted).toContain("Jul");
    expect(formatted).toContain("26");
  });

  it("returns a dash for a missing date rather than 'Invalid Date'", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
    expect(formatDate("")).toBe("-");
  });

  it("returns a dash for an unparseable value", () => {
    expect(formatDate("not-a-date")).toBe("-");
  });
});

describe("toIsoDate", () => {
  /**
   * The whole point of this helper: Date#toISOString converts to UTC first,
   * so in IST (+5:30) an early-morning date lands on the PREVIOUS day and the
   * bill gets filed under the wrong date. Both ends of the day are checked
   * because which one breaks depends on whether the machine is ahead of or
   * behind UTC - one of these two catches it either way.
   */
  it.each([
    [new Date(2026, 6, 26, 0, 30), "2026-07-26"],   // just after local midnight
    [new Date(2026, 6, 26, 12, 0), "2026-07-26"],   // midday
    [new Date(2026, 6, 26, 23, 30), "2026-07-26"],  // just before local midnight
  ])("uses local calendar date for %s", (date, expected) => {
    expect(toIsoDate(date)).toBe(expected);
  });

  it("never disagrees with the date's own local components", () => {
    // Property-style: whatever the timezone, the output must reconstruct the
    // same local year/month/day it was given.
    for (const hour of [0, 1, 5, 12, 18, 23]) {
      const date = new Date(2026, 6, 26, hour, 45);
      const [year, month, day] = toIsoDate(date).split("-").map(Number);

      expect(year).toBe(date.getFullYear());
      expect(month).toBe(date.getMonth() + 1);
      expect(day).toBe(date.getDate());
    }
  });

  it("zero-pads month and day", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("greetingFor", () => {
  /**
   * The bands are a stated requirement, so the cases that matter are the
   * MINUTE either side of each boundary - an off-by-one here shows a shopkeeper
   * "Good Evening" over their morning chai.
   */
  const at = (hour: number, minute = 0) => new Date(2026, 6, 26, hour, minute);

  it.each([
    [at(0, 0), "Good Night"],
    [at(4, 59), "Good Night"],
    [at(5, 0), "Good Morning"],
    [at(11, 59), "Good Morning"],
    [at(12, 0), "Good Afternoon"],
    [at(16, 59), "Good Afternoon"],
    [at(17, 0), "Good Evening"],
    [at(23, 59), "Good Evening"],
  ])("greets correctly at the boundary %s", (date, expected) => {
    expect(greetingFor(date)).toBe(expected);
  });

  it("covers every hour of the day with no gap", () => {
    // A missing band would return undefined and render a blank heading.
    for (let hour = 0; hour < 24; hour++) {
      expect(greetingFor(at(hour))).toMatch(/^Good (Morning|Afternoon|Evening|Night)$/);
    }
  });

  it("reads local time, not UTC", () => {
    // Built from local components, so in IST 09:00 is morning regardless of
    // the machine's offset from UTC.
    expect(greetingFor(at(9))).toBe("Good Morning");
  });
});

describe("financialYearLabel", () => {
  it("starts a new year on 1 April", () => {
    expect(financialYearLabel(new Date(2026, 2, 31))).toBe("FY 2025-2026"); // 31 Mar
    expect(financialYearLabel(new Date(2026, 3, 1))).toBe("FY 2026-2027"); // 1 Apr
  });

  it("puts January to March in the year that began the previous April", () => {
    // The off-by-one that makes every Q4 report wrong when the financial year
    // is assumed to follow the calendar.
    expect(financialYearLabel(new Date(2027, 0, 15))).toBe("FY 2026-2027");
  });

  it("labels today's date as the current year", () => {
    expect(financialYearLabel(new Date(2026, 6, 26))).toBe("FY 2026-2027");
  });
});

describe("formatPacking", () => {
  it("joins the size and its unit", () => {
    expect(formatPacking(250, "ML")).toBe("250 ML");
  });

  it("returns a dash when either half is missing", () => {
    // A bare number on a shelf label means nothing.
    expect(formatPacking(250, null)).toBe("-");
    expect(formatPacking(null, "ML")).toBe("-");
  });
});
