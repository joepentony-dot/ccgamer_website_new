# Dungeon Carnage commerce and distribution

## Scope

Dungeon Carnage purchase/download distribution, release packaging, desktop/Windows packaging candidates, and any account-service boundary that must remain separate from product delivery. Primary areas include `scripts/`, `desktop/`, `arcade/lost-sizzler/`, supporting workflows/contracts, and historical `services/ccg-backend/` commerce work.

## Verified checkpoint — 2026-09-16

Current `main` is `5112035f0d1f3c80fdb4fa2c6c83ff0228778600`.

`arcade/lost-sizzler/PROGRESS.md` records **itch.io as the intended purchase/download route** and marks the old PayPal-specific checkout/paywall/download plan **SUPERSEDED**. The CCG website remains the branded landing/demo experience. CCG account/community services are not a reason to revive the old custom payment-delivery stack.

The active PR queue has now been reconciled to that product decision instead of leaving the old commerce graph open indefinitely.

### Superseded custom commerce and browser paywall — CLOSED

The historical PayPal/secure-delivery chain is retired and has been closed without merge:

`#1961` → `#1962` → `#1963` → `#1964` → `#1965` → `#1966` → `#1967` → `#1968` → `#1969` → `#1970` → `#1971` → `#1972` → `#1973` → `#1974` → `#1975` → `#1977` → `#1979` → `#1981`.

The browser paywall/re-download continuation is also closed without merge:

`#1987` → `#1988` → `#1989` → `#1990` → `#1991` → `#1992` → `#1993` → `#1994`.

Do not reopen or rebase these branches merely because their code remains in Git history. If an isolated account/community primitive is ever needed for a non-commerce feature, extract and justify it afresh against current `main`.

### Potentially reusable packaging / desktop work — KEEP AS SOURCE MATERIAL

The following open work may still contain provider-neutral pieces useful for an itch.io deliverable, but all of it predates substantial runtime/release changes and must be reconciled against current `main` before reuse:

- #1958 — offline package foundation
- #1982 — verified release handoff
- #1984 — desktop staging
- #1985 — deterministic portable desktop bundle
- #1995 — Windows WebView2 wrapper
- #1996 — Windows distributable

#1986 (portable artifact/runtime handoff) remains open but needs extra scrutiny because its runtime handoff was designed around the retired private-delivery/config model. Do not assume it belongs in the itch.io path.

### Separate stale verification chain

`#1976` R30 ownership-audit throttle → `#1978` Solo long-session repeatability → `#1980` stability-evidence documentation remains separate runtime validation history. It is not a commerce or itch.io prerequisite. Any useful R30 optimisation should be re-derived and qualified against current `main` independently.

## Guardrails and next action

The old instruction to preserve and integrate the custom commerce dependency graph is retired. The repository should not regain PayPal checkout, custom entitlement purchase gating, private signed-download routing or the browser paywall as part of the intended release route.

Next safe distribution stage, when resumed: define the minimal itch.io release artifact from current `main`, then inspect only the provider-neutral packaging/Windows candidates above for reusable pieces. Rebuild required pieces on current `main` in small stages rather than merging the stale branches wholesale.

Before release, perform an end-to-end package check for supported product modes and verify that the CCG website landing/demo experience points to the intended itch.io purchase/download route without coupling product delivery to retired custom commerce.

## Session log

- 2026-09-16: Reconciled the continuation record with the itch.io decision and separated superseded commerce from potentially reusable packaging work.
- 2026-09-16: Closed the superseded PayPal/private-delivery chain #1961–#1975 (excluding unrelated #1976), #1977, #1979 and #1981 without merge.
- 2026-09-16: Closed browser re-download/paywall PRs #1987–#1994 without merge. Provider-neutral packaging/Windows candidates remain open for later current-main reconciliation.
