/**
 * Guards the product form.
 *
 * History: the form used to be three tabs, and a required field on a tab the
 * operator was not looking at silently blocked Create - Radix unmounts inactive
 * panels, so the explanation was not even in the DOM. The tabs are gone and
 * every field is on one panel now, which is what part 1 asserts: no field may
 * be hidden behind anything.
 *
 *   Part 1  every required field is present and visible in one panel
 *   Part 2  an incomplete form says why instead of doing nothing
 *   Part 3  a complete form actually saves
 *
 * Prerequisites: API on :5215, web on :3000, MustChangePassword cleared.
 */
import { chromium } from "playwright";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const problems = [];

page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

/**
 * Picks the first option of a Radix Select by keyboard.
 *
 * Clicking the option directly is flaky: the listbox renders in a portal over
 * the dialog, and Playwright then reports the dialog subtree intercepting
 * pointer events on whatever is clicked next.
 */
async function pickFirstOption(combobox) {
  await combobox.scrollIntoViewIfNeeded();
  await combobox.click();
  await page.waitForTimeout(350);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(350);
}

const notice = async () =>
  (await page.locator('[role="alert"]').count())
    ? (await page.locator('[role="alert"]').first().innerText()).trim()
    : null;

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#userName", "admin");
await page.fill("#password", "Admin@123");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|change-password/, { timeout: 20000 });

await page.goto(`${BASE}/items`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

await page.getByRole("button", { name: "New item" }).click();
await page.waitForTimeout(700);

/* ===== part 1: one panel, nothing hidden ===== */
if (await page.locator('[role="tab"]').count()) {
  problems.push("the form still has tabs - fields can be hidden again");
}

const dialog = page.locator('[role="dialog"]');
const dialogText = await dialog.innerText();
for (const label of [
  "Item name", "Sub group", "Selling unit", // required, was Basics
  "GST rate", "MRP", "Selling rate", // was Pricing & tax
  "Minimum stock", "Batch tracking", // was Stock
]) {
  if (!dialogText.includes(label)) problems.push(`"${label}" is not in the single form`);
}
console.log(`part 1: ${(await dialog.locator("label").count())} labelled fields on one panel`);

/* ===== part 2: incomplete submit must explain itself ===== */
const unique = `ZZ Sulphur ${process.argv[2] ?? "T1"}`;
await page.fill("#itemName", unique);
await page.getByRole("button", { name: "Create", exact: true }).click();
await page.waitForTimeout(900);

const message = await notice();
console.log(`part 2: notice ${message ? `"${message}"` : "(none)"}`);
if ((await dialog.count()) === 0) problems.push("dialog closed on an incomplete form");
if (!message) problems.push("incomplete submit gave no visible message");

/* ===== part 3: complete it and save ===== */
// Targeted by id, not by position. Index-based picking broke silently the
// moment an Item group select was added at the top of the form: every nth()
// shifted by one, and the failure surfaced as "a completed form did not save",
// which points nowhere near the cause.
for (const id of ["itemSubGroupId", "unitId", "gstSlabId"]) {
  await pickFirstOption(page.locator(`#${id}`));
}

await page.getByRole("button", { name: "Create", exact: true }).click();

// Wait for the dialog to close rather than guessing at a fixed delay - a cold
// API on its first write can easily take longer than a hardcoded pause.
await dialog
  .waitFor({ state: "detached", timeout: 15000 })
  .catch(() => {});

if ((await dialog.count()) > 0) {
  // Report what is actually on screen; "did not save" with no reason is a
  // failure message that sends the next person hunting.
  const fieldErrors = await dialog.locator("p.text-destructive").allInnerTexts();
  const submitDisabled = await page
    .getByRole("button", { name: "Create", exact: true })
    .isDisabled();
  problems.push(
    `a completed form still did not save. notice=${(await notice()) ?? "(none)"}; ` +
      `field errors=[${fieldErrors.join(" | ") || "none"}]; still submitting=${submitDisabled}`,
  );
  await page.screenshot({ path: "product-create-failure.png" });
} else {
  const listed = await page.locator("tbody").innerText();
  if (!listed.includes(unique)) problems.push("dialog closed but the product is not in the list");
  else console.log(`part 3: created and listed "${unique}"`);
}

await browser.close();

console.log("\n----------------------------------------");
if (problems.length === 0) {
  console.log("PRODUCT CREATE CHECK: no problems found");
} else {
  console.log(`PRODUCT CREATE CHECK: ${problems.length} problem(s)`);
  for (const p of problems) console.log("  - " + p);
  process.exitCode = 1;
}
