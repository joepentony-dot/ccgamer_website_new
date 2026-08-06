# Phase 15 — Archive Structured Data

## Purpose

Add structured data to archive and quiz routes that do not already receive a complete schema graph from an authoritative generator. The implementation is adaptive so existing publisher, developer, year and other generated schema is not duplicated.

## Schema vocabulary

This phase uses the current Schema.org vocabulary:

- `CollectionPage` for browsable archive landing and detail pages;
- `ItemList` for visible game or archive destinations;
- `BreadcrumbList` for route hierarchy;
- `Quiz` for the CCG knowledge quiz.

Schema.org documents that an `ItemList` can report the full `numberOfItems` while its described item elements cover only part of a larger list. The CCG implementation therefore retains the full discovered count but limits the emitted `itemListElement` array to 200 entries to avoid oversized page metadata.

## Covered routes

### Root archives

- Games
- Genres
- Publishers
- Developers
- Years
- Platforms
- Collections
- Downloads
- Music
- Retro Specials
- Zzap!64 Awards

### Detail archives

- Genre pages
- Publisher pages
- Developer pages
- Year pages
- Platform pages
- Collection pages
- Composer pages
- Retro Special pages

### Quiz

The main quiz receives `Quiz` and `BreadcrumbList` schema. Individual questions and answers are not emitted because the live quiz controls its question state dynamically and answer disclosure would add no visitor benefit.

## Adaptive duplicate prevention

Before adding schema, the module parses existing JSON-LD blocks and records their types. It adds only types that are missing:

- an existing `CollectionPage` is retained;
- an existing `ItemList` is retained;
- an existing `BreadcrumbList` is retained;
- an existing `Quiz` is retained.

The adaptive graph uses its own stable script ID and can update after dynamically rendered archive cards appear.

## Item discovery

- Visible game links are collected from the main page content.
- Root archive links are collected from their relevant route hierarchy.
- The Games root can use the existing `games/games.json` archive as a cached fallback when too few static links are available at initial render.
- Duplicate URLs are removed.
- Names are taken from visible card titles or accessible labels, with a route-derived fallback.

## Performance

- The module exits on routes outside its archive and quiz scope.
- Game data is fetched only when the Games root needs a fallback list.
- The existing browser cache is used.
- Mutation observation is limited to the main content and automatically stops after five seconds.
- Repeated renders are ignored when the schema payload has not changed.

## Privacy and safety

No member information, private collections, account ratings or submission data is read or exposed. The implementation does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`.

Large generated archive pages remain untouched. The feature is loaded through the shared optional-module registry and is independently auditable.
