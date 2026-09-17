# Dungeon Carnage Defect 7 — RPG terminology reconciliation

## Checkpoint — 17 September 2026

- Verified live `main` before this candidate: `06a559bba750664e8781ab0490d4c97b5d54505d`, merge of Defect 6 PR #2125.
- Defects 1–4 are repository-complete through #2117, #2118, #2119 and #2123.
- Defect 5 has no remaining repository-side correction after #2090; deployed/manual acceptance remains the closure gate.
- Defect 6 is merged through #2125. Do not reopen without new regression evidence.
- Active defect: **Defect 7 — remaining Sizzler/Zzap!/Uncommon RPG wording needs coherent setting-appropriate replacement**.
- Active branch: `codex/dungeon-rpg-terminology-current-main`.
- Active PR: #2126, opened draft from exact current `main`.
- Initial candidate head before documentation: `6e3e3e728641841dcb9d8dcb6b8c84fdd10af1b4`.

## Proven root cause

`arcade/lost-sizzler/js/progression.js` deliberately uses the historical values `UNCOMMON`, `SIZZLER`, `GOLD MEDAL` and `ZZAP! 97%` as internal rarity identities. Those values are also interpolated directly into generated weapon and loot names, so compatibility/data identifiers leak into the player-facing Dungeon Carnage presentation. The same base progression file also exposes the objective copy `Defeat the Zzap! Citadel guardian`.

Changing the internal rarity array or roll outputs would risk save/progression compatibility and would unnecessarily alter loot semantics. The defect is therefore a presentation-boundary problem, not a rarity-generation problem.

## Bounded candidate

Files changed before this checkpoint:

- `arcade/lost-sizzler/js/v10-42-rpg-terminology.js`
- `arcade/lost-sizzler/js/v10-42-bootstrap.js`
- `arcade/lost-sizzler/tests/v10-42-rpg-terminology.mjs`

The new terminology layer:

- preserves all internal rarity keys and their ordering/probabilities;
- maps player-facing `UNCOMMON` → `RARE`;
- maps player-facing `SIZZLER` → `ENCHANTED`;
- maps player-facing `GOLD MEDAL` → `RELIC`;
- maps player-facing `ZZAP! 97%` → `LEGENDARY`;
- reconciles generated weapon, chest-loot and inventory labels;
- changes only the visible objective phrase `Zzap! Citadel guardian` → `Citadel guardian`;
- loads before the merged Owned Firearms clarity layer so firearm presentation receives reconciled names;
- advances only the ordered V10.42 build/cache marker from r29 to r30.

No rarity probability, item power, weapon stat, loot distribution, save schema, combat owner, economy, retired-mode logic, protected intro-loader file, `games/games.json`, Cloudflare, Supabase or commerce configuration is changed.

## Regression

`arcade/lost-sizzler/tests/v10-42-rpg-terminology.mjs` executes the terminology layer against representative progression owners and proves:

1. the four visible replacement labels are deterministic;
2. a generated SIZZLER weapon remains internally `rarity="SIZZLER"` while its visible name becomes `ENCHANTED ...`;
3. a `ZZAP! 97%` loot record remains internally unchanged while its visible name becomes `LEGENDARY ...`;
4. the guardian objective loses the Zzap! wording;
5. inventory labels are reconciled at the presentation boundary;
6. base progression still contains the historical internal keys;
7. r30 bootstrap loads the terminology layer before Owned Firearms clarity.

## CI state

At PR creation, GitHub had not yet attached workflow runs/statuses to candidate head `6e3e3e728641841dcb9d8dcb6b8c84fdd10af1b4`. Do not infer green or failure from the empty initial status response. Exact-head qualification remains required.

## Exact next action

Qualify the final documentation-inclusive #2126 head through repository-required Node/canonical checks and the retained Dungeon/Chromium workflows. Classify any failures against the bounded presentation-only delta. If exact-head checks are green, the PR remains mergeable/review-clean and no genuine hands-on acceptance gate is introduced by this terminology-only change, take #2126 out of draft and merge under the standing autonomous authorization. Then reconcile `main` and update the repository-level continuation/work register so Defect 7 is repository-complete.
