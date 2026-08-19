/* CCG public offline service worker */
"use strict";

const CACHE_VERSION = "2026-08-19-public-release-v4";
const SHELL_CACHE = `ccg-shell-${CACHE_VERSION}`;
const PAGE_CACHE = `ccg-pages-${CACHE_VERSION}`;
const ASSET_CACHE = `ccg-assets-${CACHE_VERSION}`;
const DATA_CACHE = `ccg-public-data-${CACHE_VERSION}`;
const CACHE_PREFIX = "ccg-";
const OFFLINE_URL = "/offline.html";

const PUBLIC_SHELL = Object.freeze([
  OFFLINE_URL,
  "/home.html",
  "/install-app.html",
  "/games/",
  "/games/discover/",
  "/music/",
  "/quiz/quiz.html",
  "/manifest.webmanifest",
  "/resources/images/ccg-app-icon.svg",
  "/resources/css/ccg-global.css",
  "/resources/css/ccg-nav.css",
  "/resources/css/ccg-nav-fit.css",
  "/resources/css/ccg-socials.css",
  "/resources/css/ccg-footer.css",
  "/resources/css/ccg-pwa-install-page.css",
  "/js/ccg-nav.js",
  "/js/ccg-nav-core.js",
  "/js/ccg-nav-fit.js",
  "/js/ccg-header-auth-loader.js",
  "/js/ccg-auth.js",
  "/js/ccg-music-navigation.js",
  "/js/ccg-pwa.js",
  "/js/ccg-pwa-visible-install.js",
  "/js/ccg-release-check.js"
]);

const PRIVATE_PATH_PREFIXES = Object.freeze([
  "/admin/",
  "/community/",
  "/auth/",
  "/supabase/"
]);

const PUBLIC_DATA_PATHS = new Set([
  "/games/games.json",
  "/games/games-search.json",
  "/data/retro-specials.json"
]);

const CODE_ASSET_PATTERN = /\.(?:css|js|mjs)$/i;
const STATIC_ASSET_PATTERN = /\.(?:png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp3|ogg|wav)$/i;

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function hasSensitiveQuery(url) {
  const sensitiveKeys = [
    "access_token",
    "refresh_token",
    "token",
    "code",
    "auth",
    "session"
  ];
  return sensitiveKeys.some((key) => url.searchParams.has(key));
}

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPrivateRequest(request, url) {
  if (!isSameOrigin(url)) return true;
  if (isPrivatePath(url.pathname)) return true;
  if (hasSensitiveQuery(url)) return true;
  if (request.headers.has("authorization")) return true;
  if (request.cache === "no-store") return true;
  return false;
}

function canStoreResponse(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cacheControl = String(response.headers.get("cache-control") || "").toLowerCase();
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) return false;
  const vary = String(response.headers.get("vary") || "").toLowerCase();
  if (vary.includes("authorization") || vary.includes("cookie")) return false;
  return true;
}

function normalisedPageRequest(url) {
  return new Request(`${url.origin}${url.pathname}`, {
    method: "GET",
    headers: { accept: "text/html" },
    credentials: "same-origin"
  });
}

async function putIfPublic(cacheName, key, response) {
  if (!canStoreResponse(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(key, response.clone());
}

async function precachePublicShell() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(PUBLIC_SHELL.map(async (path) => {
    try {
      const request = new Request(path, { cache: "reload", credentials: "same-origin" });
      const response = await fetch(request);
      if (canStoreResponse(response)) await cache.put(request, response);
    } catch (error) {
      // One optional shell asset must not prevent the service worker installing.
    }
  }));
}

async function deleteOldCaches() {
  const current = new Set([SHELL_CACHE, PAGE_CACHE, ASSET_CACHE, DATA_CACHE]);
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => {
    if (key.startsWith(CACHE_PREFIX) && !current.has(key)) return caches.delete(key);
    return Promise.resolve(false);
  }));
}

async function networkFirstPage(event, request, url) {
  const cacheKey = normalisedPageRequest(url);
  const cache = await caches.open(PAGE_CACHE);

  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || await fetch(request);
    if (canStoreResponse(response)) await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(cacheKey)
      || await caches.match(request, { ignoreSearch: true })
      || await caches.match(OFFLINE_URL);
    if (cached) return cached;
    return new Response("CCG is offline.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: false });

  const network = fetch(request)
    .then(async (response) => {
      if (canStoreResponse(response)) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    void network;
    return cached;
  }

  const response = await network;
  if (response) return response;
  return new Response("", { status: 504, statusText: "Offline" });
}

async function networkFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);

  try {
    const response = await fetch(request, { cache: "reload" });
    if (canStoreResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: false })
      || await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (canStoreResponse(response)) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precachePublicShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await deleteOldCaches();
    if (self.registration.navigationPreload) {
      try {
        await self.registration.navigationPreload.enable();
      } catch (error) {}
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  if (isPrivateRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event, request, url));
    return;
  }

  if (PUBLIC_DATA_PATHS.has(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  if (CODE_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }

  if (event.data?.type === "CLEAR_PUBLIC_CACHES") {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .map((key) => caches.delete(key)));
    })());
  }
});