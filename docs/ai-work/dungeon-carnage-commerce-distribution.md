# Dungeon Carnage commerce and distribution

## Scope

Dungeon Carnage purchase/download distribution, release packaging, desktop/Windows packaging candidates, and any account-service boundary that must remain separate from product delivery. Primary areas include `scripts/`, `desktop/`, `arcade/lost-sizzler/`, supporting workflows/contracts, and historical `services/ccg-backend/` commerce work.

## Verified checkpoint — 2026-09-16

Current `main` is authoritative here. `arcade/lost-sizzler/PROGRESS.md` records **itch.io as the intended purchase/download route** and explicitly marks the old PayPal-specific checkout/paywall/download plan **SUPERSEDED**. The CCG website remains the branded landing/demo experience. CCG account/community services are not a reason to revive the old custom payment-delivery stack.

The many old draft PRs in this area are therefore not one pending integration graph anymore. They must be separated into superseded commerce work versus potentially reusable provider-neutral packaging work.

### Superseded custom commerce and browser paywall

The historical PayPal/secure-delivery chain is not an active release path:

`#1961` PayPal Orders gateway → `#1962` HTTP boundary → `#1963` entitlement persistence → `#1964` capture entitlement → `#1965` refund reconciliation → `#1966` webhook verification → `#1967` webhook HTTP route → `#1968` router composition → `#1969` app composition → `#1970` runtime config → `#1971` runtime adapters → `#1972` browser purchase client → `#1973` secure-download boundary → `#1974` secure-download composition → `#1975` private package delivery → `#1977` package-delivery runtime config → `#1979` package artifact descriptor → `#1981` descriptor/runtime handoff.

The browser paywall continuation `#1987` → `#1988` → `#1989` → `#1990` → `#1991` → `#1992` → `#1993` → `#1994` is likewise superseded as a purchase/download route.

Do **not** rebase, merge, or continue these chains merely because their PRs remain open. If an isolated account/community primitive is ever needed for a non-commerce feature, extract and re-justify that primitive against current main rather than reviving the payment stack.

### Potentially reusable packaging / desktop work

The following work may still contain provider-neutral pieces useful for an itch.io deliverable, but all of it is old and must be reconciled against current main before reuse:

- #1958 — offline package foundation.
- #1982 — release handoff built on #1958.
- #1984 — desktop staging.
- #1985 — portable desktop bundle.
- #1995 — Windows WebView2 wrapper.
- #1996 — Windows distributable.

#1986 (portable artifact/runtime handoff) needs extra scrutiny because its runtime handoff was designed around the old private-delivery/config model; do not assume it belongs in the itch.io path.

### Verification side chain

`#1976` R30 ownership-audit throttle → `#1978` Solo long-session repeatability → `#1980` stability-evidence documentation remains a separate stale validation chain. It is not a commerce prerequisite. Any useful R30 optimisation should be re-derived and qualified against current main independently.

## Guardrails and next action

The old instruction to preserve and integrate the entire 36-PR commerce dependency graph is superseded by the release decision already recorded on `main`.

Next safe distribution action: define the minimal itch.io release artifact from current `main`, then inspect only the provider-neutral packaging/Windows PRs for reusable pieces. Rebuild those pieces on current main in small stages as needed. Do not carry forward PayPal checkout, custom entitlement purchase gating, private signed-download routing, or browser paywall assumptions.

Before release, perform an end-to-end package check for the supported product modes and verify that the CCG website landing/demo experience points to the intended itch.io purchase/download route without coupling product delivery to retired custom commerce.

## Session log

- 2026-09-16: Reconciled the continuation record with the merged #2100 Dungeon work register. Marked the PayPal/secure-download/paywall chain superseded and retained only provider-neutral packaging/desktop work as possible reusable source material. No commerce or release code changed.
- 2026-09-16: Initial checkpoint created from the live GitHub PR graph. No commerce, release, or desktop files changed.
