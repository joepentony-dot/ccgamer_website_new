# Dungeon Carnage commerce and distribution

## Scope

The account-gated commerce backend, PayPal integration, entitlement and download flow, package/release handoff, browser paywall, and Windows portable distribution for Dungeon Carnage. Primary areas are `services/ccg-backend/`, `scripts/`, `desktop/`, `arcade/lost-sizzler/`, and their workflow/contracts.

## Verified checkpoint — 2026-09-16

There are 36 open draft PRs in this workstream. They are a dependency graph, not 36 independently mergeable changes. Preserve their bases until the owner explicitly collapses or rebases the stack.

### Commerce and secure delivery chain

`#1961` PayPal Orders gateway (base `main`) → `#1962` HTTP boundary → `#1963` entitlement persistence → `#1964` capture entitlement → `#1965` refund reconciliation → `#1966` webhook verification → `#1967` webhook HTTP route → `#1968` router composition → `#1969` app composition → `#1970` runtime config → `#1971` runtime adapters → `#1972` browser purchase client → `#1973` secure-download boundary → `#1974` secure-download composition → `#1975` private package delivery → `#1977` package-delivery runtime config → `#1979` package artifact descriptor → `#1981` descriptor/runtime handoff.

The paywall continuation branches from `#1973`: `#1987` re-download client → `#1988` controller → `#1989` view → `#1990` bootstrap → `#1991` entry → `#1992` loader → `#1993` page mount → `#1994` public mount.

### Offline and desktop delivery chain

`#1958` offline package foundation (base `main`) → `#1982` release handoff → `#1984` desktop staging → `#1985` portable desktop bundle → `#1986` portable artifact/runtime handoff. `#1995` Windows WebView2 wrapper branches from #1985, and `#1996` Windows distributable branches from #1995.

### Verification side chain

`#1976` R30 ownership-audit throttle (base `main`) → `#1978` Solo long-session repeatability → `#1980` stability-evidence documentation. This chain is related validation, not a proven prerequisite of the commerce stack.

## Guardrails and next action

All 36 PRs were draft during the audit. Several main-based roots were already far behind current `main` (for example #1976 was 127 commits behind; older roots vary further). Before changing the stack, map the precise PR ancestry and test each segment at its intended base. Do not merge an interior PR without resolving whether its parent and child contract expectations are still valid.

Next safe action: obtain/record the intended integration order from the owner, then rebase or consolidate one root-to-leaf slice at a time with its contract workflow. Avoid broad rebases across the entire stack.

## Session log

- 2026-09-16: Initial checkpoint created from the live GitHub PR graph. No commerce, release, or desktop files changed.
