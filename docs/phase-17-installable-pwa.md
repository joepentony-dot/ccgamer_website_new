# Phase 17 — Installable CCG Web App

## Purpose

Make the public Cheeky Commodore Gamer website installable as a Progressive Web App while preserving the existing multi-page site and protecting all account and administrator traffic from offline storage.

The installation uses a web app manifest for identity and launch behaviour plus a service worker for a deliberately small public offline shell.

## Installation identity

`manifest.webmanifest` defines:

- stable app ID and root scope;
- **Cheeky Commodore Gamer** and short name **CCG**;
- standalone display;
- `/app-launch.html?source=pwa` as the installed-app launch route;
- a dark CCG launch and theme colour of `#020711`;
- Games and Entertainment categories;
- shortcuts to Browse Games, Find Me a Game and the Commodore Quiz;
- separate standard and maskable launcher artwork.

The launcher artwork uses versioned filenames:

- `/resources/images/ccg-app-icon-v2.svg` for standard launcher use;
- `/resources/images/ccg-app-icon-maskable-v2.svg` for Android maskable-icon use.

The versioned names are intentional because static images use long-lived immutable caching. Reusing the previous filename could leave an installed phone showing the old blurred artwork after deployment.

Both new SVGs avoid the Gaussian blur/filter used by the previous app icon. The maskable variant uses a full-bleed dark background while keeping the CCG mark inside a conservative central safe area.

## Two-stage launch experience

Installed CCG now uses a two-stage launch.

### Stage 1 — operating-system splash

Android/Chromium can build its system splash from the manifest `background_color`, `theme_color` and launcher icon. The dark `#020711` background and crisp versioned artwork are intended to prevent the previous white screen with an enlarged blurred mark.

### Stage 2 — CCG launch bridge

The manifest then opens `/app-launch.html?source=pwa` instead of loading the full home page immediately.

The launch bridge is deliberately lightweight and independent from the normal site shell. It loads only:

- `/resources/css/ccg-app-launch.css`;
- `/js/ccg-app-launch.js`;
- `/resources/images/ccg-app-icon-v2.svg`.

The portrait-first screen provides C64/Amiga identity, the **Stay a while, stay forever!** line, a restrained archive-loading animation, safe-area support and a direct Enter link. It hands off to `/home.html?source=pwa` after roughly one second using `location.replace`, so it does not pollute browser/app history.

`prefers-reduced-motion` removes the decorative motion and shortens the handoff delay.

This launch route is for the installed app only. It does not replace or modify the normal website intro or the established home-page presentation.

## Manifest delivery

The shared `js/ccg-pwa.js` module injects the manifest and mobile-app metadata on pages using the established navigation core. It now uses the versioned v2 launcher icon for injected favicon/apple-touch-icon metadata as well.

## Public offline shell

The service worker precaches a deliberately small public shell including:

- the app launch bridge;
- its launch CSS and JavaScript;
- standard and maskable v2 icons;
- Home;
- Games;
- Find Me a Game;
- Music;
- Quiz;
- the install page;
- the offline page;
- the manifest;
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

The mobile-launch release bumps the public cache version so existing installations can receive the new launch shell rather than remaining on the previous cached package.

## Connection status

A temporary accessible notice appears when the browser goes offline or comes back online. The permanent offline page also provides Retry, Home, Games and Find Me a Game controls and now uses the same v2 app identity.

## Safety

This phase does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`.

It adds no push notifications, background synchronisation, advertising identifiers or account caching.
