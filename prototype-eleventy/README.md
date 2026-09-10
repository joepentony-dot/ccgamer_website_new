# CCG Eleventy Prototype

This directory contains an isolated Eleventy proof-of-concept for the Cheeky Commodore Gamer website.

## Safety boundary

- Production remains on `main` and is not modified by prototype work.
- Prototype work lives only on `codex/eleventy-ccg-prototype`.
- The prototype is intentionally self-contained under `prototype-eleventy/` while architecture is being proven.

## Local commands

```bash
cd prototype-eleventy
npm install
npm run build
npm run serve
```

Eleventy outputs to `prototype-eleventy/_site/`.

## Current milestone

The first milestone establishes a static shared layout, lightweight stylesheet, home page, and valid Games route. Existing CCG data integration comes next.
