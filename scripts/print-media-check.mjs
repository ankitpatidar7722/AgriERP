/**
 * Checks the printable invoice under EMULATED PRINT MEDIA.
 *
 * A print stylesheet is invisible on screen: the page can look perfect in the
 * browser and still print with the sidebar down one side and the Print button
 * halfway through the total. Switching Chromium to print media is the only way
 * to see what the printer sees without spending paper.
 *
 * It finds its own invoice by opening the sales register and clicking the first
 * row, so it needs no argument beyond an output folder - one less thing to
 * thread between scripts, and it fails honestly when there is nothing to print.
 *
 * Prerequisites: API on :5215, web on :3000, at least one posted invoice, and
 * Users.MustChangePassword cleared for admin.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const OUT = process.argv[2] ?? "./shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
const problems = [];

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#userName", "admin");
await page.fill("#password", "Admin@123");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|change-password/, { timeout: 20000 });

if (page.url().includes("change-password")) {
  console.log("----------------------------------------");
  console.log("PRINT MEDIA CHECK: 1 problem(s)");
  console.log("  - blocked on /change-password - clear MustChangePassword first");
  await browser.close();
  process.exit(1);
}

// ---- find an invoice to print ----
await page.goto(`${BASE}/sales`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

// Click the invoice-number cell itself, not the whole row. The data grid opens
// a record on a single click anywhere in the row, but clicking the cell that
// holds the invoice number is the surest target: it is never an action button,
// and it is not the grid's hidden measurement row at the top of the tbody.
const invoiceRow = page.locator("tbody td", { hasText: /INV\// }).first();
if ((await invoiceRow.count()) === 0) {
  console.log("----------------------------------------");
  console.log("PRINT MEDIA CHECK: 1 problem(s)");
  console.log("  - no invoices in the register - seed demo data before running");
  await browser.close();
  process.exit(1);
}

await invoiceRow.click();
await page.waitForURL(/\/sales\/\d+$/, { timeout: 15000 });
const invoiceUrl = page.url();

await page.goto(`${invoiceUrl}/print`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

// Switch the page to print media - this is what the printer actually sees.
await page.emulateMedia({ media: "print" });
await page.waitForTimeout(400);

async function visible(selector) {
  const count = await page.locator(selector).count();
  if (count === 0) return false;
  return page.locator(selector).first().isVisible();
}

if (await visible("aside")) problems.push("sidebar is visible in print media");
if (await visible("header")) problems.push("navbar is visible in print media");
if (await visible('button:has-text("Print")')) problems.push("Print button is visible in print media");

// The document itself must still be there.
const text = await page.locator("body").innerText();
for (const expected of ["TAX INVOICE", "Grand Total", "In words"]) {
  if (!text.includes(expected)) problems.push(`print media lost "${expected}"`);
}

await page.screenshot({ path: `${OUT}/invoice-print-media.png`, fullPage: true });
await browser.close();

console.log(`checked ${invoiceUrl}/print under print media`);
console.log("----------------------------------------");
if (problems.length === 0) {
  console.log("PRINT MEDIA CHECK: no problems found (app chrome hidden, document intact)");
} else {
  console.log(`PRINT MEDIA CHECK: ${problems.length} problem(s)`);
  for (const p of problems) console.log("  - " + p);
  process.exitCode = 1;
}
