# C64 Dungeon Carnage — Current Project State

> Legacy repository path: `arcade/lost-sizzler/`. The game has been renamed C64 Dungeon Carnage; historical workflow, route and schema names may still use “Lost Sizzler”.

## Current Baseline

- Public browser release remains the static, zero-server GitHub Pages build.
- Current game version: V10.42.
- Current `main` checkpoint at this review: `e1503dfff969e2925881d0cc3496fd733060deaa`.
- The protected website intro-loader stack and `games/games.json` remain outside the active Dungeon Carnage work.
- No active Dungeon Carnage release work is authorised to mutate Supabase/database/storage data or enable live checkout.

## Stability / Progression

The promoted V10.42 stability baseline remains protected. Subsequent isolated candidates are intentionally not merged without explicit approval for the exact PR.

- PR #1959 — Spy sustained-session damage-depth regression correction. The test now enforces the intended invariant: one Spy damage owner, non-empty re-entry ancestry, no growth beyond the original baseline, and stable ancestry during each active Spy session.
- PR #1960 — XP-source boundary, exact prepared commit `6c48365bad4aacbef518868f842f4a7a447d3b0b`.
- Locked XP rule: progression XP comes from enemy kills and XP pickups/rewards only; secret/bronze doors, switches and ordinary chests do not award progression XP.
- PR #1976 — R30 healthy-ownership deep-audit throttle while preserving bounded recovery checks.
- PR #1978 — independent long-session Solo repeatability verification.
- PR #1980 — stabilization evidence record only; it does not alter runtime behaviour.

Do not weaken these browser contracts or reintroduce XP awards on environmental interactions to obtain a green result.

## Startup Overlay / Loading Identity

The current `main` still contains the older V10.36 startup loader path that can create `#ccg-release-loading` with retired Cheeky Commodore Quest / Lost Sizzler branding before later V10.42 layers take over.

- PR #1983 is the isolated startup-overlay correction.
- Frozen head: `f20f180899c61310a0d1942ef8b2ce2af35981ae`.
- Lost Sizzler Load Safety #1849 passed on that exact head.
- The correction installs the current C64 Dungeon Carnage branding guard from the first static cache-guard script and preserves the existing bounded loader, release gate, cache sanitation and zero-server readiness hold.
- PR #1983 remains unmerged, so production should still be treated as susceptible to the old-to-new branding flash until that exact PR is explicitly approved and merged.
- The current public document itself renders the correct C64 Dungeon Carnage / CHEEKY COMMODORE GAMER V10.42 identity; the outstanding concern is the transient legacy loader race rather than the static first paint.

Do not modify the frozen #1983 candidate without new reproducible evidence.

## Browser Commerce — Dormant / Disabled

The browser purchase stack has been built as isolated, fail-closed layers and remains disabled unless explicit production configuration is supplied.

- #1961–#1975 establish the server-side PayPal, account-entitlement, refund/reversal, secure-download and private-delivery boundaries.
- #1977/#1979/#1981 establish fail-closed package-delivery runtime metadata and descriptor handoff.
- #1987–#1994 establish the browser purchase/re-download/paywall stack and a dormant public-page mount.
- #1994 mounts only the disabled page entry. With no explicit commerce configuration it returns before document/fetch/paywall work.
- #1997 adds an injected PayPal Buttons renderer. Its exact head `495db9cad8ebc0087983088d10007218629a9731` passed its dedicated renderer contract and CCG Site Safety. It does not load the PayPal SDK, provide credentials, enable checkout or mount itself into the live page.
- #1999 adds a validated PayPal JavaScript SDK loader on top of #1997. Exact head `e67857ca7b9547de8d4409d5e50edfaf3b392b65` passed C64 Dungeon Carnage PayPal SDK Loader Contract #1 and CCG Site Safety #3625. It performs no provider request until explicit `load()`, remains unmounted from the public game page and does not enable checkout.
- #2000 composes the green SDK loader with the injected Buttons renderer behind one dormant provider adapter. Exact head `d6f2f707b02b77a4eccd2ba376f52319ebb14985` passed C64 Dungeon Carnage PayPal Checkout Adapter Contract #1 and CCG Site Safety #3626. Construction performs no PayPal SDK request; loading begins only after an explicit checkout request.
- #2001 composes #2000 with the existing disabled-by-default paywall entry without changing the public game page or defining production commerce configuration. Exact head `51287e29b069a92417f1be377c30b93c13c3570f` passed C64 Dungeon Carnage PayPal Paywall Composition Contract #2 and CCG Site Safety #3628. Disabled commerce exits before document/fetch/provider access; checkout-disabled mode does not construct the PayPal adapter; checkout-enabled composition requires an explicit provider mount and refuses competing provider callbacks.

The browser commercial chain is therefore prepared through provider/paywall composition while remaining fully dormant. Production PayPal public client configuration, provider mount selection, backend deployment, sandbox/end-to-end purchase validation and checkout activation remain explicit approval/deployment boundaries.

## Offline / Windows Edition

The offline path now has a native Windows implementation while retaining the verified package/provenance boundaries.

- #1958 — offline package foundation.
- #1982 — verified release handoff with Tier-A user data excluded.
- #1984 — framework-neutral desktop staging.
- #1985 — deterministic portable desktop ZIP.
- #1995 — .NET 8 WinForms/WebView2 native shell. Stable LocalApplicationData profile, local virtual HTTPS host, remote renderer network blocking, disabled renderer downloads, allowlisted external navigation, no unrestricted filesystem/process host bridge, and staged-path reparse protection.
- #1996 — self-contained Win-x64 offline distributable built from the verified staging tree.

### #1996 exact-head evidence

Frozen head: `2008eda8d15bdde315713930e19c9125b4e61c94`

Passed:

- CCG Site Safety #3624.
- C64 Dungeon Carnage Desktop Staging Contract #8.
- Lost Sizzler Release Handoff #329.
- C64 Dungeon Carnage Windows WebView2 Wrapper Contract #10.
- C64 Dungeon Carnage Windows Distributable Contract #7.
- Lost Sizzler Load Safety #1864, run `34718025267`: **SUCCESS, 106/106 jobs green**.

The end-to-end Windows CI materialized and cryptographically verified a 303-file, 24,373,960-byte application package, assembled the release handoff/staging tree, published the self-contained Win-x64 launcher, and built the customer ZIP twice. Both ZIP builds were byte-identical with SHA-256:

`781b14c2a10ca4a0d59f8a7dfb275f27f3e9e29c89bc8524611a6332cee40425`

The CI ZIP is verification output only; it is not uploaded or published. No code change was required after the final six Load Safety jobs completed; the #1996 candidate remains frozen.

### Package-boundary correction

During #1996 integration, the older #1984 staging layer was found to require `online-services-gate.js`, but that file belongs to an older containment branch and is not present in the current verified #1958 package manifest. The Windows path was corrected to match the actual verified package instead of silently adding an unverified runtime file:

- desktop staging now records `injectBefore: null`;
- the staging/wrapper/distributable regressions forbid fabricating the absent gate;
- offline enforcement remains owned by the native WebView2 wrapper, which blocks remote renderer requests.

## Current Safety Boundaries

Active draft work must continue to preserve all of the following:

- no changes to `index.html`, `resources/css/intro.css`, or `js/index-intro.js` unless separately and explicitly authorised;
- no changes to `games/games.json` as part of Dungeon Carnage release work;
- no Supabase/database/storage mutation or migration;
- no production credentials committed to the repository;
- no permanent/public package URL;
- no live checkout activation;
- no Dungeon Carnage PR merge without explicit user authorisation for that exact PR;
- no change to the locked XP-source rule.

## Remaining Completion Boundaries

Code preparation has reached genuine approval, deployment and physical/manual-test boundaries rather than an identified gameplay/stability blocker:

1. Obtain explicit merge approval for each required Dungeon Carnage PR/stack; do not merge implicitly. The frozen #1996 Windows candidate, #1983 overlay correction and green dormant commerce stack through #2001 remain unmerged.
2. If the paid Windows edition is to go live, select/configure the private production object store and signing adapter, build the approved final artifact, sign it if desired, upload it privately, and bind its immutable SHA-256/byte-size/object-key metadata to the secure-download runtime.
3. Configure/deploy the production commerce backend and approved PayPal public SDK/client boundary, then explicitly enable checkout only after sandbox/end-to-end purchase, entitlement, refund/reversal and re-download tests pass.
4. Perform a real Windows launch/play test of the approved package on supported Windows hardware, including offline launch, save/profile persistence, restart, external-link handling and blocked-network behaviour.
5. After explicit approval of #1983, verify desktop and mobile startup/loading transitions against the deployed page to confirm no retired overlay identity becomes visible.

Until those approval/deployment steps are performed, browser gameplay remains the current production path and all commercial/offline work remains draft/non-production.