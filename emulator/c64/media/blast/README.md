# CCG Searchable C64 Game Library — media packs

This directory is the media location for the searchable C64 library.

The site owner provides the approved game-media files. Upload the **12 files** from `media/blast/` inside the generated `CCG_C64_1883_Game_Library_GitHub_Upload.zip` package here:

- `catalog.json` — 1,878 additional games indexed with titles, formats, exact byte offsets, lengths and SHA-256 digests.
- `pack-00.bin` through `pack-10.bin` — 11 independently fetched game-data packs, each under GitHub's per-file browser-upload limit.

The 1,878 records are PRG programs from the owner-supplied Blast Collection. Forbidden Forest, Paradroid, Uridium, Master of Magic (D64) and Bruce Lee Trilogy (CRT) are already hosted and listed separately in `emulator/c64/library.json`. Together these form a 1,883-game library, without duplicated media. The archived PRG bytes are packed unchanged.

**Never edit a pack by hand.** The C64 emulator fetches a pack only when needed and checks its full SHA-256 and the individual game before auto-start. It does not display the collection until the catalogue and *all 12 pack files* are present. Incomplete uploads leave the existing media-file loading controls available instead.

When a game asks for the next floppy, use **SWAP DISK** on Drive 8 without restarting. This particular Blast Collection consists of standalone PRGs; those game images are not made into simulated multi-disk titles.

After all 13 assets are uploaded, test a PRG, D64 and CRT launch on the deployed emulator using legitimately sourced C64 system ROMs. Not every archived PRG has been tested for gameplay compatibility.
