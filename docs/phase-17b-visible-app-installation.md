# Phase 17B — Visible CCG App Installation

## Purpose

Make the existing Progressive Web App installation route easy to find without relying on the delayed browser prompt.

## Visitor controls

- Adds an **Install CCG App** destination to the shared secondary navigation. The established adaptive navigation can move it into More when space is limited.
- Adds `/install-app.html` with device-specific instructions for Android, Windows, iPhone and iPad.
- Uses the browser's native install prompt when it is available.
- Reports when CCG is already running as an installed app.
- Falls back to browser-menu guidance when the native prompt is unavailable.

## Existing PWA retained

The app still uses:

- the existing stable manifest identity;
- standalone launch behaviour;
- the public offline service worker;
- user-controlled updates;
- no push notifications or background synchronisation.

## Privacy boundary

No account, community, administrator, Supabase or authorisation-bearing response is added to offline storage. The installation page is public guidance only.

## Safety

This phase does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`.

The existing delayed install panel remains restrained. The permanent navigation link gives visitors a deliberate route when they are ready to install the app.
