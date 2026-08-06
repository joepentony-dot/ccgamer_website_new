# Phase 17 — Installable CCG Web App

## Purpose

Make the public Cheeky Commodore Gamer website installable as a Progressive Web App while preserving the existing multi-page site and protecting all account and administrator traffic from offline storage.

The implementation follows the current MDN and web.dev PWA guidance: a web app manifest supplies install identity and launch behaviour, while a service worker supplies a small public offline shell and navigation fallback.

## Installation identity

`manifest.webmanifest` defines:

- stable app ID and root scope;
- **Cheeky Commodore Gamer** and short name **CCG**;
- standalone display;
- `/home.html?source=pwa` as the launch route;
- C64-styled theme and background colours;
- Games and Entertainment categories;
- shortcuts to Browse Games, Find Me a Game and the Commodore Quiz;
- a square scalable CCG app icon.

The manifest includes explicit 192×192 and 512×512 declarations plus an `any` maskable declaration. The source is SVG so the same artwork remains sharp at different sizes and stays within a generous masking safe area.

SVG is supported by modern manifest implementations, but raster PNG variants can still improve compatibility on some older operating-system launchers. This phase does not claim universal legacy icon support.

## Manifest delivery

The shared `js/ccg-pwa.js` module injects the manifest link and mobile-app metadata on pages using the established shared navigation core. This avoids modifying the protected home and intro files while still giving normal CCG routes the same install identity.

## Public offline shell

The service worker precaches a deliberately small public shell:

- Home;
- Games;
- Find Me a Game;
- Quiz;
- the offline page;
- the manifest and app icon;
- essential shared navigation and presentation files.

Public navigation uses a network-first strategy. When the network is unavailable, a previously cached page is used; otherwise `/offline.html` is shown.

Public archive JSON uses stale-while-revalidate. Static code, fonts and images are cached after use.

## Privacy boundary

**No private pages or account responses are placed in the CCG offline caches.**

The service worker bypasses:

- `/admin/`;
- `/community/`;
- `/auth/`;
- `/supabase/`;
- cross-origin requests;
- requests carrying an Authorization header;
- URLs containing authentication or session parameters;
- responses marked `private` or `no-store`;
- responses varying on cookies or authorization.

Supabase requests remain outside the same-origin service-worker cache boundary. Member profiles, ratings, libraries, notes, submissions and administrator data therefore remain network-only.

## Install prompt behaviour

The website does not display an install panel on a visitor’s first page.

The panel requires:

- at least two public page visits;
- browser install eligibility, or iOS Safari;
- a nine-second delay;
- no existing standalone installation;
- no recent dismissal;
- a public route rather than an administrator or account route.

A dismissal is remembered for fourteen days. Chromium-family browsers use the standard `beforeinstallprompt` flow. iOS Safari receives a short Share → Add to Home Screen instruction instead.

## Updates

New service-worker versions do not force a reload. When an update is waiting, the site displays a compact **CCG update ready** panel. The visitor chooses when to reload, at which point the waiting worker receives `SKIP_WAITING` and the page refreshes after control changes.

## Connection status

A temporary accessible notice appears when the browser goes offline or comes back online. The permanent offline page also provides Retry, Home, Games and Find Me a Game controls.

## Safety

This phase does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`.

It adds no push notifications, background synchronisation, advertising identifiers or account caching.
