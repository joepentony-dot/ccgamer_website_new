# C64 Dungeon Carnage — bug-fix-only working register

**Owner decision: 8 October 2026.** Pause **new game production** (paid itch.io release, Windows installer/portable repackaging, code-signing, launch marketing, endgame feature expansion). Work only on reproducible fixes, regression tests, asset/voice audits and already-identified hands-on acceptance. Automatic GitHub CI may assemble disposable qualification artifacts; these are **not published products**.

**Baseline:** R119 browser and offline-game corrections merged to `main` in #2624 at `0e21c1a500af5743203f1f77b02f6011d7acce58`. Main can evolve because unrelated website work is active; always refresh before branching.

## Defect/acceptance queue

| Rank | Subject | Evidence and current state | Next verification |
| --- | --- | --- | --- |
| P0 | Missing/inaccurate recorded speech | R69 sprite has **84 recorded cues** and **88 aliases**, all metadata aliases resolve. Current voice director declares **103** scripted voice keys; **29** have no direct R69 alias (some have old authorised legacy audio or are genuinely unrecorded). NPC dialogue has **31 distinct voice keys** with separate environmental/exploration lines. The Alchemist's active `npc.alchemist.ready` subtitle lacks a suitable R69 recording. The historical `npc.merchant.hidden.ready` recording incorrectly offers Artefacts rather than the current Banishment Essence mechanic. `essenceCollected`, `notEnoughEssence` and `essenceLore` similarly lack directly assigned owner recordings. R119 dialogue-priority/Death Stalker fixes are implemented, not manually heard/approved. | Audit each real speaking scenario and classify: recorded+correct, historical but appropriate, missing recording, or broken trigger. **Never wire semantically wrong old clips just to eliminate silence**; request fresh owner files where necessary. Run `node tests/dungeon-carnage-recorded-voice-coverage-audit.mjs`. |
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
