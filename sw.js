/* Service worker: offline app shell. Bump VERSION when app files change.
   The photo-recognition engine + model (~25 MB) are NOT precached: they are cached on first use
   in a separate, long-lived cache (MODEL_CACHE) so an app update doesn't re-download them. */
var VERSION = 'cc-v4';
var FONT_CACHE = 'cc-fonts-v1'; // bundled web fonts (OFL), precached + cache-first; bump if font files change
var FONTS = ['fonts/fonts.css','fonts/comic-neue-400.woff2', 'fonts/comic-neue-700.woff2', 'fonts/inter-400-800.woff2', 'fonts/jetbrains-mono-400-800.woff2', 'fonts/lora-400-700.woff2', 'fonts/montserrat-400-800.woff2', 'fonts/nunito-400-800.woff2', 'fonts/playfair-display-400-800.woff2', 'fonts/poppins-400.woff2', 'fonts/poppins-600.woff2', 'fonts/poppins-700.woff2', 'fonts/poppins-800.woff2', 'fonts/roboto-400-800.woff2'];
var MODEL_CACHE = 'cc-model-aiy-food-v1-ort-1.30.0';
var SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'photo.js', 'foods-fallback.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(SHELL).then(function () {
      return c.add('foods.json').catch(function () { /* optional file */ });
    });
  }).then(function () {
    return caches.open(FONT_CACHE).then(function (c) { return c.addAll(FONTS); });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== MODEL_CACHE && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function isModelAsset(url) { return /\/(vendor|model)\//.test(url.pathname); }

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // Open Food Facts etc.: straight to network
  if (isModelAsset(url)) {
    // cache-first, never revalidated (files are versioned by MODEL_CACHE)
    e.respondWith(caches.open(MODEL_CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }
  if (/\/fonts\//.test(url.pathname)) {
    // fonts: cache-first from the font cache (precached on install)
    e.respondWith(caches.open(FONT_CACHE).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
      });
    }));
    return;
  }
  var networkFirst = /foods\.json$/.test(url.pathname) || req.mode === 'navigate';
  if (networkFirst) {
    e.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
    }));
    return;
  }
  // stale-while-revalidate for the app shell
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (cached) {
    var net = fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return cached; });
    return cached || net;
  }));
});
