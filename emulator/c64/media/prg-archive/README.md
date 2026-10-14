# Optional owner-supplied C64 PRG archive

The emulator's original five hosted games and Blast Collection remain independent of this directory.

This directory is deliberately inactive until the site owner uploads **all** approved media:
- `catalog.json`, the cleaned game-title manifest.
- `pack-00.bin` through `pack-47.bin`, the 48 checksum-bound PRG data packs.
- **LAST**, `ready.json`, the activation marker binding the exact manifest SHA-256, record count and pack count.

Do not upload `ready.json` until all media packs are in place. Without it, the main game library continues working and the optional archive stays hidden. With it, the emulator verifies the catalogue hash and checks individual pack/game hashes before loading.

The provided archive has 9,849 distinct searchable titles. Each display title has release-year, publisher and other archive tags removed, but every selected PRG retains its original bytes. Raid over Moscow appears once.

**Publication gate:** The site owner must verify public redistribution rights for each game; possession of a ROM archive does not establish permission. Do not activate or deploy a library containing unlicensed commercial games. SHA-256 confirms exact file identity, not gameplay quality, legal status or completeness.

Do not change the existing Blast collection's binary files or catalogue. Do not edit PRG pack offsets or lengths manually.
