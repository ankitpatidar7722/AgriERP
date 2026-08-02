/**
 * Screenshots the login screen in both themes and at both widths, and drives
 * the "remember me" round trip end to end: tick it, sign in, come back, and
 * confirm the fields were refilled - then untick and confirm they were not.
 *
 * The greeting is checked against the browser's own clock rather than a fixed
 * string, since it changes four times a day.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const OUT = process.argv[2] ?? "./shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];

/* -------------------------- looks: both themes -------------------------- */
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && problems.push(`console (${theme}): ${m.text().slice(0, 140)}`));
  page.on("pageerror", (e) => problems.push(`pageerror (${theme}): ${String(e).slice(0, 140)}`));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const heading = (await page.locator("h1").first().innerText()).trim();
  const expected = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good Morning";
    if (h >= 12 && h < 17) return "Good Afternoon";
    if (h >= 17) return "Good Evening";
    return "Good Night";
  })();
  if (heading !== expected) problems.push(`${theme}: greeting is "${heading}", expected "${expected}"`);
  else console.log(`[${theme}] greeting "${heading}" matches the clock`);

  const body = await page.locator("body").innerText();
  if (/company code/i.test(body)) problems.push(`${theme}: Company Code field is still on the page`);
  if (!/Financial Year/i.test(body)) problems.push(`${theme}: Financial Year label missing`);

  const svgCount = await page.locator("svg[role='img']").count();
  if (svgCount < 1) problems.push(`${theme}: brand logo did not render`);

  await page.screenshot({ path: `${OUT}/login-${theme}.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const mobileWidth = await page.evaluate(() => document.body.scrollWidth);
  if (mobileWidth > 400) problems.push(`${theme}: login scrolls sideways on mobile (${mobileWidth}px)`);
  await page.screenshot({ path: `${OUT}/login-mobile-${theme}.png` });

  await context.close();
}

/* ------------------------ behaviour: remember me ------------------------ */
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#userName", "admin");
await page.fill("#password", "Admin@123");
await page.click("#rememberMe");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|change-password/, { timeout: 20000 });
console.log("[remember] signed in with the switch on");

// Come back to the login screen in the same browser profile.
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const filledUser = await page.inputValue("#userName");
const filledPass = await page.inputValue("#password");
const switchOn = await page.locator("#rememberMe").getAttribute("data-state");

if (filledUser !== "admin") problems.push(`remember: username not restored (got "${filledUser}")`);
if (filledPass !== "Admin@123") problems.push("remember: password not restored");
if (switchOn !== "checked") problems.push(`remember: switch not restored (state ${switchOn})`);
if (filledUser === "admin" && filledPass === "Admin@123" && switchOn === "checked") {
  console.log("[remember] username, password and switch all restored");
}

// Turning it off must forget immediately, not at the next sign-in.
await page.click("#rememberMe");
await page.waitForTimeout(300);
const cleared = await page.evaluate(() => window.localStorage.getItem("agrierp.remembered-login"));
if (cleared !== null) problems.push("remember: unticking did not clear stored credentials");
else console.log("[remember] unticking cleared storage straight away");

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
if ((await page.inputValue("#password")) !== "") {
  problems.push("remember: password came back after it was forgotten");
}

await context.close();
await browser.close();

console.log("\n----------------------------------------");
if (problems.length === 0) {
  console.log("LOGIN CHECK: no problems found");
} else {
  console.log(`LOGIN CHECK: ${problems.length} problem(s)`);
  for (const p of problems) console.log("  - " + p);
  process.exitCode = 1;
}
