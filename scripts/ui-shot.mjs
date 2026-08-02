/**
 * Screenshots a set of screens in light and dark for a visual review.
 *
 * Not a test - it asserts nothing. It exists so a redesign can be looked at
 * rather than assumed, at the two viewports where layout actually breaks.
 *
 * Usage: node scripts/ui-shot.mjs <outDir> [route ...]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "./shots";
const ROUTES = process.argv.slice(3).length ? process.argv.slice(3) : ["/dashboard"];
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 140)));
  page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 140)));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#userName", "admin");
  await page.fill("#password", "Admin@123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard|change-password/, { timeout: 20000 });

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1400);
    const name = route.replace(/\//g, "-").replace(/^-/, "") || "root";
    await page.screenshot({ path: `${OUT}/${name}-${theme}.png` });

    const width = await page.evaluate(() => document.body.scrollWidth);
    const rail = await page.evaluate(() => {
      const el = document.querySelector("aside");
      return el ? Math.round(el.getBoundingClientRect().width) : null;
    });
    console.log(`[${theme}] ${route}  body=${width}px  rail=${rail}px`);
  }

  // Phone width, where the rail becomes a drawer.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/mobile-${theme}.png` });
  const mobileWidth = await page.evaluate(() => document.body.scrollWidth);
  console.log(`[${theme}] mobile body=${mobileWidth}px`);

  if (consoleErrors.length) {
    console.log(`[${theme}] CONSOLE ERRORS:`);
    for (const e of [...new Set(consoleErrors)]) console.log("   " + e);
  }

  await context.close();
}

await browser.close();
console.log(`\nScreenshots in ${OUT}`);
