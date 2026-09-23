# Dungeon Carnage R54 visual/world overhaul — 23 September 2026

## Dependency and branch

Active development branch: `codex/dungeon-r54-visual-world-overhaul-20260923`.

This branch starts from the fully qualified exact head of draft PR #2294, `c9e4d7f1a3792afb5bf01226ed4eafbcf8893721`. Do not open the R54 PR until the prerequisite gameplay repair has been merged/reconciled onto current `main`; this avoids unnecessary duplicate CI matrices. Before opening a PR, refresh `main`, preserve the qualified R53 gameplay repair, reconcile any intervening merges, then run focused checks before the full exact-head matrix.

PR #2295 (UTA live freshness) is a separate website-data workstream and must not be mixed into R54 gameplay/art code merely to share a branch.

## Scope

R54 is a presentation/world-readability and bounded gameplay-consistency pass. It must preserve the R53 attack/trap/performance owners and must not reintroduce per-entity timers, duplicate RAF loops or effect-pool growth.

### Rulebook and HUD

- Update the in-game Objectives & Rulebook wherever R54 changes player-visible mechanics.
- Fix the KEYS HELD presentation so Bronze Keys are fully visible/readable after collection, including at the current desktop layout shown in owner testing.
- Keep Main Keys, Bronze Keys and Exit Sigil counts distinct and understandable.

### Pickup identity and feedback

In-world pickup graphics and collection feedback must describe the actual mechanic/item, not a random C64 title unless the pickup genuinely is a collectible C64 game.

Required examples:
- armour: display the actual gain, e.g. `+1 ARMOUR`;
- XP: display the actual amount, e.g. `+25 XP`;
- health/restoration pickup: use the actual item identity such as `POTION` where that is what was collected;
- ammunition: state ammunition/rounds gained;
- Bronze Key: identify it as a Bronze Key;
- weapons: show the actual weapon name and weapon graphic; never substitute a C64 game title for a weapon pickup.

Audit the pickup pipeline centrally so all floor drops, chest drops and special-room rewards follow the same logical naming contract.

### Item graphics

- Replace the current generic/simple in-world pickup glyphs with materially improved pixel-art/readable item representations.
- Give distinct silhouettes to armour, XP, health/potions, ammo, torches, keys, artefacts, teleport items, Banishment Flask, melee weapons and firearms.
- Preserve colour/rarity cues as secondary information; the shape itself should identify the item at normal gameplay scale.
- Keep rendering bounded and atlas/state based rather than adding independent animation loops.

### Chests and Bronze Key economy

- Prefer the existing designed chest sprite sheet/quality chest presentation; do not fall back to the inferior generic block chest in normal supported browsers once the asset is available.
- Audit asset loading so the intended chest sheet is reliably used.
- A chest whose route is already gated behind a Bronze Key door must not require another Bronze Key to open. One Bronze Key should pay for access to that gated reward route, not door + chest.
- Chests not protected by a Bronze Key route may retain their established locked/unlocked rules where appropriate.
- Add deterministic regression coverage for the Bronze-door/chest relationship.

### Corridors and world presentation

- Upgrade corridor floor/wall treatment and increase visual variety without changing pathfinding topology or objective reachability.
- Add deterministic corridor dressing/landmarks, junction treatment, arches/supports, wear, lighting, rubble/detail or biome-linked variants so corridors no longer read as repeated empty strips.
- Keep collision ownership explicit: decorative detail must never silently create invisible blockers.
- Preserve camera readability, trap readability and combat sight-lines.

### NPC/shop presentation

- Replace generic square/label-only shop/NPC representations with identifiable character graphics.
- Give merchants/specialists/NPC roles distinct silhouettes and readable orientation/state.
- Do not rewrite dialogue or individual quests in R54. Dialogue and quest-specific improvement is the next workstream after this visual/gameplay pass is accepted.

### Player animation

The current explorer sheet effectively supplies idle, two walk frames, two attack frames and one hurt frame per direction. Expand this materially.

Required state model:
- idle/breathing;
- directional walk/run cycle with more intermediate frames;
- melee wind-up, strike and recovery;
- firearm aim/fire/recoil where applicable;
- hit/react;
- defeat/down state where the runtime exposes it;
- optional contextual torch/item pose only if it does not obscure combat readability.

Frame selection must remain renderer-owned from current movement/combat state and time. Do not create an interval/timer per player.

### Enemy animation

The current enemy families rely heavily on procedural body-part motion. Upgrade the major families with richer state animation while retaining family-specific silhouettes.

Required states where relevant:
- idle;
- locomotion;
- attack/telegraph;
- hit/react;
- defeat;
- special ability state for enemies that visibly charge, cast, breathe fire, heal/support or stalk.

Animation must be renderer-owned and state/time based. Do not add timers/loops per enemy. The crowded-room and repeated-impact performance protections from R53 are a hard regression boundary.

## Acceptance and regression gates

Before R54 can be considered merge-ready:

1. exact head is current with `main`;
2. R53 sustained ATTACK/FIRE soak remains green;
3. FIRE/SPIKE/SHOCK trap-cycle contracts remain green;
4. crowded-hit/effect-pool performance contracts remain green;
5. Bronze Key HUD count is fully visible at supported desktop widths;
6. logical pickup labels are covered by deterministic tests;
7. Bronze-door reward chests do not consume a second Bronze Key;
8. intended chest art loads and renders in the canonical browser path;
9. corridor dressing does not alter walkability/objective reachability;
10. player/enemy animation does not create new loops/timers and remains performant with multiple enemies;
11. Rulebook wording matches the shipped mechanics.

No merge without explicit user authorisation.

## Deferred next workstream

After R54 is accepted, begin the separate NPC dialogue and individual quest improvement pass. Do not pull that writing/quest expansion into R54.
