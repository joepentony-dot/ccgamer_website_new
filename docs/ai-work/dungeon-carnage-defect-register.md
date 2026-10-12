## R132 production-music egress protection — 12 October 2026 (source candidate, unqualified)

- Source branch `fix/dungeon-r132-supabase-audio-egress-20261012` started from qualified R131 `main` at `9ebc51e33a46f077bedadfaa3650541b233190ba`. R131 #2693 is merged and its post-merge Pages/Workers/SEO/Site Safety/live-navigation/six Chromium shard matrix has fully succeeded.
- Confirmed audio selection gap in current main: `asset-overrides.js` hardcodes 16 owner Supabase Storage MP3 tracks, while `admin-audio-overrides.js` remote-catalogue guard excludes headless/local catalogue hydration but `lost-sizzler-playlist-audio.js` still selected release-pinned remote tracks during automated/local/offline use. This can cause unnecessary billable CDN music requests; do not claim live Supabase transfer was newly measured on 12 October.
- Carefully restacked the eight-file focused changes from older draft audio PR #2594 on current main without importing its unrelated old tree. Playlist candidate filters metered Supabase music URLs only for HeadlessChrome/WebDriver, localhost, file:// and packaged itch/desktop contexts, retaining genuine live-site production-music choice; admin catalogue now blocks file:// as well as packaged builds. Added actual playback-boundary Node assertions and headless browser request-abort guards, preserving already-existing newer offline guard in main.
- Independent Codex initial exact-head review identified a valid P2 IPv6 loopback omission: browsers expose the hostname as `[::1]`, not `::1`. Current candidate now blocks both spellings in playlist and remote-catalogue guards; the existing live-source Node egress tests now exercise headed `[::1]` to confirm zero production playlist/catalogue requests. **Fresh exact-head CI and re-review are required before treating this repair as qualified.**
- Second independent Codex pass flagged remaining 127.0.0.0/8 headed-localhost egress; updated both audio owners to use identical hostname classification (localhost and .localhost, both IPv6 ::1 spellings, 0.0.0.0 and full 127/8). Real-module Node playlist/catalogue tests now cover 127.0.0.2, 127.255.255.254, nested .localhost and bind-all as local. No additional soundtrack distribution change, original owner bytes still unavailable. **Require fresh exact-head CI/review after this repair**.
- Third independent review surfaced local `localhost.` / `play.localhost.` trailing-root-dot spellings and absent headed bare-`localhost` fixtures. Both audio owners now strip one trailing root dot before using the shared, otherwise unchanged host predicate; real-source Node tests exercise headed bare/dotted localhost, subdomains and dotted IPv4, and assert both owners retain IDENTICAL host-classification code. Requalify on the newest exact head; do not assume older green shard results apply.
- Qualification STATUS: **source candidate only, not yet reviewed/CI-qualified/merged/deployed**. Need exact-head Node, Chromium six shards, release/path/SEO/cache/Workers checks, independent review, zero behind main and guarded expected-head merge; afterwards verify no Supabase Storage music requests during automation, preserve production site music choices, assess post-merge runtime/Pages/Site Safety. Treat original 16 MP3 byte recovery and owner's voiced-event/manual Flask acceptance as separate blockers. No paid Windows or itch release.

# C64 Dungeon Carnage — bug-fix-only working register

**Owner decision: 8 October 2026.** Pause **new game production** (paid itch.io release, Windows installer/portable repackaging, code-signing, launch marketing, endgame feature expansion). Work only on reproducible fixes, regression tests, asset/voice audits and already-identified hands-on acceptance. Automatic GitHub CI may assemble disposable qualification artifacts; these are **not published products**.

**Baseline:** R119 browser and offline-game corrections merged to `main` in #2624 at `0e21c1a500af5743203f1f77b02f6011d7acce58`. Main can evolve because unrelated website work is active; always refresh before branching.

## Defect/acceptance queue

| Rank | Subject | Evidence and current state | Next verification |
| --- | --- | --- | --- |
| P0 | Missing/inaccurate recorded speech | R69 sprite has **84 recorded cues** and **88 aliases**, all metadata aliases resolve. Current voice director declares **103** scripted voice keys; **29** have no direct R69 alias (some have old authorised legacy audio or are genuinely unrecorded). NPC dialogue has **31 distinct voice keys** with separate environmental/exploration lines. The Alchemist's active `npc.alchemist.ready` subtitle lacks a suitable R69 recording. The historical `npc.merchant.hidden.ready` recording incorrectly offers Artefacts rather than the current Banishment Essence mechanic. **R120 candidate now suppresses the obsolete `npc.alchemist.partial` recording without suppressing the accurate subtitle.** `essenceCollected`, `notEnoughEssence` and `essenceLore` similarly lack directly assigned owner recordings. R119 dialogue-priority/Death Stalker fixes are implemented, not manually heard/approved. | Audit each real speaking scenario and classify: recorded+correct, historical but appropriate, missing recording, or broken trigger. **Never wire semantically wrong old clips just to eliminate silence**; request fresh owner files where necessary. Run `node tests/dungeon-carnage-recorded-voice-coverage-audit.mjs`. |
| P0 external blocker | Original background soundtrack inaccessible | Original 16 author-uploaded MP3s remain blocked by Supabase Storage cached-egress restriction. Five offline WAVs are disposable preview substitutes, not the soundtrack. | Recover authentic private MP3 bytes when available, use exact-name/size/ETag owner importer, then verify all music moods. **No repackaging/publishing during hold.** |
| P1 | Treasure Goblin | R119 fixed premature offscreen escape, caught/escaped alerts, fatal knockback and loot placement; automated coverage passed. | Owner test: observe spotted event, catch, loot drop at kill tile, pickup, unattended escape. Capture floor/seed/repro on failure. |
| P1 | Sanctuary spacing | R119 selects safe sanctuary pairs separated by at least three graph hops and 18 tiles between room edges; seeded 28-floor regression passed. Existing generated maps are untouched. | Owner generate fresh floors, confirm two sanctuaries never have a direct short corridor or adjacent rooms, and safe-room restrictions still work. |
| P1 | Banishment Flask exchange | Implementation/regressions from #2090 already exist; manual acceptance remains outstanding. | Trade required three Essence/Artefacts for exactly one Flask *without purchasing a Gold Flask first*. Gold/Score must remain unchanged. Inspect current displayed game rules rather than assuming older terminology. |
| P1 | Solo gameplay reliability | Prior FIRE lockout, FIRE/SPIKE/SHOCK trap contact, movement, release/cache and inventory defects have merged guards. Their presence is **not proof that owner manual tests have passed**. | Sustained FIRE, moving into active ordinary traps, pause/resume, inventory use, multi-floor play, end-of-run state, save/Continue. File a current-build reproduction before making more owner changes. |
| P1 | Original in-game voice scenario QA | R119 priority changes and voice sprite are present in browser and offline package; user reports missing spoken events. | For each cue check actual trigger, one owner recording, whether prioritisation cancels it, VOICE toggle, audio unblock/gesture and correct room/floor. Mark `npc.alchemist.ready` as **asset needed**, not solved. |
| P2 | Visual/gameplay bugs discovered during owner playtest | Only genuine new R119 regressions should be added here; earlier screenshot issues require a fresh floor after R119. | Record steps, current build, floor and random seed, screenshot, expected vs actual, no speculative edits. |

## Excluded from this bug-fix phase

- Building a new Windows or itch.io distribution; signed installer, paid listing, shipping updates, and premature release claims.
- RPG-style endgame finale and credits makeover, donor/share functionality, additional marketing assets: preserve for the later polish/production phase unless they conceal a reproducible **functional** bug.
- Supabase-to-independent backend migration, member/account or admin changes (separate project).
- Adding unlicensed voice/music media or mislabelled placeholder recordings.

## Review and merge discipline

1. **Bug triage first.** Mark `FIXED IN CODE`, `NEEDS REPRODUCTION`, `NEEDS OWNER TEST`, `BLOCKED ON SOURCE ASSET` separately.
2. Fix only demonstrable gaps against refreshed `main`; one narrowly scoped draft PR per defect or genuinely coupled group. No reviving stale R119 branches.
3. Build deterministic Node/browser regression for the **actual input/event path** where possible. Never weaken six-shard Chromium tests or the site's normal cache/SEO/safety protections.
4. A green workflow is **automated qualification**, not owner acceptance; keep each manual gate open until explicitly exercised.
5. Stop before any commercial release or installer work. Ask for owner instruction to resume production.

## First targeted QA audit

`tests/dungeon-carnage-recorded-voice-coverage-audit.mjs` tests the R69 84-clip integrity, alias resolution and critical boss/NPC recordings, then prints a full list of live director/NPC voice keys lacking *direct* original R69 recordings. It guards against assigning the historical Artefact-trade cue to the current Essence-ready Alchemist line. This first pass **does not** claim that every event plays audibly in real gameplay; scenario-by-scenario browser/audio acceptance follows.

## R120 targeted repair candidate (8 October 2026)

- Branch `fix/dungeon-r120-alchemist-voice-accuracy-20261008` is the single fresh-main integration vehicle for the original QA audit and first defect repair; old QA-only draft #2632 is superseded after this branch qualifies.
- The Alchemist's partially funded trade announcement previously used an R69 recording of the old three-Artefact rule when the displayed gameplay requirement now uses Banishment Essence. `speakDialogueLine` now blocks only the two known obsolete cue aliases for `npc.alchemist.partial` and `npc.alchemist.ready`, while keeping the subtitle and all unrelated NPC voiceovers. When an owner-approved new Essence recording changes the cue alias, it becomes eligible automatically.
- Real-source VM regressions protect old-clip suppression, future corrected aliases, existing other merchant/scout/keeper recordings and unmodified subtitle dispatch. **NEEDS OWNER TEST** for audible Alchemist cues after a real recording is supplied; no assets have been invented or repackaged.
- No version bump, installer, itch.io product release, Supabase service change or production game deployment is part of this PR.

## R120 additional voice reliability correction

- **New confirmed bug:** voice director's `sayDialogue` could interrupt a recorded voice when an unrecorded dialogue key was requested with an interruption/priority override. It now checks whether the incoming dialogue has an approved clip **before** interrupting an active sound. An unrecorded subtitle remains on screen.
- **New confirmed bug:** `voiceWatch` previously marked Guardian encounters, use-Banishment-Flask prompts and ordinary enemy-room notices as already announced *before* verifying that their owner recording actually started. When a higher-priority voice was playing or sound was temporarily unavailable, the warning was silently lost. Markers now commit **only if** `sayKey` returns true. The five-second Gilded Elf warning follows the same rule, but its current R69 clip is absent and remains an asset-needed case.
- The real voice-director VM regression `tests/dungeon-carnage-r120-voice-on-playback.test.mjs` covers Guardian, Flask, enemy-room retries and no stale queued voice, while the updated R119 VM verifies missing Alchemist dialogue cannot cut off audible Scout speech.
- These changes make events *retryable while their triggering condition persists*. They do **not** guarantee that a one-shot event will replay after sound is turned back on; remaining recorded-cue owner gameplay acceptance is still required.

## R121 follow-up — event confirmation versus event attempt

The R120 bug fixes are merged into `main` at `df598b1d3214151bebb5500236c7b6f6072922ea`. Keep the commercial production hold in force.

- **Confirmed warning defect:** both the immediate damage hook and the periodic `voiceWatch` health monitor set `lowHealthLatch` / `criticalHealthLatch` before knowing whether the player had actually heard the warning. An ongoing higher-priority recording, sound disabled or unavailable playback consumed the one-shot latch, so health warnings could remain silent until the player healed beyond the reset threshold.
- **Confirmed rare loot defect:** the once-per-floor rare-loot latch was set before attempting voice playback. The first missed prompt permanently silenced all later legitimate attempts on the same floor.
- The R121 candidate marks all those event latches only after `sayKey` successfully starts an approved recording. All muted/busy/missing-asset failures remain retryable on subsequent health ticks or loot prompts. Existing queue-free recorded speech policy and per-floor playback limits remain unchanged.
- Regression `tests/dungeon-carnage-r121-voice-latch-retry.test.mjs` instantiates the **real voice-director** in a Node VM with deterministic approved audio, verifying low/critical retry, immediate damage hook, once-per-floor gating and no delayed stale audio queue.
- Mark **FIXED IN CANDIDATE CODE**, not owner-audibly-accepted, until exact-head PR/full Chromium qualification and subsequent hands-on testing.

## R122 Banishment Flask transaction contract — reconciliation 10 October 2026

- The Alchemist handler in `v10-42-artefact-shop-stability.js` is unchanged since the original R122 QA branch; this is **test and workflow registration only**, not a new Flask implementation.
- `tests/dungeon-carnage-r122-flask-live-transaction.test.mjs` executes the actual shop wrapper in a deterministic Node VM. It covers three ordinary Vessel Essence producing exactly one Banishment Flask without a previous Gold purchase, unchanged Gold and Score, insufficient Essence, two-Essence Seal discount, legacy Artefact/mixed payment, transactional rollback and non-Alchemist/deprecated button rejection.
- Register that regression in the existing Dungeon PR Qualification workflow alongside R120/R121 tests; preserve all newer main workflow entries and documentation.
- **Automated contract coverage is not owner hands-on acceptance.** Defect 5 still requires an actual deployed browser run collecting three Essence and exchanging it with the Alchemist (without buying a Gold Flask first), verifying exactly one Flask and unchanged Gold/Score. No paid itch.io or Windows release is authorised by this QA merge.

## R131 Charger warning parity — 11 October 2026 (candidate, not owner accepted)

- Reproducible visual defect: the normal Charger draws the preferred Puny orc-grunt animation and bypasses the procedural fallback's small charge warning despite active `ai.js` `chargeTelegraphMs` and `chargeTarget`.
- Current R131 branch fixes only the Canvas warning visibility with a static high-contrast marker over all sprite sources; attack timing/damage/movement/game progress are unchanged. A Node VM renderer contract and existing Chromium visual browser contract have been extended; exact-head review, full tests and real desktop/mobile visual acceptance still required before merge.
- This fix is independent of the outstanding live 3-Essence Flask owner test and unavailable original recorded audio. No paid or Windows/itch release is authorised by the visual change.
