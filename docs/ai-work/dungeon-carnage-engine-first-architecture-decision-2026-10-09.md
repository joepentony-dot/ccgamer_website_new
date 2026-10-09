# Dungeon Carnage — engine-first development decision (9 October 2026)

## Authoritative product decision

**Keep and incrementally improve the existing JavaScript/browser game engine** in `joepentony-dot/ccgamer_website_new`. Unity, Godot, Phaser or a new framework are **not** authorised replacements. The independent `joepentony-dot/dungeon-carnage-unity` repository is a valuable experimental/architectural reference only, not an authoritative second gameplay implementation.

Why: the browser game already has 15 campaign floors, seeded BSP world and topology, sanctuary rules, grid AI/pathfinding, distinct combat, RPG/XP/economy, inventory and recovery transactions, visual assets and animations, save ownership, browser Playwright/Node tests and a shared itch/Electron delivery source. A Unity port would duplicate and revalidate these mechanics. Unity's own `main` commit `a299e13db024b438a068eec6e69d6a11bf101ddf` is a much older prototype checkpoint; numerous stacked draft PRs (#89 is top inspected) contain newer five-floor-generation, UI, death-cache and atmospheric work but still require Unity 6000.3.15f1 Editor/EditMode/PlayMode verification. Treat its draft quality claims as goals, not accepted real builds.

## Game-loop reference and safe incremental structure

User supplied a Game Loop diagram; interpret it for the established top-down tile-authoritative design:
Input adapters (keyboard/gamepad/touch) -> single authoritative state and controlled simulation update -> floor topology, gameplay collision, combat, enemy AI, objectives and RPG progression -> event results -> presentation layers for sprites/animation, camera/lighting, sound/music/voices and HUD -> browser + offline packagers reuse the same JS gameplay.

Use **data-only assets** as frames/text/audio definitions; never infer collision or damage from a sprite filename. Keep terrain/object collisions under world/system simulation. Retain approved art and original music when available.

Existing JS `js/game-render.js` defines `loop(t)`, clamps frame delta `Math.min(45,t-last||16)`, calls `update(dt)` then `render()` then `requestAnimationFrame(loop)`. This is currently a **variable frame step**. A fixed timestep/interpolator could help under unstable FPS, but would touch attack/AI cooldowns, trap cycles, saved timing and animation; do not replace it without profiling and reproducible baseline contracts. Check input permission once per game-state transition; avoid independently owned menu/input lock flags if tests prove an actual current bug.

Unity ideas worth selectively implementing in JS when relevant: single GameStateService gate for gameplay/inventory/pause/death/transition; presentation events with one simulation truth; lifecycle-owned room/projectile/FX cleanup; data validation; versioned save DTOs and compatibility tests; profiling-driven object/asset pooling. No C# translation or second engine build.

## Strict order

1. Existing critical defects: original 16 MP3 soundtrack blocked by Supabase; correct sound/music and recorded voice events; real FIRE/traps/save/Flask acceptance.
2. Gameplay ownership and game-loop timing/instrumentation, **only evidence-backed**.
3. Full dungeon placement, room variety, special-room restrictions and objective-level solvability across 15 floors.
4. Differentiated AI and combat coherence; preserve balance, enemy personality and special moves.
5. Explicit engine-timed animation states, flickering torches and interactive environment.
6. Proven memory/render/asset-fetch improvements; never reduce quality to mask a defect.
7. Browser/itch/Windows same gameplay source with package-specific storage/window/access gates.
8. Additional licensed visual assets only for a specific identified shortcoming.

## Immediate code checkpoint

Engine-first draft PR #2644 originally added config validation and all-15-floor sanctuary/geometry assertions (90 direct in-memory seeds passed in two passes, not full quest completion). Existing Windows preview CI at prior head reported a real packaged soundtrack failure: `desktop/dungeon-carnage/windows/windows-runtime-smoke.cjs:124` expected local `normal` WAV, got `[]`. The bundle had valid WAV routes/headers. `admin-audio-overrides.js::finishWithoutRemoteMedia` erased the five local playlist selections already set by `asset-overrides.js` whenever remote audio was suppressed.

New bounded repair in #2644: packaged flag always refuses remote Supabase catalogue even with webdriver-test override; preserve only local `assets/audio/music/*.wav` entries on the remote-skip path; browser webdriver still clears remote playlists as before. Expanded **existing** `v10-41-supabase-egress-guard.mjs` for five packaged moods, no network requests and ready event. Direct execution of the real patched owner passed in an isolated JavaScript harness; full exact-head Node, Chromium and Windows EXE verification and owner real-audio acceptance remain pending. Never claim original 16 owner MP3s are recovered.

Commercial production is paused. No production deployment, package publication or draft merges without separate authorisation and exact-current-head qualification.

## Scheduled continuation and continuity

The older disabled `Dungeon Carnage Hourly` automation was reused/renamed **Dungeon Engine-First Development**, enabled every hour. It is the **single** active development schedule for this game; older Unity, browser and asset-integration automations stay disabled. Always refresh current GitHub main, relevant draft PRs (#2644 and distinct Flask QA #2642), CI and this checkpoint. Keep continuation docs updated and avoid duplicate new owner modules/tests or spending scarce GitHub Actions minutes unnecessarily. Work on safe independently tested improvements when external music/user acceptance gates block another task.

The owner intent is long-term: engine-first, no rewrite, code and exact-state evidence before aesthetic expansion.
