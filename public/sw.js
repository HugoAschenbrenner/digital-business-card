/* Only public card resources are cached. Admin pages, credentials and API mutations never are. */
const CACHE = "hugo-card-v2";
const CORE = [
  "/card",
  "/contact.vcf",
  "/assets/profile.webp",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/api/assets/main-qr.svg",
  "/api/assets/offline-qr.svg",
];
function isPublicAsset(path) {
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/assets/") ||
    path === "/media/profile" ||
    (path !== "/card" && CORE.includes(path))
  );
}

// Save each new HTML snapshot together with its dependencies, including after
// deployments and admin cache clears. Never replace a usable offline snapshot
// with HTML whose new script/style files could not be fetched.
async function cacheCard(cache, response) {
  const html = await response.clone().text();
  const previous = await cache.match("/card");
  const changed = !previous || (await previous.clone().text()) !== html;
  const assets = new Set(CORE.filter((path) => path !== "/card"));
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const url = new URL(
      match[1].replaceAll("&amp;", "&"),
      self.location.origin,
    );
    if (url.origin === self.location.origin && isPublicAsset(url.pathname)) {
      assets.add(url.pathname + url.search);
    }
  }
  let missingCode = false;
  await Promise.allSettled(
    [...assets].map(async (asset) => {
      const code = asset.startsWith("/_next/static/");
      if ((!changed || code) && (await cache.match(asset))) return;
      try {
        const res = await fetch(asset);
        if (!res.ok) throw new Error("Asset unavailable");
        await cache.put(asset, res);
      } catch {
        if (code) missingCode = true;
      }
    }),
  );
  if (!previous || !missingCode) await cache.put("/card", response);
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(
        CORE.map(async (url) => {
          const r = await fetch(url, { cache: "reload" });
          if (r.ok) {
            if (url === "/card") await cacheCard(cache, r);
            else await cache.put(url, r);
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
  const eligible = CORE.includes(path) || isPublicAsset(path);
  if (!eligible) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const key = path === "/card" ? "/card" : req;
      const cached = await cache.match(key);
      const update = fetch(req).then((response) => {
        if (response.ok && response.type === "basic") {
          const save =
            path === "/card"
              ? cacheCard(cache, response.clone())
              : cache.put(key, response.clone());
          event.waitUntil(save.catch(() => {}));
        }
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
