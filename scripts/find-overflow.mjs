import { chromium } from "playwright";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill("#userName", "admin");
await page.fill("#password", "Admin@123");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/, { timeout: 20000 });
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const offenders = await page.evaluate(() => {
  const limit = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > limit + 0.5 || r.left < -0.5) {
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.toString?.() ?? "").slice(0, 110),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        depth: (() => { let d = 0, n = el; while ((n = n.parentElement)) d++; return d; })(),
      });
    }
  }
  return { limit, scrollWidth: document.body.scrollWidth, offenders: out };
});

console.log(`clientWidth=${offenders.limit} bodyScrollWidth=${offenders.scrollWidth}`);
console.log(`${offenders.offenders.length} element(s) cross the right edge\n`);
for (const o of offenders.offenders.sort((a, b) => b.depth - a.depth).slice(0, 12)) {
  console.log(`d${o.depth} <${o.tag}> left=${o.left} right=${o.right} w=${o.width}\n     ${o.cls}`);
}

await browser.close();
