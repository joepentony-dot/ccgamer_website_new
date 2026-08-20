# Cheeky Commodore Quest — Exploration Test Build

This folder is **development-only** on branch `dev/ccg-quest-stealth`. It is not linked from the public CCG site and the page remains `noindex,nofollow,noarchive`. Do not merge it to `main` until the game has been explicitly approved for release.

## Test locally

From the repository root run `dev/ccg-quest/TEST-GAME.bat`, then open:

`http://localhost:8765/dev/ccg-quest/`

## Current test focus

- 128 × 84 procedural BSP dungeon with substantially more rooms and logical corridors
- camera tracks from the centre of each viewport instead of waiting for the player to reach a screen edge
- F key / Fullscreen button for a larger play view
- strict fog-of-war: 10-tile diameter normally, 20-tile diameter while a flaming torch is active
- enemies outside the lit area are not drawn and are not exposed by radar/minimap
- enemies detect players by direct unobstructed line-of-sight OR by sharing the same defined room
- enemies accelerate and attack after discovery, then search the last-known position and eventually give up
- Swanh8ter has a real multi-tile charge attack
- diagonal player movement and diagonal firing
- much larger ammo reserve and ammo packs
- 10-second anti-loitering system now periodically targets the player's exact position for damaging blasts
- bronze-key side doors leading to isolated optional treasure rooms
- locked chests containing weapon upgrades, armour, potions, torches, ammo, rapid fire and health
- main vault keys never spawn behind an optional locked door
- large pickup-information banners for every collectible
- themed rooms including C64 Archive, 1541 Workshop, Budget Bin, Demo Lounge, Joystick Armoury, CPU Kitchen, SID Reactor, Warp Gallery, Zzap! Library, Tape Store, Cartridge Bay and Cracked Intro Chamber
- local two-player split-screen with independent cameras and friendly fire
- room-code multiplayer retained for local testing and CCG Supabase Realtime deployment

## Controls

P1: WASD / arrows, Space fire, Left Shift dash, E potion.
P2: IJKL, Enter fire, Right Ctrl dash, O potion.
P pauses, M toggles sound, F toggles fullscreen.
