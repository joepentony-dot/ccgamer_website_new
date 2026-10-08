# R119 combined offline Windows qualification — 8 October 2026

**Candidate:** `integration/dungeon-r119-gameplay-audio-20261008`, based on source `main` at `f6043cb372dbdf6ecc438547ea92b24135c609e0`. Work is intentionally isolated from the published CCG site and member data.

## Exact changes staged together

- Consolidated the guarded fixes from draft #2610 (offline-only bundled fallback playlists, Treasure Goblin spotted/escaped/caught messages, loot at final enemy tile, no fatal-hit displacement).
- Corrected the Goblin countdown zero-boundary: a timer value of zero cannot reset to 22 seconds on the next AI tick.
- Consolidated draft #2614 (higher-priority approved recorded dialogue interrupts lower-priority clips without queued stale speech; successful Death Stalker kill invokes `deathStalkerBanished`).
- Registered both existing R119 Node regressions in Dungeon PR qualification, with an added timer zero-boundary assertion.
- Re-derived the Windows installer/portable pipeline from qualified draft #2617 onto current main, with a persistent Windows profile, stable loopback save origin, byte-range voice support, ASAR packaging and real executable restart/save smoke. No automatic commercial release.
- Included optional private owner-MP3 intake verifying all 16 original Supabase file sizes and Storage ETag fingerprints before packaging; original media have **not** been recovered and are not added to the repository.
- Scoped `desktop/dungeon-carnage/windows/` out of the public service-worker code-version guard, preserving guard coverage elsewhere.

## Outstanding acceptance gates

CI must pass at the exact integrated head: Dungeon PR Qualification, Full Qualification including Chromium shards, Windows Setup/Portable preview build with actual EXE launch/save persistence, existing itch package, SEO, site safety and cache/performance guards. Inspect any failures rather than weakening test contracts.

**Do not merge or publish merely on green CI.** Owner needs to verify live Windows installation/uninstallation, real Solo progression and save/Continue, Treasure Goblin loot and announcements, Death Stalker recorded banishment and correct voice events. The original 16 MP3 soundtrack files are blocked by Supabase egress; a signed commercial release must use owner-recovered authentic MP3s, not the temporary WAV fallback.

Old draft PRs #2610, #2614 and #2617 remain separate until combined qualification and a safe reconciliation decision. Supabase user/login data and public release gates are untouched.

## Additional R119 map-generation correction — sanctuary separation

The owner supplied a map screenshot showing the two permanent green sanctuary rooms joined by a very short direct corridor. Root cause: `CCGSystems.decorate` previously selected the first two room candidates, without measuring physical distance or connectivity.

- The **same procedural room allocator** now ranks eligible *pairs*, preferring the existing strict safe-room tier while requiring at least **3 graph hops** (intervening rooms) and at least **18 map tiles** between sanctuary room boundaries, rather than just different room IDs.
- Candidate tiers retain all existing exclusions for start/exit, Sigil, reserved dedicated-hazard rooms, merchant rooms and irremovable/critical enemies. No changes to the dungeon map geometry, pickups, doors or member data.
- Normal deterministic floor coverage exercised 28 real `CCGWorld.generate` + `CCGWorld.createHostState` + `CCGSystems.decorate` flows on floors 1, 3, 9 and 15: both sanctuaries retained per floor, with minimum 48 tiles of gap and minimum 3 corridor hops; no excluded critical room was converted. Test: `tests/dungeon-carnage-r119-sanctuary-spacing.test.mjs`, registered in Dungeon PR qualification.
- If a future constrained map cannot accommodate two correctly separated safe rooms, the allocator intentionally never places two next to each other; it will choose fewer rather than violate the spacing invariant. This must remain a guarded edge case.
- **Newly generated floors only:** saved runs with an already-generated adjacent sanctuary arrangement are not destructively rewritten; they get the new rule after their next floor is generated/new run is started.
