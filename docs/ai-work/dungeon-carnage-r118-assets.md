# R118 licensed asset intake — owner-request audit supplement

Checkpoint: 8 October 2026. Dedicated branch: `codex/dungeon-r118-user-asset-integration-20261008`; not merged, not deployed.

## Confirmed

- R117 PR #2593 merged into main on 7 October at `a2e8bcc96be3c52e6af9260017268b8ae8c17408`. The older master request audit's claim that #2593 remains open is outdated.
- Owner-provided 0x72 Dungeon Tileset v5 and DungeonTileset II v1.7 are CC0-1.0, as verified on the original creator's itch.io pages. Niji Dungeon Tileset II Extended v1.1 is also CC0-1.0 on its creator's page.
- Ten 0x72 imported image Git blobs were byte-matched against original ZIP members. Four wall-torch frames are enabled; the formerly unverified Niji gold key was pixel-matched uniquely to the owner's original v1.1 atlas and re-enabled; a byte-identical 0x72 II crate is now imported and used for existing crate visuals. Ten other CC0 candidates remain staged and not wired to gameplay.
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
- Kenney Tiny Dungeon, hyprv Dungeon Pack, DeadlyEssence01 free tiles and elesrech animated monsters remain source-licence-screened CANDIDATES; they are **not yet imported**. See `docs/ai-work/dungeon-carnage-r118-free-replacements.md`.
- No changes to collision logic, wall placement, room topology, AI, combat, traps or item progression. Do not merge PR #2600 until all exact-head qualification and deployed visual checks pass.
