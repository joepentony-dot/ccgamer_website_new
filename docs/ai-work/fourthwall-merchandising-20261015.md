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

## 15 October 2026 — reported inactive merch-panel links, focused follow-up
- Site owner reports homepage merchandise hyperlink access not working. Source audit found the previous homepage panel's title, brand and description were non-clickable; only the small EXPLORE MERCH control was an anchor. Existing revenue-click analytics observes but does not prevent default navigation. The direct store URL was supplied by owner; the external Fourthwall storefront could not be reliably fetched from inspection tools, so checkout/product-link functionality there is NOT independently confirmed.
- Narrow fix branch `fix/fourthwall-clickable-home-panel-20261015` from refreshed main: retain semantic section, wrap the entire visual panel content in one accessible external anchor with keyboard focus and hover treatment; no nested anchors, scripts, extra shopping embeds, logo changes or global navigation changes. Keep destination `https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp` unchanged.
- Maintain the strict homepage search/SEO guard by matching **both** prior baseline panel and new current panel byte-equivalently, disallowing arbitrary content. Add full-card anchor/focus regression to existing Site Safety test and increment public code cache v146 → v147 (recheck current main before merge).
- The change remains unmerged until exact-head CI and guarded latest-main comparison; normal GitHub Pages post-merge deployment and live end-to-end destination confirmation must follow. YouTube Shopping remains postponed per owner instruction.


## Mobile navigation discoverability — 15 October 2026
- Owner could not see the merch link on mobile. Root cause: the previous PRs put the shop only in a homepage feature **below** featured content; the canonical mobile navigation drawer did not include merchandise at all.
- Single-scope repair `fix/fourthwall-mobile-drawer-link-20261015`: append one Fourthwall `Merch Shop` link at the start of the existing **Menu → Explore more** drawer section in `js/ccg-global.js`. It has standard anchor behaviour, opens the existing GBP shop in a new tab, and is rebuilt idempotently with each drawer rendering. Style only this drawer link in `resources/css/ccg-nav.css` with a 44px tap target and visible focus. No changes to canonical public header, first-paint nav lists, homepage hero or intro.
- Extend the existing Fourthwall integration regression test already run by Site Safety, and advance the public-code cache namespace v147 → v148 (reconfirm current main before merge).
- User-facing expectation: on mobile, tap **Menu**, then **Merch Shop** is the **first option** in **Explore more**. Existing full-card homepage link remains as secondary discovery.
- Guarded merge requires exact-head CI with site safety, navigation, PWA, cache and Lighthouse and latest-main freshness; website publishing/real mobile menu click verification follows. YouTube Shopping remains deferred.
