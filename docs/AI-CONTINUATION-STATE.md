## CI qualification optimisation — 25 September 2026

- PR #2339 / `codex/ci-qualification-optimisation` is the active CI-policy candidate, based on current main `def0feab8ea92bfd271dd31d5d99b270af522239` before the review-repair commits.
- The fast PR path remains for non-runtime Dungeon assets, copy, documentation and CSS-only work, while every `arcade/lost-sizzler/js/**` runtime JavaScript change now defaults to the complete six-shard Chromium qualification. This removes filename-based risk-classification gaps for newly named/versioned gameplay modules.
- Native Mouse Wheel Scroll Contract PR triggers include both `resources/js/**` and `quiz/js/**` as audited-page JavaScript dependency trees, in addition to the existing shared paths.
- Full qualification still runs on relevant pushes to `main`; the itch.io PR job keeps deterministic package verification while the duplicate packaged Chromium smoke remains reserved for main/manual qualification.
- The current review-repair head must complete a fresh exact-head workflow matrix and a fresh Codex review before merge. Do not merge #2339 over a red/incomplete check or unresolved material P1/P2 review finding.
- Detailed record: [ci-qualification-strategy.md](ai-work/ci-qualification-strategy.md).

## Dungeon Carnage R56 post-merge qualification — 25 September 2026

- PR #2333 / `codex/dungeon-environment-diagnostics-r56` was fully qualified at exact head `1f549533c0b0737963603ba337d7954d6fb07e6d`: Lost Sizzler Load Safety passed its Node/static job and Chromium shards 1–6; Native Mouse Wheel, Site Safety, Arcade Test Package, SEO Automation, Structured Data, Social Metadata, itch.io Package and Public Code Cache Version also passed.
- #2333 merged as `df282217609375336a802fb348b75446b8ace403`. Generated SEO/video output then advanced `main` to `a78269fd49c2c9ca3021c179b896b716239d8c11`.
- The merged R56 tree contains the review-driven repairs: exact player/cell environmental damage signals, hazard cooldown filtering, lethal-hit-safe evidence, mandatory-route hazard preference, disjoint relaxed hazard-room candidates, authoritative trap-contact signals, and purchase feedback that cannot overwrite a successful transaction with a post-purchase INVENTORY FULL/price blocker.
- Follow-up branch `codex/dungeon-r56-postmerge-qualification-20260925` starts from exact current main `a78269fd49c2c9ca3021c179b896b716239d8c11`. It corrects both public Dungeon Carnage changelogs from stale R54 wording to R56 and adds `v10-42-r56-postmerge-blockers.mjs` to pin the resolved blocker contracts.
- Candidate identity remains `V10.42 r56` / `20260924r56`. Do not change gameplay ownership merely to satisfy diagnostics.
- Follow-up PR #2337 later exposed a second trap-family ownership gap during exact-head requalification: Chromium shard 6 showed Stage 6 zone retuning could rewrite the generated trap palette so FIRE disappeared entirely even though base decoration had guaranteed FIRE/SPIKE/SHOCK. The authoritative branch now reconciles Stage 6 trap families after deterministic zone tuning, retagging only a surplus duplicate family when one of FIRE/SPIKE/SHOCK is missing; trap count, position, timing and zone ownership remain unchanged. `v10-42-r56-postmerge-blockers.mjs` pins both the generation fallback chain and this Stage 6 reconciliation. Review also found two retained Node contracts (`sitewide-public-density.test.mjs` and `single-game-compact-layout.test.mjs`) still asserted public code cache v18; both now assert `2026-09-25-public-code-v19`. Current candidate must complete a fresh full exact-head workflow matrix and fresh Codex review before merge readiness; preserve it unmerged until explicit user authorization.

## Dungeon Carnage R54 current-main implementation — 23 September 2026

- Active branch: `codex/dungeon-r54-graphics-ui-current-main-20260923`, based on current main after residual UTA #2298 and generated archive #2301 merged. Old scoping PR #2299 is closed.
- Candidate identity: `V10.42 r54` / `20260923r54`.
- Implemented R54 slice: remove C64-title leakage from generic pickups; mechanic/value pickup feedback; explicit readable Bronze HUD; no second key for a chest behind an already-paid Bronze door; rulebook sync; stronger pickup glyph treatment; WARP_GALLERY corridor material identity; named merchant characters with role-specific props; high-priority release-tokened explorer/chest art; eight-stage player walk/melee presentation and eight-stage enemy locomotion plus existing-state melee/hit animation.
- Focused regression: `arcade/lost-sizzler/tests/v10-42-r54-pickup-bronze-contract.mjs`.
- Preserve the exact-green R53 ATTACK/FIRE/trap/performance ownership. R54 implementation scope is now substantially present; exact-head qualification is the active gate, with only evidence-driven visual corrections to follow. Dialogue/quest writing remains deferred.
- UTA residual reconciliation is no longer outstanding: #2298 merged as `fcdca219ca06f1e00c19114ac142e4cbb1f46214` and generated archive publication #2301 advanced main.

## UTA residual reconciliation rebuilt on current main — 23 September 2026

- PR #2294 merged the qualified Dungeon Carnage R53 ATTACK/crowded-impact repair as `d0570158b71b155676365c9cb717ad8ab114bba2`.
- PR #2295 then merged the qualified live UTA freshness repair as `1d41d4c25f462eec543edd5b3e61ffacb14cfdb7`; generated archive output followed through #2296 on current `main`.
- Stale residual PR #2279 was closed unmerged rather than revived. Its verified evidence is being rebuilt from current `main` on branch `codex/uta-residual-rebuild-current-main-20260923`.
- The rebuild restores the 17 verified residual game-page mappings / 20 releases, the 164-record residual classification, the duplicate-archive-ID parser correction, curation-triggered publishing workflows and focused regression coverage without reverting newer UTA freshness tests or generated output.
- Keep this candidate separate from the upcoming Dungeon Carnage graphics/UI overhaul. Exact-head qualification and explicit user merge authorisation remain required.

## UTA live freshness #2295 rebuilt on merged R53 baseline — 23 September 2026

- PR #2294 merged as `d0570158b71b155676365c9cb717ad8ab114bba2`; its exact-head Dungeon ATTACK/crowded-impact qualification is now part of `main`.
- Draft PR #2295 / `codex/uta-live-runtime-freshness-20260923` was rebuilt directly on that new `main` rather than merging a 14-commit-behind branch.
- Only the intended UTA scope was carried forward: browser revalidation of `/data/uta-game-matches.json` with `cache: "no-cache"`, public code cache `2026-09-23-public-code-v7`, and full committed-map/Gary Lineker regression coverage.
- The older #2295-only natural-trap harness divergence was deliberately dropped; the merged #2294 exact-green trap/runtime baseline remains authoritative.
- Require a new complete exact-head matrix on this rebuilt branch before merge. User authorisation to proceed in this order has already been given.

## Dungeon Carnage R53 ATTACK/crowded-impact candidate — 23 September 2026

- Draft PR #2294 / branch `codex/dungeon-r53-attack-rail-current-main-20260923` is the active ATTACK-lockout/repeat-fire/crowded-impact candidate on top of the merged R53 global trap repair.
- It recognises established melee swing work as a completed fresh attack, preserves real held-fire behaviour, recovers only stale finite combat blocks, keeps major notices in the lower rail, and bounds redundant projectile-impact presentation under effect pressure without suppressing damage or knockback.
- Initial qualification on code head `3530a77d2ea2045cffb7304e22f253a31eb78a21` found the new >3-minute desktop soak using an invalid fixture: it renamed/teleported a generated enemy, which later returned to its canonical coordinates before the damage assertion. Commit `8c65b5fbffb48cc08d20b5c31c7bea253aa57889` changes only the test to preserve a normal generated enemy at its real location and move the player beside it.
- The same qualification also saw an external YouTube API 403 in SEO Automation and one desktop-1440 mouse-wheel video stall. Neither is assigned to the Dungeon runtime without fresh exact-head evidence.
- Keep #2294 draft. Require current-main freshness plus the complete exact-head GitHub Actions matrix before merge, and merge only with explicit user authorisation.

## Dungeon Carnage R53 global floor-trap reliability — 23 September 2026

- New owner playtest evidence on deployed R52 shows a visibly **SHOCK TRAP — ACTIVE** tile can leave HEALTH unchanged.
- All ordinary FIRE/SPIKE/SHOCK floor traps share `SYS.trapActive()` and the retained contact-latch stack. The remaining failure is cycle ownership: a runtime/frame stall can skip the inactive window, leaving an old contact latch alive when the renderer has already advanced to the next ACTIVE cycle.
- Branch `codex/dungeon-r53-global-trap-reliability-20260923` makes R19 cycle-aware. It derives a cycle identity from the same period/phase clock, retires stale R19/canonical/R56/R57 contact ownership at the next cycle, keeps one-hit-per-active-contact suppression inside the current cycle, preserves armour, and retries rather than latching a hit without canonical damage evidence.
- The focused browser regression uses real generated FIRE, SPIKE and SHOCK traps and deliberately advances a full period without presenting an inactive sample. Each kind must remove exactly one HEALTH in the next ACTIVE cycle and must not double-hit inside one cycle.
- Dedicated hazard rooms and the rolling boulder remain separate damage paths and were not found to share this latch defect.
- Public candidate identity is `V10.42 r53` / `20260923r53`. Do not merge until exact-head CI is fully green and merge is explicitly authorised.

## Dungeon Carnage R51 live incident — FIRE / traps / renderer — 23 September 2026

- Branch `codex/dungeon-r51-fire-wall-incident-20260923` was created from current `main` `88df63430f275a37553a821c2511b1296dd13f8e` after a new owner playtest report.
- The bug report recorded one real FIRE anomaly even though later Space presses completed normally. Current `main` had the R51 real-shot verification but not the separate persistent/reasserted hit-stun recovery left on stale draft #2260; this candidate carries only that missing bounded guard forward.
- A new screenshot reproduced active spikes failing to remove HEALTH while the player remained on the trap tile. R19 now checks occupied traps on its existing 80 ms monitor after rearming inactive contacts, so an inactive-to-active cycle applies the same validated one-HEALTH trap damage without requiring a movement event.
- The same screenshot showed severe canvas smearing/garbling and apparent stalls. R29 already contains render faults and keeps RAF alive; `renderView()` previously could leak its clip/transform when a draw stage threw. The candidate restores the canvas state in `finally` and resets transform/compositing at each frame boundary, without creating a second render loop.
- Bug reports now retain all anomaly events separately from the tail and include R20 FIRE, R19 trap and R29 render diagnostics.
- Focused static/browser regression coverage is being extended. This checkpoint does not authorise merge.

# AI continuation state

## Dungeon Carnage R52 unused level-up entitlement — 23 September 2026

- Draft PR #2282 / branch `codex/dungeon-unused-level-up-entitlement` is the active bounded Dungeon follow-up, based from current main `88df63430f275a37553a821c2511b1296dd13f8e` after #2271 merged.
- Existing `player.pendingLevels` remains the source of truth. R52 adds a safe Choose Later path, backdrop/Escape deferral, a counted XP-panel LEVEL-UP AVAILABLE reopen control, correct handling of multiple pending levels, and queue reconstruction after preserved/checkpoint player restoration.
- Death-level loss now consumes an unused level-up before removing a previously selected skill. Checkpoint schema is unchanged because the complete player object was already cloned.
- Candidate public identity is `V10.42 r52` / `20260923r52`. Static and Chromium entitlement regressions are included.
- PR #2282 remains draft pending exact-head qualification and explicit user merge authorisation.


## Dungeon Carnage post-R51 narrow regression candidate — 23 September 2026

- Branch `codex/dungeon-r51-regression-fixes` was created from refreshed `origin/main` `f719717824f2caa1cb89dc84a2ad7f2438f042a2`, after PR #2256 merged.
- The bounded repair restores desktop fullscreen from the original Solo/Tutorial click, keeps routine pickup/tutorial notices in the compact lower rail rather than a dungeon-obscuring overlay, and makes a Tutorial touch FIRE a single direct action without weakening normal FIRE liveness/lockout recovery.
- Focused Node contracts and the targeted Chromium contract are green, and a final `origin/main` refresh remained `f719717824f2caa1cb89dc84a2ad7f2438f042a2`. The broader `v10-9-stability.mjs` Chromium launch hit local Playwright `spawn UNKNOWN`; the itch packager also has a local Windows source-path defect. Do not treat either as green or the candidate as merge-safe until CI completes them.
- Detailed record: [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md). No merge is authorised by this checkpoint.

## Content Publisher / C64 archive enrichment regression — 22 September 2026

- Draft PR #2262 / branch `codex/fix-wonder-boy-enrichment-and-uta-audit` repairs Wonder Boy's incorrect 1979 source year to 1987, pins its Lemon64 source, and closes the silent-completion gap that allowed game publishing to report success while magazine review or UTA enrichment was still unresolved.
- Wonder Boy regression coverage requires both UTA releases: Activision 1987 archive [6764] and Hit Squad 1991 archive [1677].
- Content Publisher now validates conversion-year wording and re-checks magazine review materialisation plus UTA mapping/manual-review state before claiming a game is complete.
- Reliable Games Publishing now requires a fresh full-catalogue UTA scan. Conservative publisher aliases are expanded while title/year evidence remains required; ambiguous title-only matches stay excluded.
- Exact-head qualification and explicit user merge authorisation remain required.
- Detailed records: [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) and [single-game-community-uta-2026-09-22.md](ai-work/single-game-community-uta-2026-09-22.md).

## Full C64 Ultimate Tape Archive audit — 23 September 2026

- Branch `codex/full-c64-uta-audit-20260923` performs a complete C64 catalogue audit against the live Ultimate Tape Archive index.
- Current baseline before the expanded audit: 559 C64 games, 333 public UTA mappings, 75 manual-review entries, 226 games without a public mapping; 28 of those already have exact-title manual candidates and 198 had no candidate under the old strict title normalisation.
- The candidate expands conservative title normalisation (punctuation spacing, Roman/Arabic numerals, compact initialisms, publisher-qualified subtitle/prefix matching with sequel protection) and known publisher spelling aliases, while retaining publisher/re-release evidence and year safeguards.
- Every full scan now generates `data/uta-audit.json` so matched/manual/no-title-candidate coverage is measurable and can be re-audited whenever UTA changes.
- No title-only ambiguous candidate is auto-published. Exact-head qualification and explicit merge authorisation remain required.
- Qualification found and fixed three audit-path defects: 720-style numeric prefixes, apostrophes in double-quoted UTA hrefs, and Roman-numeral sequel-signature handling. Code head `4a7b9e6b374baeea6a9eaba3484b63ca40f3dc57` passed the focused UTA regression plus the full current-catalogue and deterministic-output stages; the documentation-inclusive head must complete the full matrix before merge.
- Detailed record: [single-game-community-uta-2026-09-22.md](ai-work/single-game-community-uta-2026-09-22.md).

## UTA curated release reconciliation — 23 September 2026

- PR #2272 and generated-output PR #2273 are merged. The authoritative fresh scan now covers 370 of 559 C64 games, with 35 unmatched manual-review games and 154 games with no compatible title candidate across 2,890 scanned UTA releases.
- Draft PR #2275 / branch `codex/uta-curated-release-reconciliation-20260923` adds a source-evidenced, game-slug + exact-archive-ID curation path for verified regional/re-release cassette relationships that are not yet represented in the game record.
- Curated IDs do not create global publisher aliases: exact normalized title matching and the existing year safeguard remain mandatory, prefix/subtitle matches cannot be unlocked by curation, and approvals cannot apply to another game slug.
- The follow-up no-title-candidate pass also adds publisher-qualified exact-equivalence for spacing-only title variants and the explicit UTA `X, The- subtitle` article notation, covering verified gaps such as Bad Dudes vs Dragon Ninja, The New Zealand Story, Nightbreed, HeroQuest, High Noon, Micro Mouse Goes Debugging and The Train without relaxing sequel or publisher safeguards.
- Exact-head regression testing also exposed `M.C. Lothlorien` / `MC Lothlorien` as a publisher-initialism mismatch for Micro Mouse. Publisher normalization now compacts dotted single-letter initialisms before alias comparison; the real archive case is retained as regression coverage.
- The residual sweep also found Stormbringer / `Storm Bringer` and Switchblade / `Switch Blade`. The latter is published in UTA as `Gremlin Graphics (GBH)`, so archive-side publisher matching now decomposes parenthetical/composite UTA credits using the same component-aware logic as game credits; this recovers the release from existing Gremlin Graphics + GBH evidence without a global alias.
- Exact-head testing caught a presentation-role edge case in that composite credit: because Gremlin Graphics matched the original publisher and GBH matched the re-release label, the tape was initially classified as an original release. Role selection now prefers any archive publisher component that is explicitly re-release-only in CCG data, so the same Switch Blade tape is correctly classified as a re-release.
- A live archive-count cross-check found UTA currently advertises 2,900 C64 releases while the previous generated audit parsed 2,890. The parser previously rejected decade-unknown labels such as `199x`; #2275 accepts these as year-neutral and adds a fail-closed diagnostic for any future release-looking directory that cannot be parsed.
- The curated evidence file now contains 15 C64 games / 16 exact UTA release IDs. It includes three game-specific semantic title aliases—Aussie Games / Australian Games [20824], He-Man and the Masters of the Universe: The Movie / Masters of the Universe: The Movie [1319], and V: The Computer Game / V [2651]—without turning those names into global aliases. Unsafe lookalikes remain excluded to manual review.
- #2275 must complete exact-head qualification and still requires explicit user merge authorisation. After any merge, Reliable Games Publishing remains responsible for the authoritative live UTA rescan and generated-output merge.
- Detailed record: [single-game-community-uta-2026-09-22.md](ai-work/single-game-community-uta-2026-09-22.md).

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Dungeon Carnage R51 qualification repair — 22 September 2026

- Draft PR #2256 remains the active R51 owner-preview/FIRE candidate.
- Qualification proved that retiring `v10-41-r30-buglog.js` from public HTML also accidentally removed its hidden supported-runtime loader side effects. The resulting browser state had no active `dungeon-solo` controller marker and was missing supported Solo stability ownership.
- The fix does **not** restore the retired buglog. `v10-42-bootstrap.js` now explicitly loads the supported controller/diagnostic/R56/R59/R60/encounter prerequisites and fails closed if they cannot initialise.
- Browser tests were reconciled only for intentional R51 product changes: public modes are Solo + Tutorial, Split/Weekly compatibility anchors stay hidden, and R51 build/cache/camera expectations use the current values.
- Final exact-head qualification is still required; keep #2256 draft and do not merge on partial or superseded CI evidence.

## P0 Dungeon Carnage FIRE lockout remediation — 22 September 2026

- Hands-on `V10.42 r50` evidence reproduced a game-breaking Solo state where Space continued to generate attack intent with 117 ammo, a live weapon, zero active projectiles, visible/focused gameplay and no blocking inventory, yet no projectile or ammo consumption followed.
- Active integration vehicle is draft PR #2256 / branch `codex/dungeon-r51-owner-preview-current-main`, already carrying the R51 owner-preview and final liveness pass.
- Reconciliation found two false-success paths in the R51 FIRE safety net: fresh-press verification was cancelled if a normal tap was released before its 120 ms check, and non-zero FIRE buffer/cooldown state was accepted as proof of a completed shot.
- The P0 correction verifies every valid fresh press even after keyup, requires actual ammo consumption or an authoritative live player projectile as shot evidence, aligns the Inventory FIRE recovery boundary to the same rule, and makes R20 report success only for a completed direct shot rather than a queued buffer.
- Focused R51 coverage is strengthened around the reproduced failure signature. PR #2256 remains draft and must not merge until the exact patched head completes the required qualification matrix and the user authorises merge.

## Temporary CCG play-games maintenance — 22 September 2026

- PR #2232 / branch `codex/temporary-play-games-maintenance` temporarily takes both CCG original browser games offline on the production CCG hostname without changing their gameplay/runtime logic.
- A shared production-only gate is loaded by the Commodore Quest public/runtime entries and C64 Dungeon Carnage. Localhost and non-production previews remain usable for development and acceptance testing.
- `/games/ccg-games/` becomes the maintenance destination and links to the existing CCG Trivia League and Game Box Hangman instead of duplicating Hangman code.
- Longer-term direction is a distinct `Play Games` hub for interactive experiences while `/games/` remains the established C64/Amiga archive.
- Detailed record: [play-games-maintenance-2026-09-22.md](ai-work/play-games-maintenance-2026-09-22.md).
## Single-game hero/presentation follow-up — 22 September 2026

- PR #2248 is merged and remains the compact shared individual-game presentation baseline.
- Draft PR #2253 / branch `codex/fix-amazon-picks-accordion-double-toggle` is the current bounded follow-up. It fixes the duplicate CCG Picks accordion click owner and tidies the shared hero/details block requested after hands-on review.
- The hero follow-up is presentation-only: desktop cover/content/3D-box alignment is normalised, actions/award spacing is tightened, and Game Credits now render as consistent label/value rows. Existing Secondary Publisher links participate in the same grid without changing game data.
- Navigation, logo, C64/Amiga toggle, community/UTA data contracts, Home and Dungeon Carnage are explicitly outside this candidate.
- Public code cache is `2026-09-22-public-code-v4`. Exact-head qualification is required before #2253 can leave draft or be considered for merge.

## Single-game community and UTA checkpoint — 22 September 2026

- PR #2227 / branch `codex/single-game-community-uta` is the bounded implementation vehicle for the shared individual-game rating/review presentation and C64 Ultimate Tape Archive integration.
- Community writes remain on the canonical Supabase `ratings`/`comments` tables. New `security invoker` read RPCs provide aggregate rating and 8-review paginated/sorted reads; the existing one-rating-per-game upsert, edit/delete/report/helpful and guest-read model are preserved.
- C64 UTA links are generated/cache-owned, never live-scraped by game pages. Confident matches require normalised title plus known publisher/re-release evidence and compatible year evidence when known. Multiple releases are preserved; ambiguous candidates are excluded to `data/uta-manual-review.json`. Amiga never requests or renders UTA data.
- The Search Console VideoObject warning is traced to the browser runtime duplicating the generated graph and fabricating `uploadDate` from the game release year. #2227 now defers to the static generated game graph, removes the invented runtime video upload date, and tightens video-SEO validation so every emitted `uploadDate` must be a timezone-bearing datetime (`Z` or an explicit offset).
- Known seed exclusions requiring verification are 1942 / Encore 1989 archive [10797] and Bangkok Knights / Activision 1987 archive [3551]. The generated manual-review JSON is authoritative after each UTA refresh.
- The exact implementation head completed all triggered GitHub Actions successfully. The live Supabase migration was then applied as version `20260922015628` (`single_game_community_read_models`); post-apply checks confirmed the helpful-vote table, both read RPCs, the helpful-vote RPC and RLS. Supabase security-advisor findings did not reference any object introduced by this migration.
- Final documentation-only qualification exposed a Public Code Cache Version harness defect (`git diff origin/main...HEAD` -> `no merge base`) caused by re-fetching `main` with `--depth=1` after a full checkout. #2227 removes only that shallow-history truncation; the cache-version guard and assertions are unchanged.
- Current `main` advanced through merged #2226 while #2227 was qualifying. The only overlapping path was this continuation index; the current-main reconciliation preserves #2226's Dungeon checkpoint and all #2227 single-game state without touching Dungeon runtime files.
- Detailed record: [single-game-community-uta-2026-09-22.md](ai-work/single-game-community-uta-2026-09-22.md).

## Active Dungeon Carnage V10.42 R50 combined blocker candidate — 22 September 2026

- Branch `codex/dungeon-r50-combined-blockers` carries the R50 fullscreen/input/layout base from #2241, the qualified #2233 audio diagnostics, and the newly implemented Nightmare cassette horror-audio, Memory Pad replay/framing and loader-artwork fixes.
- V10.4 Archive Wraith handling no longer creates a separate recurring oscillator soundtrack or reuses the Death Stalker sting. Memory Console entry is edge-triggered in simulation and the camera frames/reveals the complete unresolved Memory Pad puzzle.
- Release loader artwork now uses `resources/images/hero/c64-dungeon-carnage-home-v2.webp`.
- New combined and pickup-audio contracts are present. Exact-head qualification is required before merge; #2241/#2233 remain unmerged.
- Detailed record: [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md).

## Historical Dungeon Carnage r50 fullscreen/input follow-up — 22 September 2026

- PR #2231 is merged as `3f273ec8eb881faac1825a6779863c9367faf0d1`; `V10.42 r49` / `20260922r49` is the current live Dungeon baseline.
- Hands-on r49 testing exposed that the displayed **Press F** fullscreen shortcut fired the weapon instead. Source reconciliation found the canonical fullscreen owner intact in `game-main.js`, but r20, held-attack liveness and r47 Inventory/FIRE recovery still claimed `KeyF` as an attack alias at later capture boundaries.
- Draft PR #2241 / branch `codex/dungeon-r50-fullscreen-input-layout` removes `KeyF` from those attack sets while keeping Space/Numpad0 attack recovery and stale historical-key cleanup.
- The same hands-on fullscreen test showed a large unused black lower playfield. #2241 adds a renderer-only 1.35x desktop Solo fullscreen camera; normal desktop stays 1x, mobile stays 1.6x and split-screen stays 1x.
- Browser coverage now sends a real focused F key through document capture and requires fullscreen dispatch with no attack-intent increment. Static coverage prevents the late recovery layers reclaiming `KeyF`.
- #2241 advances release identity to `V10.42 r50` / `20260922r50`.
- No world generation, collision, damage, traps, progression, saves, economy, projectile lifecycle or combat balance is changed.
- Exact-head qualification plus hands-on fullscreen acceptance are required before closure.
- Detailed record: [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md).

## Current autonomous Dungeon Carnage checkpoint — 22 September 2026

## Current autonomous Dungeon Carnage checkpoint — 22 September 2026

## Current autonomous Dungeon Carnage checkpoint — 21 September 2026

- Latest verified Dungeon runtime merge checkpoint is now #2222: exact qualified head `d27d714f5d15757e360ce27b49b4d185e379e56d`, merged as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`. It is based directly on merged #2220 (`f2d5332ceca250861e79185c943b8098c001894a`), which repaired the Level 2 floor-simulation slowdown/trap-cycle liveness regression. #2222 advances build/cache to `V10.42 r46` / `20260921r46`, adds the bounded final visual-maximisation layer, and changes only the Level 3 E/N/W/S torch wrong-answer penalty to exactly one spawned monster.
- #2222 final visual polish consumes established biome/room metadata, wraps existing render/trap presentation owners, adds no perpetual polling/render loop, and declares no simulation, collision, combat, progression, save or economy ownership. Severe-performance and reduced-motion fallbacks remain in place.
- Exact #2222 qualification passed every triggered workflow: Site Safety, SEO, structured/social metadata, itch.io package, cache/version, dedicated mobile trap/layout, native mouse-wheel and Lost Sizzler Load Safety. The first shard-1 attempt completed the long-session soak, live Solo combat endurance and the real five-minute mobile FIRE soak (15 verified attacks over 305,028 ms) before an unchanged post-soak `#resume-btn` Playwright locator timeout. One unchanged failed-job retry on the same exact head passed canonical/Node and all six Chromium shards; no runtime, assertion or timeout was weakened.
- #2190 is merged as `fab013b320ebdb1d9f2cb873ad26a3588f565655`: first-time Solo now enters Tutorial unless explicitly skipped, and the mobile Training Control overlay no longer obstructs the D-pad.
- #2188 established real-touch natural fire/spike/shock trap regression coverage and an initial synchronous R19 repair. #2192 added a trigger-boundary guarantee after exact-main qualification exposed a wrapper/phase race. Repeated current-main qualification then exposed a second ownership case where visible `window.hurtPlayer` could temporarily be the plain canonical function and consume armour/set invulnerability before R19 repaired the contact.
- #2193 closes that remaining ownership race. Canonical `triggerTrap()` now routes a caller-validated active floor-trap contact through the retained R19 damage owner first, with canonical `hurtPlayer()` only as the fallback and the existing post-call guarantee retained as a backstop. The final contract preserves one-HEALTH trap damage, armour, XP boundaries and canonical damage/death semantics.
- Exact #2193 qualification passed CCG Site Safety, SEO Automation, C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, both dedicated Mobile Trap Layout jobs, canonical/Node contracts and all six Load Safety Chromium shards. The first shard-4 attempt sampled one shock crossing with only 36.5 ms left in the active phase; an unchanged shard-4 retry on the same exact head passed. No runtime, assertion or timeout was weakened for the retry.
- Latest qualified runtime/package artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10665815712`, 21,121,606 bytes, GitHub Actions SHA-256 `df779a234219af99ebfb56da8393defd11db30aca64e956711f4b65884deac50`, workflow run `35656738189`, exact source head `d27d714f5d15757e360ce27b49b4d185e379e56d`, merged by #2222 as `cbbf9a97eb1f83c21eea3a519fd707af28be22bd`.
- #2194 merged as `28f0815f9e849090783cd78792c26fcdc8cc5cb9` from exact head `d92fda632216cd0e109a458e7094b4f94fada29c`. It changed only the Dungeon progress/continuation records plus the natural mobile-trap browser probe; no runtime or gameplay owner changed. Exact-head C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation and Lost Sizzler Load Safety passed. Load Safety shard 6 initially observed the unchanged V10.36 loading progress at 92% rather than 100% after release readiness; the same unchanged shard passed on one targeted retry, with no runtime, assertion or timeout weakening.
- #2198 corrected the mobile natural-trap browser contract so it only selects genuinely active generated traps; exact head `0739e4300b7badf92483572b5c898490893002a3` merged as `301afdfe9e39ea2551486c5857260cc607d8a038`. This was test-only and did not alter gameplay.
- #2199 rebuilt the deployed-startup production smoke on current main and merged exact head `6888ca6e7eb2d872cd9b460e64604f73682da9bf` as `c0b8eb4a82806d524ce48e97c70888b09b0c327a`. The smoke now samples rendered frames and fails on any pre-authoritative menu exposure, loader reappearance after first valid reveal, or immediate main-mode-button presentation change. C64 Dungeon Carnage itch.io Package, Public Code Cache Version, Native Mouse Wheel Scroll Contract and Lost Sizzler Load Safety all passed; canonical/Node plus all six Chromium shards were green. This is test-only evidence, not a substitute for hands-on startup acceptance.
- #2201 reopens and repairs the deployed mobile defects reproduced after #2199: caller-validated active floor traps now bypass a late mutable `hurtPlayer` owner that could swallow trap-labelled damage and use the retained canonical damage/death owner directly while preserving armour and duplicate-contact protection; coarse/mobile landing presentation now uses one full-width column with readable Solo text. Dedicated mobile trap/layout coverage and all triggered workflows passed. Load Safety shard 6 initially hit the unchanged V10.36 92%-vs-100% loading-progress timing sample and passed on one unchanged targeted retry; no runtime assertion or timeout was weakened.
- #2203 introduced a renderer-only 1.3x camera in mobile Solo/Tutorial when the canvas is 900px wide or narrower. Hands-on feedback showed the playfield was still too small, so #2205 increased that isolated camera to 1.6x without changing desktop Solo or local split-screen. Exact #2205 qualification passed all nine triggered workflows: Site Safety, SEO, structured/social metadata, itch.io package, cache/version, dedicated mobile trap/layout, native mouse-wheel and Lost Sizzler Load Safety including all six Chromium shards.
- Startup/first-visual runtime remediation remains repository-complete through #2185, with the deployed production-smoke contract strengthened by #2199. Hands-on startup acceptance is still required because automated rendered-frame sampling does not replace the user-visible acceptance gate.
- Documentation PR #2191 is **CLOSED / SUPERSEDED WITHOUT MERGE** because it recorded #2192 as the final trap checkpoint before #2193 disproved that assumption.
- Hands-on product gates still remain after #2222: deployed startup acceptance; sustained Solo movement/firing/combat/pause-resume stability; the three-Artefact/Essence Banishment Flask exchange; deployed natural mobile spike/fire/shock damage; full-width mobile landing presentation; mobile Solo/Tutorial playfield-size acceptance; and final hands-on confirmation of the r46 visual treatment plus the one-monster Level 3 directional-puzzle penalty.
- No new Dungeon coding stage is justified unless one of those hands-on checks exposes a reproducible current-build defect.

### Exact next action

1. Hands-on test current deployed/main r46 for startup, sustained Solo/FIRE/pause-resume, mobile trap/menu/camera behaviour, final visual polish and the Level 3 directional-puzzle one-monster penalty.
2. Complete the three-Artefact/Essence Banishment Flask exchange acceptance.
3. If those gates pass, use the latest qualified r46 itch.io artifact and verify Solo, Tutorial, local 2P Split Screen and Weekly Vault website handoff before public itch.io publication.
4. Reopen repository runtime code only for a reproducible current-build defect or an explicit new feature request.

## Historical Dungeon Carnage checkpoint — earlier 18 September 2026

- Verified Dungeon runtime merge checkpoint: `38c79b61271be59791fe5f46dbc796b243f317dc` — merged module-startup loader-flicker correction (#2164). Live repository `main` is now `74e6147d28333e0d6082d7fc69a42a20bc0b52f7`; later commits are documentation/website work, not a newer Dungeon runtime.
- Stage 7 #2140 remains merged as `f4fecd858fab8d43cd9d6732ab56495cfb313116`.
- Stage 8 #2141 merged from exact qualified head `e5d4333d4e8dc2912b2ffc9c5abc13f79d4b4a2d` as `53cba902af9dbf1e118f3f274836120f6c30bb40`.
- Exact Stage 8 qualification passed the dedicated itch.io package workflow, CCG Site Safety, Public Code Cache Version, SEO Automation, Native Mouse Wheel Scroll Contract, canonical/Node contracts and all six Lost Sizzler Chromium shards.
- Load Safety shard 2 initially timed out only in the unchanged `v10-41-stage8-scout-persistence.mjs` startup wait. The unchanged targeted shard retry passed; no runtime code, assertion or timeout was weakened.
- The original Stage 8 artifact is superseded as the publication candidate by the pinned post-#2164 runtime artifact: `C64-Dungeon-Carnage-Itch`, artifact ID `10561459333`, 21,110,985 bytes, GitHub Actions SHA-256 `f8a2142824b41b85d29006cf72d52c511b2bce9e879178ad9d45f4700a38c464`, workflow run `35380506012`. Documentation-only package reruns do not supersede it unless Dungeon runtime/package inputs change.
- Stage 8 keeps the canonical CCG website runtime unchanged, excludes website account bootstraps and retired custom commerce from the staged package, preserves Solo/Tutorial/local Split Screen, and hands Weekly Vault back to the canonical website.
- Repository-side itch.io release preparation is complete. Public itch.io page creation, artifact upload/publication and the final public URL remain external release actions; no URL is invented in source.
- Startup remediation progressed beyond #2145 after hands-on evidence. #2153 exact head `8a2fc01022612a13d0c4f52f276a4d7d62deee4e` merged as `ba75374ea45871e24885a0d2cdbd57bb61f1ae95`, preventing reveal before authoritative V10.42 menu composition. #2164 exact head `43b916c3b974628446c2c9eeb55e66f47b8b14e9` merged as `38c79b61271be59791fe5f46dbc796b243f317dc`, removing the transient legacy release-ready CSS hide that caused loader → page → loader flicker. Automated qualification is complete; deployed hands-on startup retest after #2164 remains required. Detailed checkpoint: `docs/ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md`.
- The programme remains milestone-first; broad legacy cleanup stays backlog unless it blocks an active player-facing workstream.

### Manual acceptance state

Three product-level checks remain unresolved and must not be inferred from automated tests:

1. deployed startup retest after #2164: no compact/intermediate menu flash and no loader → page → loader pulse;
2. sustained Solo movement/firing/combat/pause-resume stability after #2129;
3. 3 Artefacts/Essences → exactly 1 Banishment Flask without first buying a Gold Flask, while Gold and Score remain unchanged.

**MANUAL ACCEPTANCE REQUIRED — AUTOMATED QUALIFICATION DOES NOT SUBSTITUTE FOR THESE GATES**

No further Dungeon coding stage is justified unless one of these checks exposes a reproducible defect.

### Exact next action

1. Retest the deployed/current Dungeon build after #2164 and require a direct loader → final V10.42 menu transition.
2. If startup passes, complete sustained Solo acceptance.
3. Complete the three-Artefact/Essence Banishment Flask exchange acceptance.
4. After all hands-on gates pass, upload the latest qualified itch.io artifact and verify Solo, Tutorial, local 2P Split Screen and Weekly Vault website handoff before publication.
5. Do not create new Dungeon repository work merely to keep development active; reopen only for a verified defect or explicit new feature request.

## Single-game archive presentation checkpoint — 18 September 2026

- Shared individual-game presentation PR **#2146** merged as `50a527599b9521e07ec2c593703fcf7fc26858fb`.
- It applies through the common single-game CSS/runtime/template/generator owners, so the layout improvement is library-wide rather than Road Rash-specific.
- The implementation standardises the compact content frame, tightens desktop/mobile browsing, adds available-section navigation, reserves actual generated cover dimensions to reduce CLS, and improves year/platform search-social titles.
- Current-main reconciliation found no implementation-path overlap with later Dungeon or generated-video work. The only overlap was this continuation index, which has been reconciled onto the latest main checkpoint.
- Road Rash is now generated through the authoritative publishing chain and its canonical page materialises 21 magazine-review records with source links. Do not hand-edit that generated page; future changes must continue through source data and Reliable Games Publishing.

## Site-wide public layout and discovery follow-up — 18 September 2026

- Site-wide public layout PR **#2167** merged as `9cdc9aa8415ae83201704d139feedc97bf215ccd` from exact qualified head `790885738ca67938f26ce683cf3c319de55feda2`.
- Shared public archive/info density is tightened via scoped `data-ccg-page` rules in `ccg-master.css`; Home, single-game, quiz, admin, community-auth and arcade/game runtimes remain excluded.
- Exact-head layout qualification passed CCG Site Safety, E3/viewport/WARP/E6, navigation/PWA/SEO and all six Lost Sizzler Chromium shards. Older #2156 is closed as superseded.
- Site-wide public page SEO/discovery PR **#2170** merged as `a3c06e47857223cf9d155899b3204e6bc881b2d3` from exact head `3d4c6440ce2dd561f09edc5c6f0489ec6fef7634`.
- #2170 adds missing robots/social/schema/breadcrumb/preconnect coverage to seven bounded public pages and deliberately preserves the protected Home dual-hero preload contract.
- #2170 passed Site Safety, Structured Data, Social Metadata, SEO, Quiz/Retro Collections, PWA, navigation, year/platform and mouse-wheel validation.
- Stale #2151 and diagnostic-only #2168 are closed without merge as superseded/completed.
- This work is independent of Dungeon Carnage and Content Publisher runtime ownership.

## Historical checkpoint notes

- PR #2120 was a redundant movement-wrapper proposal and is closed without merge.
- Content Publisher PR #2150 is merged; generated archive output #2157 and refresh-counter follow-up #2159 are also merged. The older game-music endpoint PR #2110 is closed without merge as superseded.
- Diagnostic-only Defect 4 PR #2122 is closed without merge.
- #1852 is closed without merge as a superseded historical Solo-stabilisation integration branch.
- #2102 is merged. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is merged. Obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver logic is retired; only inert compatibility owners required by the local session shell remain.
- #2115 is merged. The full explored dungeon map supports Solo and local Split Screen, uses a dedicated non-playing map mode, and ignores held-M repeats.
- #2111 remains a merged SEO/video-page automation result. #2109 remains the authoritative merged game/archive publication result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898, #1900 and #1902 are closed without merge. #1976 is also closed without merge; its optimisation history remains source material only.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| CI qualification policy | [ci-qualification-strategy.md](ai-work/ci-qualification-strategy.md) | PR #2339 is the active risk-based CI optimisation. Runtime JavaScript defaults to full six-shard pre-merge qualification; non-runtime assets/copy/docs/CSS keep the fast path. Fresh exact-head CI and Codex review are required after review repairs. |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md), [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md), and [startup/first-visual checkpoint](ai-work/dungeon-carnage-startup-first-visual-2026-09-18.md) | Runtime is merged through #2222 at `cbbf9a97eb1f83c21eea3a519fd707af28be22bd` from exact qualified head `d27d714f5d15757e360ce27b49b4d185e379e56d`. #2220 is the current floor-simulation/trap-liveness foundation; #2222 adds bounded r46 visual maximisation and makes a wrong Level 3 directional-torch input spawn exactly one monster. Full exact-head automation is green after one unchanged shard-1 retry for a post-soak locator timeout; hands-on product acceptance remains. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | Stage 8 #2141 is merged and the verified standalone HTML5 artifact is repository-ready. Public itch.io page creation/upload/final URL remain external; the retired custom commerce/paywall and desktop/Windows graphs stay closed. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2150 is merged and the unified Content Publisher no longer exposes game-music upload. Magazine-source recovery is live/archive best-effort and no longer blocks canonical publishing. #2157 materialised the Road Rash archive/reviews and #2159 fixed the successful-refresh counter path. #2110 is closed unmerged as superseded. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | Draft #2176 is the current Quest 3 reconstruction at exact head `09a11f2ce26b4ba5848b29e75ad33534212a0458`; all automated checks are green. Current `main` has advanced without touching any of the 17 candidate paths, so no drift-only rebase is justified. Hands-on Bedroom + 36% Conversion Bout acceptance remains the merge gate. |
| Single-game community and C64 UTA | [single-game-community-uta-2026-09-22.md](ai-work/single-game-community-uta-2026-09-22.md) | PR #2227 is the bounded implementation/qualification vehicle. Ratings/reviews stay on existing Supabase writes with compact read RPCs; live migration `20260922015628` is applied and verified. UTA is C64-only generated mapping with ambiguous matches excluded to a review queue. Final documentation-only exact-head qualification remains before merge. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2146 individual-game presentation, #2167 site-wide public layout and #2170 bounded public-page discovery metadata are merged. Generated outputs remain workflow-owned; #2169 is the latest generated SEO/video automation merge observed before #2170. |

## Remaining active draft PR classes at this checkpoint

- #2176 — Quest 3 current-main reconstruction; exact-head automated qualification is green and current-main drift does not touch its 17 candidate paths. The documented Bedroom + 36% Conversion Bout hands-on browser acceptance remains the merge gate.
- #1860 — Supabase-egress/account/backend containment programme; remains draft and requires its own staging/authenticated acceptance gates before any production cut-over decision.
- #1976 — **CLOSED / SUPERSEDED AS ACTIVE WORK**. Historical R30 optimisation source material only.
- #1852 — **CLOSED / SUPERSEDED**. Historical Solo-stabilisation integration branch only; the current Dungeon programme and manual gates are tracked elsewhere.

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code remains in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed materially, update this file too.
