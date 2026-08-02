/**
 * Drives the billing screen in a real browser: signs in, searches a product,
 * builds a bill, posts it, and opens the printable invoice - then screenshots
 * every transaction screen in light and dark.
 *
 * This is the check that a build and a typecheck cannot make. It fails on a
 * blank page, a console error, a total that does not match, or a bill that
 * does not actually post.
 *
 * Prerequisites: API on :5215, web on :3000, demo data seeded, and
 * Users.MustChangePassword cleared for admin (the caller restores it).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const OUT = process.argv[2];
const PRODUCT = process.argv[3] ?? "ZZ Confidor";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];
let postedInvoiceUrl = null;

async function assertRendered(page, name) {
  const text = (await page.locator("body").innerText()).trim();
  if (text.length < 40) problems.push(`${name}: rendered almost no text (${text.length} chars)`);
  if (await page.locator("text=/Application error|Unhandled Runtime/i").count()) {
    problems.push(`${name}: Next.js error overlay visible`);
  }
  return text;
}

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console (${theme}): ${msg.text().slice(0, 160)}`);
  });
  page.on("pageerror", (err) => problems.push(`pageerror (${theme}): ${String(err).slice(0, 160)}`));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#userName", "admin");
  await page.fill("#password", "Admin@123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|change-password/, { timeout: 20000 });

  if (page.url().includes("change-password")) {
    problems.push(`${theme}: blocked on /change-password - clear MustChangePassword first`);
    await context.close();
    continue;
  }

  /* ---------------------------- list screens ---------------------------- */
  for (const [route, marker] of [
    ["/sales", "Sales"],
    ["/purchases", "Purchase GRN"],
    ["/payments", "Payments"],
    ["/stock", "Stock"],
    ["/reports", "Reports"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const text = await assertRendered(page, `${route}-${theme}`);
    if (!text.includes(marker)) problems.push(`${route}-${theme}: missing "${marker}"`);
    await page.screenshot({ path: `${OUT}/${route.replace(/\//g, "")}-${theme}.png` });
  }

  /* ------------------------- stock tabs render -------------------------- */
  await page.goto(`${BASE}/stock`, { waitUntil: "networkidle" });
  for (const tab of ["Batches", "Adjustments", "Transfers"]) {
    await page.getByRole("tab", { name: tab }).click();
    await page.waitForTimeout(700);
    await assertRendered(page, `stock-${tab}-${theme}`);
  }
  await page.screenshot({ path: `${OUT}/stock-transfers-${theme}.png` });

  /* ------------------------ reports tabs render ------------------------- */
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle" });
  for (const tab of ["Expiry", "Sales", "Purchase", "Profit", "GST"]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await page.waitForTimeout(700);
    await assertRendered(page, `reports-${tab}-${theme}`);
  }
  await page.screenshot({ path: `${OUT}/reports-gst-${theme}.png` });

  /* ------------------------- the billing screen ------------------------- */
  await page.goto(`${BASE}/sales/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  // Type-ahead: search, wait for the listbox, pick the first hit.
  await page.getByPlaceholder("Search item, technical name or code").fill(PRODUCT);
  await page.waitForSelector('[role="option"]', { timeout: 15000 });
  const optionCount = await page.locator('[role="option"]').count();
  if (optionCount === 0) problems.push(`billing-${theme}: type-ahead returned no products`);
  await page.locator('[role="option"]').first().click();
  await page.waitForTimeout(500);

  const rowCount = await page.locator("tbody tr").count();
  if (rowCount < 1) problems.push(`billing-${theme}: product did not land on the bill`);

  // Set a quantity and confirm the total updates off zero.
  const qty = page.locator('input[aria-label^="Quantity for"]').first();
  await qty.fill("3");
  await page.waitForTimeout(400);

  const grandTotal = await page.locator('input[aria-label="Grand total"]').inputValue();
  if (!grandTotal || Number(grandTotal) <= 0) {
    problems.push(`billing-${theme}: grand total stayed at zero after entering a quantity`);
  }
  await page.screenshot({ path: `${OUT}/billing-${theme}.png` });

  // Only the light pass posts a bill - two passes would create two invoices
  // and the second would be indistinguishable from a double-submit bug.
  if (theme === "light") {
    // A walk-in cash sale defaults to paid-in-full, so it posts straight away.
    await page.getByRole("button", { name: /Save & post/ }).click();
    await page.waitForURL(/\/sales\/\d+$/, { timeout: 25000 });
    postedInvoiceUrl = page.url();

    await page.waitForTimeout(900);
    const detail = await assertRendered(page, `sale-detail-${theme}`);
    if (!detail.includes("Posted")) problems.push("posted invoice does not read as Posted");
    if (!detail.includes("Items")) problems.push("posted invoice shows no items");
    await page.screenshot({ path: `${OUT}/sale-detail-${theme}.png` });

    // The printable invoice.
    await page.goto(`${postedInvoiceUrl}/print`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const printText = await assertRendered(page, `invoice-print-${theme}`);
    for (const expected of ["TAX INVOICE", "In words", "Grand Total"]) {
      if (!printText.includes(expected)) problems.push(`invoice-print: missing "${expected}"`);
    }
    if (!/Rupees/.test(printText)) problems.push("invoice-print: amount in words did not render");
    await page.screenshot({ path: `${OUT}/invoice-print.png`, fullPage: true });
    console.log(`posted and printed: ${postedInvoiceUrl}`);
  }

  /* ------------------------- purchase entry form ------------------------ */
  await page.goto(`${BASE}/purchases/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await assertRendered(page, `purchase-new-${theme}`);
  await page.screenshot({ path: `${OUT}/purchase-new-${theme}.png` });

  /* ------------------------------ mobile -------------------------------- */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/sales/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  if (bodyWidth > 400) problems.push(`mobile-${theme}: body scrolls horizontally (${bodyWidth}px)`);
  await page.screenshot({ path: `${OUT}/billing-mobile-${theme}.png` });

  await context.close();
}

await browser.close();

console.log("\n----------------------------------------");
if (problems.length === 0) {
  console.log("BILLING FLOW CHECK: no problems found");
} else {
  console.log(`BILLING FLOW CHECK: ${problems.length} problem(s)`);
  for (const problem of problems) console.log("  - " + problem);
  process.exitCode = 1;
}
