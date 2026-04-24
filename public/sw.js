// CervezaSystem Service Worker
// Strategy:
// - App shell + static: cache-first
// - HTML pages (navigations): network-first, fallback to cache
// - /api/*: network-only (but UI handles offline via queue)

const VERSION = "v3";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;

const SHELL_URLS = [
  "/",
  "/historial",
  "/reporte",
  "/cierre",
  "/manifest.webmanifest",
  "/icon",
  "/icon1",
  "/apple-icon",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL_URLS).catch(() => {
        // best-effort; individual failures don't abort install
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, STATIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

function isHTMLRequest(req) {
  return (
    req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept")?.includes("text/html"))
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/products/") ||
    url.pathname === "/icon" ||
    url.pathname === "/icon1" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Never cache API
  if (url.pathname.startsWith("/api/")) return;

  if (isHTMLRequest(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match("/"))
        )
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            return res;
          })
      )
    );
  }
});
