# R118 licensed asset intake — owner-request audit supplement

Checkpoint: 8 October 2026. Dedicated branch: `codex/dungeon-r118-user-asset-integration-20261008`; not merged, not deployed.

## Confirmed

- R117 PR #2593 merged into main on 7 October at `a2e8bcc96be3c52e6af9260017268b8ae8c17408`. The older master request audit's claim that #2593 remains open is outdated.
- Owner-provided 0x72 Dungeon Tileset v5 and DungeonTileset II v1.7 are CC0-1.0, as verified on the original creator's itch.io pages. Niji Dungeon Tileset II Extended v1.1 is also CC0-1.0 on its creator's page.
- Original 0x72/Niji CC0 artwork has been recovered and source-matched. Four wall-torch frames, the Niji gold key, 0x72 II crate/column and Kenney CC0 barrel are visually integrated. Of the earlier ten remaining staged art candidates, eight are 0x72 CC0; the pumpkin/plague-doctor strips now have exact source lineage confirmed. The other two staged strips (skeleton and vampire movement) are original Pixel_Poem assets with separate free-commercial permission, NOT CC0. All ten stay unwired to gameplay.
- The earlier `Dungeon tileset(1).zip` had no README, licence or author credit. Twenty derived art files have been removed from the R118 candidate tree; unknown-rights floor, prop, spike and fireplace overrides remain disabled. Existing 0x72/R85 and canvas fallbacks are retained.
- Minifantasy Dungeon Free Version is non-commercial-only and must not be included in a commercial release.

## Remaining owner requests

The October asset intake is PARTIAL, not COMPLETE. KayKit, Dungeons & Pixels, Craftpix, Super Pixel Objects, Treasure+ and other owner packs still need source-rights checks and in-game scale/semantic evaluation. No runtime collision, room generation, item tier, combat, AI or progression code was changed by this art safety pass.

## Qualification and release hold

The R118 branch remains divergent from main; refresh ahead/behind before final merge. The old R118 Node test incorrectly required the unverified key before its source was established; the revised test now requires specific provenanced PNG hashes, exact atlas crop identity, valid sprite dimensions and a proportional drawing helper. Exact-head PR Qualification, six Chromium shards, package/site/cache checks, visual scale and deployed acceptance remain outstanding. Do not merge or deploy until all required checks are green on the same reconciled head.

This supplement records the R118 delta without overwriting unrelated items in `docs/ai-work/dungeon-carnage-master-request-audit.md`. The master file itself still requires reconciliation after the draft R118 PR has been qualified.

## 8 October follow-up

- At this follow-up checkpoint, the unverified extended gold-key candidate was temporarily disabled. Subsequently, the owner archive was recovered; a unique pixel-perfect match in Niji v1.1 resolved its origin and the key was re-enabled under hash-pinned tests. Existing key fallback remains available if the new image fails.
- Prior CI success applied to `780aa634`, not these new commits. Re-run all required qualification checks on the final reconciled branch head before considering merge.
- No gameplay, collision, room-generation or progression logic changed in this follow-up.

## R118 source-binary asset integration follow-up

- Recovered matching original 0x72 II v1.7 and Niji v1.1 ZIP archives from owner library. Verified their exact bytes and existing creator CC0 terms without purchase.
- Enabled source-matched Niji 16x16 key and added a 0x72 II 16x24 crate as a verified licensed runtime replacement. Native image width/height preserved in render fitting for wall-torch animation and the crate.
- Detailed archive hashes, pixel match coordinates and the SHA-256 for both PNGs are in `arcade/lost-sizzler/assets/pixel/user-r118/PROVENANCE.md` and `assets/asset-manifest.json`.
- A free Kenney Tiny Dungeon CC0 barrel sprite was obtained through a curated public source that documents its original `tile_0082.png` mapping; the binary, hash and selected runtime art path are recorded. The named `tile_0082.png` barrel file was byte-matched against three independent public Tiny Dungeon repositories (all the same Git blob SHA); direct comparison with Kenney's original ZIP was not performed. Additional Kenney tiles, hyprv Dungeon Pack, DeadlyEssence01 free tiles and elesrech animated monsters remain source-licence-screened CANDIDATES and are **not yet imported**. See `docs/ai-work/dungeon-carnage-r118-free-replacements.md`.
- No changes to collision logic, wall placement, room topology, AI, combat, traps or item progression. Do not merge PR #2600 until all exact-head qualification and deployed visual checks pass.

## Stone column — source-verified zero-cost substitution

An original 0x72 DungeonTileset II v1.7 `frames/column.png` was recovered and imported unchanged as `cc0-column-0x72-ii.png` (16×48, CC0-1.0; SHA-256 and source archive fingerprint recorded in the R118 manifest and provenance document). The game now optionally renders it for existing pillar decorations using proportional fit and a visible base over the existing blocking tile; the procedural art remains its fallback. Combat, room geometry and collision ownership were not touched. The R118 Node regression contract includes dimension, hash, source licence and placement checks.

**Release remains on hold:** the latest branch head, not a prior tested commit, must pass the complete required qualification matrix and image appearance requires in-game acceptance. Other owner-supplied/free-only packs remain outstanding rather than being silently called integrated.

## SnowHex free-version licence resolution

The original uploaded `Dungeon Gathering Free Version.rar` was recovered and inspected. It contains its creator's `License.txt` granting commercial game use/modification, subject to no standalone asset redistribution; the original SnowHex itch.io listing confirms these commercial terms for the zero-payment download. The archive is **not** the paid full-version package. Source rights can now be treated as VERIFIED for free-tier contents; in-game scale, sprite semantics and installation remain pending. No SnowHex artwork has yet been enabled. Details and SHA-256: `arcade/lost-sizzler/assets/pixel/user-r118/PROVENANCE.md`.

## Pixel_Poem commercial-free animated gold-score pickup

The author's free 2D Pixel Dungeon Asset Pack v2.0 supplied original 16×16 rotating coin sprites. Three distinct PNGs have been imported unchanged; the fourth animation phase reuses the second frame because the original image bytes are identical. The creator permits commercial games and modifications, but this is a **creator-granted free-commercial licence, not CC0**, so the permissions/hashes are separately recorded in `images.visualOverhaul.r118FreeCommercial` and the R118 provenance register.

The new frames animate only existing gold-score ground pickups, drawing three coins inside the unchanged collection footprint. If any required frame fails to load, the previously approved R85 gold SVG remains the fallback. No economy, pickup, XP, combat, collision or other gameplay logic changed. Hash, size, frame ownership and renderer tests are included in the existing R118 test file. Pixel_Poem's small skeleton/vampire sheets were deliberately held back after visual comparison against the current more detailed enemy artwork.

## Source confirmation for two staged character strips

Both `pumpkin-dude.png` and `plague-doc.png` have now been individually traced to all eight original 0x72 DungeonTileset II v1.7 idle/run frames. RGBA pixels match exactly after their documented 16×32 atlas-cell offsets (pumpkin x=0,y=9; plague doctor x=-1,y=9), including intentional clipping in the latter. Source archive, output SHA-256 hashes, original frame hashes and free CC0 terms are recorded in the provenance register and asset manifest. The R118 regression test pins the result.

**No enemy graphics have been switched on** as a consequence. The richer existing atlas stays in place until compatible actor roles and in-game proportions are verified.

## R118 final licence classification correction

Eight staged visuals belong to 0x72's original CC0 packs; two separate movement sheets (`skeleton-move.png` and `vampire-move.png`) belong to Pixel_Poem's free commercially permitted `Enemy_Animations_Set.zip` and are **not CC0**. The source archive SHA, each sheet's exact matching source PNG SHA and animation grid are now recorded in `r118FreeCommercial.stagedOriginalAnimationSheets` and checked by the R118 regression test. Neither sheet is active in gameplay.

## Itch.io commercial-release asset boundary — R118 follow-up

The zero-payment art intake revealed that earlier itch.io packages indiscriminately copied `assets/pixel/user-r118/`, including ten licensed-but-**staged, unused** PNG sheets: eight 0x72 CC0 candidates and two creator-permitted Pixel_Poem movement sheets (NOT CC0). Shipping source-only sprites is unnecessary, increases distribution exposure and may make standalone-file redistribution restrictions harder to honour.

`scripts/build-c64-dungeon-carnage-itch-package.mjs` now reads **both** licence-separated `stagedNotWired` arrays from the existing asset manifest. Those candidate PNG files remain unchanged on the GitHub branch for future development, but are **excluded only from the distributable itch.io ZIP**. At the same time, packaging verifies all active 0x72/Niji/Kenney and Pixel_Poem runtime sprites are present and that no active path also appears in a staged exclusion list. The release manifest records the exact omitted paths; `--verify` independently fails if a staged file leaks into the package or an active file is missing.

The resulting R118 candidate package was inspected: **10 staged files excluded, 0 excluded files present, 0 active assets missing**. Existing fallback image paths and all website/gameplay files are unchanged. The staged artwork and author/permission documentation remain in the source repository. The later exact-head CI, live visual acceptance and PR merge gate still apply.


## Free bookshelf quality review and shipped creator acknowledgements

The free CC0 16×16 `bookshelf.png` from o_lobster's original *Simple Dungeon Crawler 16×16* artwork was located and byte-matched across three original-pack mirrors (Git blob `c705943144123b59e83f44178af8314fef0eed8f`). A rendered comparison against R85's original `prop-bookcase.svg` showed the current 64×64 artwork retaining a more detailed, recognisable bookcase at gameplay tile size. **No R118 bookcase override was introduced**. The Craftpix supply shelf was also rejected as semantically incorrect, and no paid alternative is required.

The distributable game now includes a concise artist-credit file at `assets/THIRD-PARTY-ART-CREDITS.md` covering active CC0 artwork (0x72, Niji, Kenney) and separately licensed free-commercial Pixel_Poem coins. `scripts/build-c64-dungeon-carnage-itch-package.mjs` and the R118 Node contract require correct creator credit and that Pixel_Poem **must not be represented as CC0**. All existing gameplay/visual fallback behaviours are preserved.
