/* Service worker: keeps a copy of the app on the phone so it opens without internet.
   When you change any app file, bump VERSION so phones download the new copy. */
const VERSION = "loka-v2";
const FILES = [
  "./", "index.html", "styles.css", "data.js", "app.js", "manifest.webmanifest",
  "fonts/anton.woff2", "fonts/archivo.woff2", "fonts/ibm-plex-mono-500.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png", "icons/favicon-64.png", "icons/favicon-32.png",
  "icons/logo-header.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Offline first: answer from the saved copy, fall back to the internet for anything else.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).catch(() =>
      req.mode === "navigate" ? caches.match("index.html") : Response.error()
    ))
  );
});
