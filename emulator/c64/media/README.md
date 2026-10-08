# CCG Browser C64 — game libraries

The emulator supports two independent libraries. **Neither requires Supabase.**

## My Games (visitor's browser only)

The five requested commercial game titles are described by names and formats in [local-catalogue.json](../local-catalogue.json). **No copies of those game files are served or stored in this repository.**

- Choose a title in **My Games**. On first selection, choose the matching image from your own device.
- That copy is stored in this browser's IndexedDB via `/js/ccg-c64/local-media-library.js`.
- On future visits, choose the title again to load and start it. You can also **ADD** any compatible PRG/D64/D71/D81/G64/TAP/T64/CRT file, **REPLACE** a title's saved file or **REMOVE** a saved file from the browser.
- These files never reach the CCG server, GitHub or Supabase. They are only available on the same device/browser profile; clearing site data or using private browsing will erase or isolate them. Browsers can also evict local data when storage is low.
- First boot requires visitor-supplied KERNAL, BASIC and CHARGEN ROM images; optional 1541 DOS ROM enables additional drive behaviour.

To add more **empty suggested title slots** (without hosting bytes), edit `emulator/c64/local-catalogue.json`: add a distinct `preset:kebab-case-id`, `title`, `filename` and lowercase `format`. Visitors can also import new titles themselves without any repository change.

## CCG Online Library (publicly hosted, authorised files only)

Publicly hosted, redistributable game/demo images belong in `emulator/c64/media/` and are listed in [library.json](../library.json). The only current public item is a CCG-created BASIC test program embedded in that manifest.

Before adding a public game:

1. Verify an explicit redistribution licence or recorded written permission for **that exact file**, including bundled graphics, music and third-party assets. Age, abandonware labels and personal ownership do **not** establish public-domain status.
2. Commit the authorised image under `emulator/c64/media/` on a review branch, with the licence/source/permission record.
3. Add a distinct ID, title, exact case-sensitive filename, lowercase format, `license` and URL `/emulator/c64/media/<filename>` to `emulator/c64/library.json`.
4. Verify the hosted URL, file checksum, licence and actual auto-start in the emulator before merging.
5. Keep `library.json` limited to media with real URLs or allowed embedded `dataBase64` content; never add placeholder 404 links.

Selecting either type of stored game runs through the existing fresh-session automatic disk/tape/program/cartridge loader; C64 keyboard controls remain available when the game is active.
