# Stage 4 Validation Report — Game Page Micro-Audit + Performance Pass

Date: 2026-02-17
Target: https://www.cheekycommodoregamer.co.uk/
Representative pages tested:
- https://www.cheekycommodoregamer.co.uk/games/1942/
- https://www.cheekycommodoregamer.co.uk/games/agony/
- https://www.cheekycommodoregamer.co.uk/games/airborne-ranger/
- https://www.cheekycommodoregamer.co.uk/home.html (performance baseline)

## 1) Console Integrity
**Status: FAIL**
- All 3 game pages produced runtime console errors:
  - `[CCG FAVOURITES] Unable to resolve user AuthSessionMissingError: Auth session missing!`
- Additional warnings observed on one run:
  - `Automatic fallback to software WebGL has been deprecated`
  - `Deprecated API for given entry type.`

## 2) Hero Section
**Status: FAIL**
Per-page summary:
- 1942: title present; "Click to enlarge" affordance not found.
- Agony: title present; "Click to enlarge" affordance not found.
- Airborne Ranger: title present; "Click to enlarge" affordance not found.
- Favourites button with expected aria-label not detected on tested pages.

## 3) Screenshots & Modal
**Status: FAIL**
- Lazy loading appears active (`13/13` images with `loading="lazy"` on tested pages).
- Modal behaviour test (1942 page) did **not** detect modal opening from screenshot click.
- Since modal did not open in the scripted test, ESC/outside/arrow/swipe checks could not be fully validated.

## 4) Content Panels
**Status: PASS (partial/heuristic)**
- Description text blocks detected (`main p` present).
- Credits/facts/verdict conditional visibility not fully asserted semantically (only presence checks available from this pass).

## 5) Related Games
**Status: FAIL**
- Neither expected label detected on tested pages:
  - `More from this publisher`
  - `Similar games you might enjoy`
- Canonical link validation could not be conclusively asserted for dedicated related-game sections in this pass.

## 6) Accessibility
**Status: FAIL**
Observed on tested pages:
- Share button aria-label: present.
- Related carousel nav aria-labels: present.
- Modal close aria-label: present.
- Favourites button aria-label: **not detected**.
- Keyboard focusability broad sweep not fully automated in this run.

## 7) Mobile Behaviour (~375px)
**Status: PASS (limited)**
- On tested page (Agony), no horizontal overflow detected at 375x812.
- Tap-target sizing was not automatically measured pixel-by-pixel.
- Modal touch behaviour could not be validated because modal open was not reproduced in automation.

## 8) Navigation & Exit Paths
**Status: FAIL**
- Back-to-home link/button was **not detected** by the selectors used on tested pages.
- Header did not expose email strings in tested pages (display identity appears non-email).
- Share-to-clipboard canonical URL checks were not conclusive in this run.

## 9) Performance Guardrails (single-run snapshot)
**Status: WARNING (no historical baseline in this run)**

| Page | LCP (ms) | CLS | INP (ms) | TBT (ms) | Assessment |
|---|---:|---:|---:|---:|---|
| /home.html | 1524 | 0.0000 | 1120 | 0 | LCP/TBT stable in snapshot; INP high |
| /games/1942/ | 0* | 1.0523 | 912 | 0 | CLS poor; LCP observer returned 0 |
| /games/agony/ | 0* | 1.0375 | 912 | 0 | CLS poor; LCP observer returned 0 |
| /games/airborne-ranger/ | 0* | 1.0406 | 1440 | 0 | CLS poor; INP high; LCP observer returned 0 |

`*` LCP value of `0` indicates observer capture did not return a valid value in this automation environment for those routes.

---

## Items requiring developer attention
1. Resolve favourites/auth console error on game pages (`AuthSessionMissingError`).
2. Restore/verify hero "Click to enlarge" affordance.
3. Verify screenshot click-to-modal wiring and close/navigation handlers.
4. Confirm related-games heading copy logic and rendering of expected labels.
5. Ensure favourites control has clear accessible labelling (`aria-label`).
6. Ensure explicit back-to-home path is available and discoverable.
7. Investigate high CLS/INP on game routes and validate via full Lighthouse runs.

## Confidence Summary
- **Safe to merge:** No.
- **Minor issues:** Automation environment limitations around full modal and clipboard-share validation.
- **Major regressions:** Console auth error, missing hero affordance, undetected related-copy expectations, missing favourites aria, high CLS snapshot on game pages.
