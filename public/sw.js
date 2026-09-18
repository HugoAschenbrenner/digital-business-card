/* Only public card resources are cached. Admin pages, credentials and API mutations never are. */
const CACHE = "hugo-card-v1";
const CORE = [
  "/card",
  "/contact.vcf",
  "/assets/profile.webp",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/api/assets/main-qr.svg",
  "/api/assets/offline-qr.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        CORE.map(async (url) => {
          const r = await fetch(url, { cache: "reload" });
          if (r.ok) {
            if (url === "/card") {
              const html = await r.clone().text();
              const assets = [
                ...new Set(
                  [
                    ...html.matchAll(
                      /(?:src|href)="(\/_next\/static\/[^"?]+(?:\?[^" ]*)?)"/g,
                    ),
                  ].map((m) => m[1].replaceAll("&amp;", "&")),
                ),
              ];
              await Promise.allSettled(
                assets.map(async (a) => {
                  const res = await fetch(a);
                  if (res.ok) await cache.put(a, res);
                }),
              );
            }
            await cache.put(url, r);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("hugo-card-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_CARD_CACHE") event.waitUntil(caches.delete(CACHE));
});
self.addEventListener("fetch", (event) => {
  const req = event.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    req.headers.get("RSC") === "1"
  )
    return;
  const path = url.pathname;
  const eligible =
    CORE.includes(path) ||
    path.startsWith("/_next/static/") ||
    path.startsWith("/assets/") ||
    path === "/media/profile";
  if (!eligible) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const key = path === "/card" ? "/card" : req;
      const cached = await cache.match(key);
      const update = fetch(req).then(async (response) => {
        if (response.ok && response.type === "basic")
          await cache.put(key, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(update.catch(() => {}));
        return cached;
      }
      try {
        return await update;
      } catch {
        return new Response(
          "This resource is not saved yet. Connect once to save the card for offline use.",
          { status: 503, headers: { "Content-Type": "text/plain" } },
        );
      }
    })(),
  );
});
