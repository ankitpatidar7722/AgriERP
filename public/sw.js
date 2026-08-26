/*
  AgriERP service worker — Phase 1 (installable + faster repeat loads).

  Deliberately conservative so it can NEVER serve stale app data:
   - Only SAME-ORIGIN GET requests are touched. The API lives on another origin
     (NEXT_PUBLIC_API_URL), so every data call bypasses the SW entirely.
   - Only immutable static assets (Next's hashed /_next/static, icons, images,
     fonts) are cached, stale-while-revalidate.
   - Page navigations and everything else fall through to the network, so the
     HTML/app is always fresh. No offline page in Phase 1.
*/
const CACHE = "agrierp-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch the API (other origin)

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:js|css|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf)$/.test(url.pathname);
  if (!isStatic) return; // pages/navigations -> network (always fresh)

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
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
