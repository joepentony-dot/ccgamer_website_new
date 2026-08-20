# Cheeky Commodore Quest — Adventure Development Build

This folder is intentionally **development-only**. It is not linked from the public CCG site, remains `noindex`, and must stay on the `dev/ccg-quest-stealth` branch until the game is explicitly approved for release.

## Test locally from the repository

Run:

`dev/ccg-quest/TEST-GAME.bat`

The launcher serves the **whole repository** at `http://localhost:8765/` and opens:

`http://localhost:8765/dev/ccg-quest/`

It does not terminate Chrome or any existing browser windows.

## Adventure-build features now under test

- enemies require line-of-sight before acquiring players
- slow patrol behaviour while unaware
- substantially faster pursuit once alerted
- melee and ranged attacks after detection
- last-known-position chase, local search and eventual give-up behaviour
- torchlight increases visibility but makes players detectable from farther away
- persistent fog-of-war with heavily shadowed explored areas
- 10-second anti-camping warning and mini-explosion system
- local two-player split-screen with independent cameras
- friendly fire in local split-screen
- existing room-code co-op and CCG Supabase Realtime transport retained
- large pickup-information banners
- weapon upgrades through level 3
- armour that absorbs damage before health
- stored restoration potions
- rapid-fire and radar boosts
- bronze keys and optional locked treasure rooms
- main vault keys deliberately excluded from optional locked areas
- themed rooms: C64 Archive, 1541 Workshop, Budget Bin, Demo Lounge, Joystick Armoury, CPU Kitchen, SID Reactor, Warp Gallery, Zzap! Library and Treasure Vaults
- contextual room/surroundings messages
- C64 rescue and exploration side quests
- named follower enemies: Peter Cortens, Swanh8ter, Syragar, Parsnip Celery, CPU and Yoshi Yoshi
- Yoshi Yoshi short-range fire breath
- CPU support/healing behaviour

## Validation

The Adventure systems were checked across 60 generated dungeon seeds. All three main keys and the main exit remained reachable while every optional bronze door was locked. Line-of-sight blocking, chase acceleration and melee attacks also have automated checks.

The next required step is hands-on browser testing of this integrated branch build, especially local split-screen controls and real gameplay balance.

See `VALIDATION.md` for the current test record.

**Do not merge this branch to `main` until the game has passed the release checklist and has been explicitly approved to go live.**
