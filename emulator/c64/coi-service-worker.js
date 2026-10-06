// SPDX-License-Identifier: GPL-3.0-or-later
// CCG Browser C64 cross-origin-isolation service worker.
//
// GitHub Pages does not support repository _headers files, but the C64 core's
// SID transport uses SharedArrayBuffer. A service worker can return the
// emulator document with the required COOP/COEP headers after one controlled
// reload. This worker is intentionally scoped to /emulator/c64/ so it cannot
// affect the rest of the CCG website.

"use strict";

const EMULATOR_SCOPE = "/emulator/c64/";

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

function withIsolationHeaders(response) {
  if (!response || response.status === 0) return response;

  const headers = new Headers(response.headers);
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Permissions-Policy", "gamepad=(self)");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith(EMULATOR_SCOPE)) {
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: "no-store" });
      return withIsolationHeaders(response);
    } catch {
      return new Response(
        "The CCG C64 emulator could not load its isolated document. Check the connection and reload.",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp",
          },
        }
      );
    }
  })());
});
