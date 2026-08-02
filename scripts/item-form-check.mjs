/**
 * Drives the group-driven item form in a real browser.
 *
 * The claim being checked is the whole point of the restructure: choosing a
 * different item group changes which questions the form asks, and those
 * questions come from the database rather than from this codebase.
 *
 * Usage: node scripts/item-form-check.mjs <outDir> [baseUrl]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "./shots";
// Same env var as every other browser script, so the runner sets the port once.
const BASE = process.env.WEB_URL ?? process.argv[3] ?? "http://localhost:3000";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const problems = [];

page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text().slice(0, 160)}`);
});

async function openFormForGroup(name) {
  // The group is chosen in the list header now, not inside the form, so each
  // group's fields are seen by picking the group above the grid and opening a
  // fresh New item form under it. Any open dialog is closed first.
  if (await page.locator('[role="dialog"]').count()) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  const header = page.locator('[aria-label="Item group"]');
  await header.click();
  await page.waitForTimeout(350);
  await page.getByRole("option", { name: new RegExp(name, "i") }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "New item" }).click();
  await page.waitForTimeout(2500); // let the group's own fields load
}

const dialogText = () => page.locator('[role="dialog"]').innerText();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill("#userName", "admin");
await page.fill("#password", "Admin@123");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|change-password/, { timeout: 20000 });

/* ---- the menu was renamed in the database, not in code ---- */
await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const nav = await page.locator("aside").innerText();
// The rail shows module HEADS, not every module name, so asserting on the
// individual labels here would be asserting on a layout choice. What matters
// is that no renamed label survived anywhere in it.
if (/\bProducts\b/.test(nav)) problems.push('sidebar still says "Products"');
if (/\bCategories\b/.test(nav)) problems.push('sidebar still says "Categories"');
console.log(`sidebar: ${nav.split("\n").filter(Boolean).join(" | ")}`);

/* ---- the item groups screen ---- */
await page.goto(`${BASE}/item-groups`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const groupsText = await page.locator("body").innerText();
for (const g of ["Product Master", "Fertilizers Master", "Seed Master", "Other Master"]) {
  if (!groupsText.includes(g)) problems.push(`item groups page missing "${g}"`);
}
for (const prefix of ["P-000001", "F-000001", "S-000001", "R-000001"]) {
  if (!groupsText.includes(prefix)) problems.push(`item groups page missing prefix ${prefix}`);
}
await page.screenshot({ path: `${OUT}/item-groups.png`, fullPage: true });

/* ---- the form changes with the group ---- */
await page.goto(`${BASE}/items`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

await openFormForGroup("Seed Master");
const seedForm = await dialogText();
await page.screenshot({ path: `${OUT}/item-form-seed.png` });
for (const label of ["Variety", "Germination", "Lot number", "Seed details"]) {
  if (!seedForm.toLowerCase().includes(label.toLowerCase())) problems.push(`Seed form is missing "${label}"`);
}
if (seedForm.toLowerCase().includes("n-p-k")) problems.push("Seed form shows a fertilizer field");
console.log("seed form: shows Variety / Germination / Lot number");

await openFormForGroup("Fertilizers Master");
const fertForm = await dialogText();
await page.screenshot({ path: `${OUT}/item-form-fertilizer.png` });
for (const label of ["N-P-K", "Composition"]) {
  if (!fertForm.toLowerCase().includes(label.toLowerCase())) problems.push(`Fertilizer form is missing "${label}"`);
}
if (fertForm.toLowerCase().includes("germination")) {
  problems.push("Fertilizer form still shows the seed germination field");
}
console.log("fertilizer form: shows N-P-K, seed fields gone");

await openFormForGroup("Product Master");
const prodForm = await dialogText();
await page.screenshot({ path: `${OUT}/item-form-product.png` });
for (const label of ["Safety", "Antidote"]) {
  if (!prodForm.toLowerCase().includes(label.toLowerCase())) problems.push(`Product form is missing "${label}"`);
}
if (prodForm.toLowerCase().includes("n-p-k")) problems.push("Product form still shows the fertilizer field");
console.log("product form: shows Safety / Antidote, fertilizer fields gone");

/* ---- a required group field is enforced in the browser ---- */
await openFormForGroup("Seed Master");
await page.fill("#itemName", "ZZ Browser Seed");
await page.getByRole("button", { name: "Create", exact: true }).click();
await page.waitForTimeout(2500);
const alerts = await page.locator('[role="alert"]').count();
if (alerts === 0) problems.push("submitting without the required group fields gave no message");
else {
  const msg = (await page.locator('[role="alert"]').first().innerText()).trim();
  console.log(`required-field guard: "${msg}"`);
}

await browser.close();

console.log("\n----------------------------------------");
if (problems.length === 0) {
  console.log("ITEM FORM CHECK: no problems found");
} else {
  console.log(`ITEM FORM CHECK: ${problems.length} problem(s)`);
  for (const p of problems) console.log("  - " + p);
  process.exitCode = 1;
}
