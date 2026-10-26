# Selective website copyright notice — 26 October 2026

## Ownership and intent

A self-contained, non-modal deterrent for casual image copying across public CCG pages, loaded by the existing `js/analytics.js` public-page bootstrap. The feature uses `js/ccg-copyright-notice.js` and `resources/css/ccg-copyright-notice.css`; none of the protected intro stack, `games/games.json`, canonical game HTML, navigation, emulator source, or generated archives is edited.

The notice reads: “© [current year] Cheeky Commodore Gamer”, with a rights-aware message pointing to `/copyright.html`. It expressly recognises that third-party materials remain with their owners. The notice is dismissible, times out after 4.5 seconds and never traps focus or changes document flow.

## Browser behaviour

Right-click on a public-page `img`, `picture` or deliberately marked `[data-ccg-protected-content]` shows the notice instead of the native context menu. Ordinary text, links, form fields, code, embedded players, canvases, game controls, consent UI and explicit `[data-ccg-allow-contextmenu]` zones are excluded. Unlinked images resist drag-to-desktop, while linked-image dragging remains available. Intro/admin/auth and the /emulator/ and /arcade/ path families do not load the listener.

The browser can still download publicly served assets through its normal network and developer tools. This is not DRM, not a legal declaration of third-party ownership, and not protection from screenshots, direct URLs or inspection.

## Performance and safety

The public-page bootstrap appends the self-hosted stylesheet and async script after DOM readiness. The notice has fixed positioning and is created only on user interaction; it never shifts the document, adds third-party requests, makes repeated layout reads or installs keyboard-shortcut interception. The CSS stays under `resources/css`. Existing analytics/consent and publishing logic are unchanged except for the one small loader call.

## Verification and release requirements

Targeted unit tests: `node --test tests/copyright-notice.test.mjs`. Validate real browser right-click on Home, a canonical game page, an ordinary link and form, and the exemption on emulator/arcade pages. Run applicable Site Safety, SEO/shared-code, performance and browser workflow checks against the exact PR head. Require fresh-main reconciliation and independent review with no unresolved significant findings before guarded squash merge. Do not claim live deployment until checked.
