# Phase 7D CSS and JavaScript Delivery Intake

## Objective

Reduce avoidable parser-blocking JavaScript and remove exact duplicate stylesheet requests without changing CSS order, the Omega presentation, admin input protection, route architecture or game data.

## Bounded correction policy

- add `defer` only to the first-party `/js/analytics.js` loader
- update eligible HTML and generator-owned markup
- remove only byte-identical duplicate stylesheet tags outside protected and third-party files
- retain same-URL stylesheet links when their attributes differ
- do not defer admin input-hardening or firewall scripts
- do not merge stylesheet files or alter CSS cascade order

## Protected files

- `index.html`
- `home.html`
- `resources/css/intro.css`
- `js/index-intro.js`
- `games/games.json`

## Validation plan

- repository-wide before and after static scans
- deterministic authoritative game rebuild
- eight local browser routes
- analytics loader execution and non-blocking attribute checks
- duplicate stylesheet checks
- axe WCAG A/AA and WCAG 2.2 AA checks
- protected hashes and exact changed-file scope
