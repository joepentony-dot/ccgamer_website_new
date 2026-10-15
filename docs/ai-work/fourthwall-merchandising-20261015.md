# CCG Fourthwall merchandising — 15 October 2026

## Owner request
Expose the established GBP Fourthwall store at https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp on the CCG website, then arrange YouTube Shopping linked-store visibility without risking the site's Omega design, indexability or speed.

## Scope and owner
Single draft PR #2787, branch `feat/fourthwall-merch-20261015`, from main. The intended net patch adds a responsive, lightweight homepage merch panel after the community section and before the unchanged support artwork; its button opens the original Fourthwall store in a separate tab. Checkout, product inventory, payments, printing, delivery and order queries stay with Fourthwall; no embedded cart, live product feed, vendor JavaScript or product imagery on the homepage.

The permanent shared navigation was explicitly left unchanged after the original attempt failed canonical-header normalization. Adding Merch to the sitewide menu in future requires a separate complete, generator-owned, guarded change; do not revive ad hoc header edits.

## Contract corrections
- `scripts/validate-search-home-contract.js` permits only the byte-equivalent approved merch panel and exact deferred stylesheet pair before the existing strict baseline comparison; all index/follow and other home content checks remain in force.
- `service-worker.js` bumps the public-code namespace for the new CSS, using the then-current main cache version +1; recheck main before merge.
- `tests/fourthwall-merch-integration.test.mjs` is executed in the existing CCG Site Safety workflow. Home-only CSS preserves desktop/mobile layout without fixed overlays or extra network work.

## Release protocol
Do not merge on the strength of previous-head checks. Require exact current-branch CI including Phase 4D home baseline, public code cache, Lighthouse, Site Safety, native mouse wheel, and navigation/SEO checks; check branch freshness and code-review notes. The user expressly authorised implementation and guarded merge on 15 October 2026. Compare live deployed `/home.html` and the actual Fourthwall link after deployment before claiming production publication.

## YouTube follow-up
Native YouTube Shopping linkage requires an eligible channel and account-side authorization in Fourthwall/YouTube Studio. This repository alone cannot authorize that connection; do not claim it is linked until verified in the owner's account. Keep direct description/channel merch links as an immediate fallback.
