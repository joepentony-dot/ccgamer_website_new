# Phase 20 — Administrator Archive Quality Centre

## Purpose

Provide an administrator-only, read-only inspection centre for the C64 and Amiga catalogue. The report is generated from the live `games/games.json` and the currently deployed public files, so no separate spreadsheet or manually maintained quality list is required.

## Quick audit

The page automatically checks catalogue data after administrator access is granted. It reports:

- missing title, ID, slug, system, year, genre, description, YouTube ID, publisher, thumbnail or CCG rating;
- malformed canonical slugs;
- ratings outside 1–10;
- malformed YouTube video IDs;
- unsupported genre values;
- suspicious release-year values;
- malformed manual, download, reference or external URLs;
- duplicate IDs and slugs;
- repeated titles on the same system for manual confirmation;
- unusually short descriptions as an advisory rather than a publishing failure.

## Full audit

The administrator can run a deeper same-origin check covering:

- local thumbnail availability;
- optional local 3D-box availability;
- referenced local game audio;
- locally hosted manual or download files;
- canonical `/games/<slug>/` page availability;
- thumbnail files above 1.5 MB;
- 3D-box images above 2 MB.

Local checks use bounded concurrent `HEAD` requests. The feature does not download every asset body and does not send write requests.

## Report controls

The report supports:

- free-text search;
- severity filters;
- category filters;
- C64, Amiga and other-system filters;
- direct links to game pages and reported resources;
- copying the visible report;
- CSV export;
- JSON export.

## Read-only boundary

The page does not edit, save, upload, commit or publish catalogue information. It does not modify `games/games.json`, generated game pages, thumbnails, audio or external links. Corrections still pass through the established Game Builder and repository publishing workflow.

## External-link boundary

Browser-only checks cannot reliably prove whether a third-party YouTube, Google Drive or Lemon64 resource is permanently available. Cross-origin restrictions, rate limits and temporary service failures can otherwise create false broken-link reports. Phase 20 therefore validates external address and YouTube-ID format, provides direct review links and limits automatic availability claims to same-origin CCG files.

## Access and privacy

- Access requires the `admin` or `superadmin` role.
- The page is `noindex,nofollow`.
- The interface remains concealed until the shared administrator guard grants access.
- No Member Hub records, private libraries, ratings, notes or submissions are read.
- No Supabase migration is required.

## Protected boundaries

Phase 20 does not modify:

- `index.html`;
- `home.html`;
- `resources/css/intro.css`;
- `js/index-intro.js`;
- `games/games.json`.

## Phase 20A accuracy correction

The live archive uses canonical genre values such as `action-adventure`, `fighting`, `casino` and `role-playing`. The audit accepts those values and their older editor aliases, while the Game Builder now writes the canonical forms. Legacy records without a CCG score are allowed to remain unrated; new Game Builder records still require a score from 1 to 10. Temporary HTTP 429 and 5xx responses are ignored rather than reported as missing files. Same-title checks include release year so intentional versions from different years are not treated as duplicates.

Phase 20A is a separate, reviewed repository correction rather than an ability granted to the live report. It updates the identified source records, runs the full `rebuild-games.js` publishing chain and validates the resulting game, publisher, search, schema and sitemap output before merge. The protected intro stack and Home page remain unchanged.
