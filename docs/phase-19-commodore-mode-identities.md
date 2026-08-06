# Phase 19 — Commodore Mode Identities

## Purpose

Make the existing C64 and Amiga display modes feel more distinct without splitting the website, replacing navigation or adding further homepage sections.

The phase adds one compact status strip directly after the shared header. It works alongside the existing mode toggle and established Amiga window treatment.

## C64 identity

C64 mode presents:

- **COMMODORE 64 MODE**;
- a `READY.` status;
- a compact ascending-block identity mark;
- `64K RAM SYSTEM` and archive-online details on wider screens;
- a restrained blue grid layer;
- stronger blue upper edges on archive cards.

The wording references the machine's familiar BASIC screen without recreating or interfering with the protected intro loader.

## Amiga identity

Amiga mode presents:

- **COMMODORE AMIGA MODE**;
- a `WORKBENCH` status;
- a small striped ball identity mark;
- `DF0: CCG ARCHIVE` and desktop-online details on wider screens;
- a subtle Workbench-like geometric surface layer;
- stronger pink/purple upper edges on archive cards.

The existing `ccg-amiga-identity.js` module remains intact and continues supplying window-style panels, title bars and gadgets.

## Behaviour

- The current mode is read from the established `data-mode` and `data-ccg-mode` attributes.
- Attribute changes are observed so the strip updates after the visitor uses the existing mode toggle.
- The mode change receives a brief signal animation.
- The strip announces the updated mode through an accessible live status region.
- On narrow screens, secondary details are hidden to preserve header space.
- Administrator, authentication and member routes are excluded.

## Scope control

This phase deliberately adds only one compact status strip. It does not:

- introduce another navigation row;
- add audio or autoplay effects;
- alter the mode toggle;
- move existing page sections;
- create separate C64 and Amiga versions of content;
- store additional visitor preferences;
- change game data.

## Accessibility

- The status bar has a descriptive label and polite live updates.
- Decorative identity marks are hidden from assistive technology.
- Reduced-motion preferences disable the mode-change animation.
- The bar is omitted from print output.
- Text remains visible without relying on colour alone.

## Safety

The implementation does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`;
- the existing Amiga identity files.
