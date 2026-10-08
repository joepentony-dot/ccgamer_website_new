# R118 licensed asset intake — owner-request audit supplement

Checkpoint: 8 October 2026. Dedicated branch: `codex/dungeon-r118-user-asset-integration-20261008`; not merged, not deployed.

## Confirmed

- R117 PR #2593 merged into main on 7 October at `a2e8bcc96be3c52e6af9260017268b8ae8c17408`. The older master request audit's claim that #2593 remains open is outdated.
- Owner-provided 0x72 Dungeon Tileset v5 and DungeonTileset II v1.7 are CC0-1.0, as verified on the original creator's itch.io pages. Niji Dungeon Tileset II Extended v1.1 is also CC0-1.0 on its creator's page.
- Ten 0x72 imported image Git blobs were byte-matched against original ZIP members. Four wall-torch frames are enabled; one extended key candidate is selected but its exact atlas extraction lineage needs independent confirmation. Ten other CC0 candidates are staged and not wired to gameplay.
- The earlier `Dungeon tileset(1).zip` had no README, licence or author credit. Twenty derived art files have been removed from the R118 candidate tree; unknown-rights floor, prop, spike and fireplace overrides remain disabled. Existing 0x72/R85 and canvas fallbacks are retained.
- Minifantasy Dungeon Free Version is non-commercial-only and must not be included in a commercial release.

## Remaining owner requests

The October asset intake is PARTIAL, not COMPLETE. KayKit, Dungeons & Pixels, Craftpix, Super Pixel Objects, Treasure+ and other owner packs still need source-rights checks and in-game scale/semantic evaluation. No runtime collision, room generation, item tier, combat, AI or progression code was changed by this art safety pass.

## Qualification and release hold

The R118 branch diverged from current main (9 commits ahead / 3 behind at the start of this pass). The old R118 Node test required rejected, unlicensed art overrides and needed correction. Exact-head PR Qualification, six Chromium shards, package/site/cache checks, visual scale and deployed acceptance remain outstanding. Do not merge or deploy until all required checks are green on the same reconciled head.

This supplement records the R118 delta without overwriting unrelated items in `docs/ai-work/dungeon-carnage-master-request-audit.md`. The master file itself still requires reconciliation after the draft R118 PR has been qualified.

## 8 October follow-up

- Unverified extended gold-key candidate disabled in `js/asset-overrides.js` and marked inactive in `assets/asset-manifest.json`; original key artwork fallback retained. The binary remains staged for provenance investigation, not approved for release.
- Prior CI success applied to `780aa634`, not these new commits. Re-run all required qualification checks on the final reconciled branch head before considering merge.
- No gameplay, collision, room-generation or progression logic changed in this follow-up.
