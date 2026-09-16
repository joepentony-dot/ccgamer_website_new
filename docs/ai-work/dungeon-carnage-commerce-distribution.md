# Dungeon Carnage commerce and distribution

## Scope

Dungeon Carnage purchase/download distribution, release packaging, desktop/Windows packaging candidates, and any account-service boundary that must remain separate from product delivery. Primary areas include `scripts/`, `desktop/`, `arcade/lost-sizzler/`, supporting workflows/contracts, and historical `services/ccg-backend/` commerce work.

## Verified checkpoint — 2026-09-16

The intended distribution route is **itch.io**. `arcade/lost-sizzler/PROGRESS.md` records itch.io as the purchase/download route and marks the old PayPal-specific checkout/paywall/download plan **SUPERSEDED**. The CCG website remains the branded landing/demo experience. CCG account/community services are not a reason to revive the old custom payment-delivery stack.

This record is reconciled through current Dungeon runtime mainline `c3549e6d45b7748f1efcf5c4f4ba134200325a5f` (#2113 merge). The old provider-neutral packaging/Windows PR stack has now also been retired as an integration vehicle; its useful implementation ideas remain available in Git history for selective current-main re-derivation.

### Superseded custom commerce and browser paywall — CLOSED

The historical PayPal/secure-delivery chain is retired and has been closed without merge:

`#1961` → `#1962` → `#1963` → `#1964` → `#1965` → `#1966` → `#1967` → `#1968` → `#1969` → `#1970` → `#1971` → `#1972` → `#1973` → `#1974` → `#1975` → `#1977` → `#1979` → `#1981`.

The browser paywall/re-download continuation is also closed without merge:

`#1987` → `#1988` → `#1989` → `#1990` → `#1991` → `#1992` → `#1993` → `#1994`.

Do not reopen or rebase these branches merely because their code remains in Git history. If an isolated account/community primitive is ever needed for a non-commerce feature, extract and justify it afresh against current `main`.

### Historical packaging / desktop source material — CLOSED AS INTEGRATION CANDIDATES

The following branches may still contain provider-neutral ideas useful for an itch.io deliverable, but they predate the current Dungeon runtime and are no longer safe integration vehicles. They are closed without merge and retained only as source material:

- #1958 — offline package foundation
- #1982 — verified release handoff
- #1984 — desktop staging
- #1985 — deterministic portable desktop bundle
- #1986 — portable artifact/runtime handoff; extra caution because it was designed around the retired private-delivery/config model
- #1995 — Windows WebView2 wrapper
- #1996 — Windows distributable

Do not revive the PR stack or retarget it onto current `main`. For an itch.io release, define the required current artifact first and then selectively re-derive only still-valid package, provenance, staging or wrapper concepts.

### Separate runtime verification history

#1976 R30 ownership-audit throttle remains a runtime optimisation source candidate only. Its former verification/documentation children #1978 and #1980 are now closed without merge. This chain is not a commerce or itch.io prerequisite.

## Guardrails and next action

The old instruction to preserve and integrate the custom commerce dependency graph is retired. The repository should not regain PayPal checkout, custom entitlement purchase gating, private signed-download routing or the browser paywall as part of the intended release route.

Next safe distribution stage, when resumed: define the minimal itch.io release artifact from current `main`, then inspect only the historical provider-neutral packaging/Windows source material above for ideas that are still necessary. Rebuild required pieces on current `main` in small stages rather than reopening or merging the stale branches.

Before release, perform an end-to-end package check for supported product modes and verify that the CCG website landing/demo experience points to the intended itch.io purchase/download route without coupling product delivery to retired custom commerce.

## Session log

- 2026-09-16: Reconciled the continuation record with the itch.io decision and separated superseded commerce from potentially reusable packaging work.
- 2026-09-16: Closed the superseded PayPal/private-delivery chain #1961–#1975 (excluding unrelated #1976), #1977, #1979 and #1981 without merge.
- 2026-09-16: Closed browser re-download/paywall PRs #1987–#1994 without merge.
- 2026-09-16: Closed stale packaging/desktop PRs #1958, #1982, #1984, #1985, #1986, #1995 and #1996 without merge. Their Git history remains source material for a fresh itch.io/current-main artifact only.
- 2026-09-16: Reconciled the distribution checkpoint after runtime merge #2113; no distribution-route change was introduced by the runtime work.
