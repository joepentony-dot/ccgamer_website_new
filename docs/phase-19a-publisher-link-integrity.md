# Phase 19A — Publisher Link Integrity

## Purpose

Prevent publisher-history panels from linking visitors to missing, empty or malformed publisher routes.

## Permanent rule

**Never link to a publisher without a populated archive record.**

A historical relationship becomes clickable only when `games/publishers/publishers.json` contains a matching publisher slug with:

- at least one archived game;
- the expected `/games/publishers/<slug>/` route;
- a valid generated publisher metadata record.

The publisher-history data remains editorial context. It does not create archive routes and it does not imply that every associated label has games on CCG.

## Visitor presentation

Publisher relationships are divided into two groups:

- **Related CCG archives** — clickable links confirmed by generated publisher metadata.
- **Associated labels** — historical names shown as plain text when no populated CCG archive exists.

If publisher metadata cannot be loaded, the safe fallback is to render every historical relationship as plain text. The interface therefore fails closed and never guesses a publisher URL.

## Hit-Pak example

Elite's historical relationship with Hit-Pak remains visible, but Hit-Pak is not clickable while no matching populated publisher record exists. If games are later credited to Hit-Pak and the publisher generator creates its metadata record, the relationship will become clickable automatically.

## Missing-route protection

The GitHub Pages `404.html` fallback now redirects only a direct single game slug such as `/games/example-game/`.

Nested archive paths such as these are never converted into fake game slugs:

- `/games/publishers/...`
- `/games/developers/...`
- `/games/genres/...`
- `/games/collections/...`
- `/games/platforms/...`
- `/games/years/...`

Missing archive routes display normal recovery links to Home, Browse Games and Browse Publishers.

## Automated protection

The Phase 19A workflow verifies:

- publisher metadata contains populated, canonical archive records;
- source-backed publisher profiles correspond to populated archives;
- related links are controlled by metadata rather than constructed from history data;
- unresolved historical labels are rendered without anchors;
- the 404 fallback rejects nested archive routes;
- protected intro-loader files and `games/games.json` remain unchanged.

## Scope

This phase does not:

- add or remove publisher credits;
- edit `games/games.json`;
- create empty publisher pages;
- change existing populated publisher routes;
- alter the intro loader, Home page or Member Hub.
