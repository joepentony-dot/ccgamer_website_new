# Phase 7B Accessibility Foundations

## Verdict

**PASS — the focused accessibility foundation corrections are ready for review.**

Phase 7B changes semantic markup and keyboard behaviour only. It does not redesign the Omega presentation, alter game records, replace artwork or touch the intro-loader stack.

## Improvements

| Finding | Phase 7A | Phase 7B |
|---|---:|---:|
| Form controls without a detectable label | 8 | 0 |
| Images without an alt attribute | 1 | 0 |
| Iframes without a title | 1 | 0 |
| Documents without a language | 1 | 0 |
| Pages with multiple H1 headings | 2 | 0 |
| Duplicate ID occurrences | 3 | 1 |
| Pages without an H1 | 2 | 1 |

## Shared keyboard bypass

`js/ccg-nav.js` now creates one **Skip to main content** link on CCG pages that load the shared navigation layer. The link:

- is the first element in the document body
- is hidden until keyboard focus reaches it
- targets the existing main landmark or assigns a stable main-content ID
- moves keyboard focus to the main landmark after activation
- respects reduced-motion preferences

Representative local routes passed browser checks for skip-link presence, visible focus state, valid target, focus transfer and axe serious/critical violations.

## Focused semantic corrections

- Added accessible names to all eight controls identified in Phase 7A.
- Added alternative text to the announcement thumbnail preview.
- Added the missing screenshot-viewer iframe title.
- Added `lang="en"` to the Pac-Man Easter-egg document.
- Removed duplicate `top` IDs from the two emulation pages.
- Reduced both collection pages to one H1 each.
- Added a semantic main landmark, H1 and static skip link to the legacy quiz page.
- Treated `<select>` as an editable admin target so printable key presses do not leak into global admin shortcuts.

## Validation

- Checks passed: **21 / 21**
- Browser routes passed: **8 / 8**
- Serious or critical axe nodes: **0**
- Protected files changed: **No**

## Deliberate exceptions

`index_temp.html` remains the only duplicate-ID and missing-H1 exception. It is a retired intro prototype and was left untouched to avoid changing intro behaviour.

The Phase 7A static skip-link number remains a literal-markup metric. Shared CCG routes now receive the link at runtime and are verified in a browser. Third-party Lemon cache documents are not rewritten as owned CCG templates.

## Safety

- `index.html` unchanged
- `home.html` unchanged
- `resources/css/intro.css` unchanged
- `js/index-intro.js` unchanged
- `games/games.json` unchanged
- no game page, route, thumbnail or catalogue record renamed or removed
