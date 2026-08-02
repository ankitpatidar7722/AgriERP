import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

async function shoot(page, name, theme) {
  await page.screenshot({ path: `${OUT}/${name}-${theme}.png`, fullPage: false });
}

/** Fails loudly on a blank or error page rather than silently saving a white PNG. */
async function assertRendered(page, name) {
  const text = (await page.locator("body").innerText()).trim();
  if (text.length < 40) problems.push(`${name}: page rendered almost no text (${text.length} chars)`);
  const errorText = await page.locator("text=/Application error|Unhandled Runtime/i").count();
  if (errorText > 0) problems.push(`${name}: Next.js error overlay is visible`);
  return text;
}

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`console error (${theme}): ${msg.text().slice(0, 160)}`);
  });
  page.on("pageerror", (err) => problems.push(`page error (${theme}): ${String(err).slice(0, 160)}`));

  // ---- login ----
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await assertRendered(page, `login-${theme}`);
  await shoot(page, "01-login", theme);

  // ---- sign in ----
  await page.fill("#userName", "admin");
  await page.fill("#password", "Admin@123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/change-password|dashboard/, { timeout: 20000 });

  if (page.url().includes("change-password")) {
    // The guard held the account on its default password - that is the correct
    // first-run behaviour, so it is captured rather than worked around.
    //
    // Patching localStorage to get past it does NOT work and must not be tried:
    // AuthProvider re-fetches /auth/me on mount and the server's answer wins,
    // so the guard immediately bounces back here. The caller clears
    // MustChangePassword in the database before running this script and
    // restores it afterwards.
    await assertRendered(page, `change-password-${theme}`);
    await shoot(page, "02-change-password", theme);
    problems.push(
      `${theme}: still forced onto /change-password - clear Users.MustChangePassword before running`,
    );
    await context.close();
    continue;
  }

  // ---- dashboard ----
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // let Recharts finish its enter animation
  const dashText = await assertRendered(page, `dashboard-${theme}`);
  for (const expected of ["Today's sales", "Stock value", "Sales, purchase and profit", "Stock value by sub group"]) {
    if (!dashText.includes(expected)) problems.push(`dashboard-${theme}: missing "${expected}"`);
  }
  // The charts must actually have drawn SVG geometry, not just a container.
  const svgPaths = await page.locator(".recharts-wrapper svg path").count();
  if (svgPaths < 2) problems.push(`dashboard-${theme}: charts drew ${svgPaths} svg paths - looks empty`);
  console.log(`[${theme}] dashboard drew ${svgPaths} chart paths`);
  await shoot(page, "03-dashboard", theme);

  // ---- a master grid ----
  await page.goto(`${BASE}/item-subgroups`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const catText = await assertRendered(page, `categories-${theme}`);
  const rows = await page.locator("tbody tr").count();
  if (rows < 3) problems.push(`categories-${theme}: only ${rows} rows rendered`);
  if (!catText.includes("Insecticide")) problems.push(`categories-${theme}: seeded data not visible`);
  console.log(`[${theme}] categories grid rendered ${rows} rows`);
  await shoot(page, "04-categories", theme);

  // ---- product form dialog (the widest layout) ----
  await page.goto(`${BASE}/items`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "New item" }).click();
  await page.waitForTimeout(600);
  await assertRendered(page, `product-form-${theme}`);
  await shoot(page, "05-product-form", theme);

  // ---- narrow viewport: the sidebar must collapse into the drawer ----
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  if (bodyWidth > 400) problems.push(`mobile-${theme}: body scrolls horizontally (${bodyWidth}px wide)`);
  console.log(`[${theme}] mobile body width ${bodyWidth}px`);
  await shoot(page, "06-mobile-dashboard", theme);

  await context.close();
}

await browser.close();

console.log("\n----------------------------------------");
if (problems.length === 0) {
  console.log("VISUAL CHECK: no problems found");
} else {
  console.log(`VISUAL CHECK: ${problems.length} problem(s)`);
  for (const problem of problems) console.log("  - " + problem);
}
