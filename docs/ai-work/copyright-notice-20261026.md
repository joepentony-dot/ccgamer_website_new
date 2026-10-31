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

## 31 October 2026 — linked artwork and fresh-main reconciliation

- Source-executed negative control reproduced native context-menu suppression on linked images; corrected the interactive selector on the existing PR branch. The new regression tests linked artwork and protected linked content while preserving unlinked-image notice and unlinked drag protection.
- Safely reconcile the existing branch with main a0f1d9271bcf5b151ed4a432d71a263ccf28bb9e using a non-forced two-parent merge commit whose tree is based on current main, retaining all incoming code, site assets and newer consent/analytics behaviour. Public code cache increments v206 to v207; the main Site Safety workflow now executes the focused regression. No unrelated generated game data or intro changes.
- Qualification must be established on the exact reconciled head: targeted Node, full applicable CI, browser interaction, performance and fresh-main gates. This record does not authorise an unqualified merge or assert live deployment. Owner's waiver of optional Codex review does not waive native protection or CI.
