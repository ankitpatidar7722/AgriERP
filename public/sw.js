/*
  AgriERP service worker — Phase 2 (installable + faster repeats + offline shell).

  Conservative so it can NEVER serve stale app DATA:
   - Only SAME-ORIGIN GET requests are touched. The API lives on another origin
     (NEXT_PUBLIC_API_URL), so every data call bypasses the SW entirely and is
     always live.
   - Immutable static assets (Next's hashed /_next/static, icons, images, fonts)
     are cached stale-while-revalidate.
   - App navigations are network-FIRST (always fresh when online) but fall back
     to the last cached copy of that page when offline — this is what lets the
     Offline Bill screen open with no connection. The HTML is only the shell;
     real data still comes from the API (live) or the page's own localStorage.
*/
const STATIC = "agrierp-static-v2";
const PAGES = "agrierp-pages-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC, PAGES]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch the API (other origin)

  // App navigations: network-first, cached page as the offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const res = await fetch(req);
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await cache.match(req);
          return cached || (await cache.match("/sales/offline")) || Response.error();
        }
      })(),
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/.test(url.pathname);
  if (!isStatic) return; // other non-navigation requests -> network

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })(),
  );
});
