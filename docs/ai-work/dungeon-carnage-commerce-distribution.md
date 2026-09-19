# Dungeon Carnage commerce and distribution

## Scope

Dungeon Carnage purchase/download distribution, release packaging, desktop/Windows packaging candidates, and any account-service boundary that must remain separate from product delivery. Primary areas include `scripts/`, `desktop/`, `arcade/lost-sizzler/`, supporting workflows/contracts, and historical `services/ccg-backend/` commerce work.

## Verified checkpoint — 2026-09-18

The intended distribution route is **itch.io**. `arcade/lost-sizzler/PROGRESS.md` records itch.io as the purchase/download route and marks the old PayPal-specific checkout/paywall/download plan **SUPERSEDED**. The CCG website remains the branded landing/demo experience. CCG account/community services are not a reason to revive the old custom payment-delivery stack.

This record is reconciled through current Dungeon runtime `main` `4319ff84ea8bca41559347915d0ab5d2c1a0e873` (#2182 stale-build badge authority), following #2180's additional startup-loader ownership correction. The old provider-neutral packaging/Windows PR stack remains retired as an integration vehicle; only bounded ideas such as deterministic staging, integrity manifests and non-overwrite verification were re-derived for a fresh current-main itch.io artifact.

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

Stage 8 is repository-complete through merged #2141. Exact qualified head `e5d4333d4e8dc2912b2ffc9c5abc13f79d4b4a2d` merged as `53cba902af9dbf1e118f3f274836120f6c30bb40`. The fresh standalone HTML5 artifact contains the canonical game runtime plus package-specific website-service compatibility, a SHA-256 release manifest, and Chromium-smoked Solo, Tutorial and local 2P Split Screen. Weekly Vault remains website-origin functionality and the packaged Weekly control hands back to the canonical CCG website.

The original Stage 8 exact head passed the dedicated itch.io package workflow plus the retained Dungeon qualification set. Later qualified Dungeon runtime/startup corrections #2145, #2153, #2164, #2180 and #2182 changed the canonical runtime, so earlier package artifacts are historical rather than the publication candidate. The current qualified runtime publication candidate is `C64-Dungeon-Carnage-Itch`, artifact ID `10566350206`, 21,111,022 bytes, GitHub Actions SHA-256 `147782cb38cab392817b1bd4670f670ca0bcc2d51264839378d50bf229237be6`, from workflow run `35390021405` on exact head `dfce128672fd90c8edf7900b3bac3a14095e58fe`. Documentation-only PRs may trigger the package workflow and produce newer ZIP IDs solely because Dungeon documentation sits under the watched path; those artifacts do not supersede this pinned runtime candidate unless a Dungeon runtime or package input changes.

The package excludes the site Supabase bootstrap/config, secrets, retired PayPal checkout, custom entitlement/private-download implementation and stale desktop/Windows stack. The canonical website source remains unchanged.

Public itch.io page creation, artifact upload/publication, browser launch verification and the final public URL remain external release actions. Do not invent an itch.io URL in source. The merged #2182 production smoke is now verified green against deployed current `main` `66c2aa8441fc67961e1b3fa116da6537ea41002b` (run `35397906108`). Do not publish until the current startup, sustained-Solo and Banishment-Flask hands-on gates pass.

## Session log

- 2026-09-16: Reconciled the continuation record with the itch.io decision and separated superseded commerce from potentially reusable packaging work.
- 2026-09-16: Closed the superseded PayPal/private-delivery chain #1961–#1975 (excluding unrelated #1976), #1977, #1979 and #1981 without merge.
- 2026-09-16: Closed browser re-download/paywall PRs #1987–#1994 without merge.
- 2026-09-16: Closed stale packaging/desktop PRs #1958, #1982, #1984, #1985, #1986, #1995 and #1996 without merge. Their Git history remains source material for a fresh itch.io/current-main artifact only.
- 2026-09-16: Reconciled the distribution checkpoint after runtime merge #2113; no distribution-route change was introduced by the runtime work.

- 2026-09-18: Stage 7 merged as `f4fecd858fab8d43cd9d6732ab56495cfb313116`. Began fresh Stage 8 itch.io HTML5 packaging from that exact main; re-derived deterministic staging/integrity concepts only, kept website account services outside the artifact, and did not revive the retired commerce/desktop graph.\n- 2026-09-18: Stage 8 #2141 qualified at `e5d4333d4e8dc2912b2ffc9c5abc13f79d4b4a2d` and merged as `53cba902af9dbf1e118f3f274836120f6c30bb40`. Repository release artifact is ready; public itch.io publication remains external.


- 2026-09-18: Later startup fixes #2145, #2153 and #2164 superseded the Stage 8 package as the final publication candidate. Package workflow run `35380506012` produced current qualified artifact `10561459333` / SHA-256 `f8a2142824b41b85d29006cf72d52c511b2bce9e879178ad9d45f4700a38c464`. External publication remains blocked on deployed hands-on acceptance.

- 2026-09-18: #2180 and #2182 introduced later qualified runtime changes, superseding the previous package candidate. Workflow run `35390021405` produced artifact `10566350206` / SHA-256 `147782cb38cab392817b1bd4670f670ca0bcc2d51264839378d50bf229237be6` from exact #2182 head `dfce128672fd90c8edf7900b3bac3a14095e58fe`. Public itch.io publication remains blocked on live production smoke plus hands-on acceptance.

- 2026-09-18: Production smoke run `35397906108` passed on deployed current main `66c2aa8441fc67961e1b3fa116da6537ea41002b`, verifying live `V10.42 r34 / 20260918r34`, `version.json`, stale-browser update prompting, feedback validation and Weekly Vault read/backend projection. Deployment, live navigation and push Load Safety also passed. External publication is now blocked only by the documented hands-on acceptance gates.
