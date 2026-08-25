# Cheeky's Commodore Quest — Asset Reference Pack

This folder is a visual/design reference for replacing the bundled and procedural artwork used by **Cheeky's Commodore Quest**.

The game renders internally at **1600 × 900 (16:9)**. Custom artwork is uploaded through `/admin/arcade-assets.html` and stored as a live override. If an override is disabled or missing, the game falls back to the bundled/procedural artwork.

## Existing bundled backgrounds

The current generic scene backgrounds are in:

`/arcade/quest/assets/backgrounds/`

- `bedroom.svg`
- `beads.svg`
- `budget.svg`
- `fighter.svg`
- `invaders.svg`
- `christmas.svg`
- `maze.svg`
- `amiga.svg`
- `guru.svg`

Use these as layout references when creating replacement backgrounds.

## Recommended replacement sizes

| Asset | In-game render size / guide | Recommended source artwork | Notes |
|---|---:|---:|---|
| Main scene background | 1600 × 900 | **1600 × 900** | Exact game canvas size. |
| Back / Mid / Front scene layer | 1600 × 900 | **1600 × 900 transparent** | Keep unused areas transparent. |
| Cheeky sprite-sheet frame | 150 × 190 default draw footprint | **150 × 190 or larger at same ratio** | Runtime scales each frame. Leave the head region suitable for the member-avatar overlay. |
| Cheeky avatar/head overlay | about 92 × 92 | **256 × 256+ square** | Source can be larger; runtime crops/scales. |
| Tier-Tex sprite-sheet frame | 124 × 158 | **124 × 158 or larger at same ratio** | States: idle, walk, jump, guard, punch, kick, hit. |
| Normal 8-bit enemy | 70 × 70 | **70 × 70 or larger square** | Sprite state `run`. |
| Low 8-bit enemy | 78 × 48 | **78 × 48 or larger at same ratio** | Sprite state `low`; designed for duck-fire. |
| Boss | 205 × 180 | **205 × 180 or larger at same ratio** | All five bosses use the same render footprint. |
| Collectible | 54 × 54 | **128 × 128 transparent** | Tape, disk, Zzap!64 and joystick are scaled to 54 × 54. |
| Power-up | 64 × 64 | **128 × 128 transparent** | Shield, speed and double-fire/score. |
| Alien Formation alien | 56 × 36 | **112 × 72 or same ratio** | Five independently replaceable alien rows. |
| Alien Formation ship | 104 × 65 | **208 × 130 or same ratio** | Centred on the ship position. |
| Alien Formation bunker | 120 × 34 | **240 × 68 or same ratio** | Bunker health/damage is still game logic. |
| Alien Formation shot | 16 × 24 | **32 × 48 transparent** | Separate player/enemy shot slots. |
| Electric Bead ball | 44 × 44 | **88 × 88 transparent** | Currently procedural; dedicated upload slot still to be added. |
| Dot-Maze cell | 54 × 54 | **108 × 108 tiles** | Maze walls/bugs/dots are currently procedural rather than individual upload slots. |

## Hazard sizes currently used

Hazards are not all the same shape. The engine currently uses, among others:

- Bedroom Load Error: about **108 × 92**
- Bedroom duck hazard: about **118 × 56**
- Tape Tangle: about **82 × 68**
- Budget Full Price: up to **132 × 112**
- Budget duck price card: about **152 × 55**
- Budget Bin: about **210 × 66**
- Christmas present: about **84 × 84**
- Gran's House: about **145 × 118**
- Christmas duck hazards: about **150–180 × 50–56**
- Amiga bouncing disk: about **84–88 × 84–88**
- Amiga Workbench duck window: about **170 × 56**
- Guru Corrupt Block: about **104 × 96**
- Guru jump box: up to **118 × 112**
- Guru Memory Box: about **96 × 82**
- Guru beam: **86 × 315**

**Important:** the current Admin system has one static hazard override per main stage. Because several differently sized hazards exist in each stage, a single image can be stretched into different rectangles. Long-term, the better solution is a dedicated slot for each named hazard. This reference pack records that limitation so it can be addressed before final artwork is produced for every hazard.

## Sprite-sheet convention

Sprite-sheet PNG/WebP files should use a regular grid: every frame has the same width and height.

Example Cheeky states:

```json
{
  "idle": [0, 1],
  "run": [2, 3, 4, 5, 6, 7],
  "jump": [8],
  "fall": [9],
  "duck": [10],
  "duckFire": [11],
  "fire": [12],
  "punch": [13, 14, 15],
  "kick": [16, 17, 18],
  "hit": [19]
}
```

The Admin manager asks for frame width, frame height, number of columns, FPS and the animation map. The sheet itself stays intact; Canvas selects the required source rectangle at runtime.

## Cheeky + member avatar

The preferred player artwork model is:

1. Animate the **body** in the sprite sheet.
2. Keep the head area consistent between frames.
3. The game overlays the signed-in member's CCG avatar in the head position.
4. Guests use the default Cheeky head/mascot fallback.

This lets every logged-in member use the same polished body animation with their own avatar head.

## Background workflow

For each scene, create assets in this order:

1. **Main Background — 1600 × 900**: complete environment and safe fallback.
2. **Back Layer — 1600 × 900 transparent**: distant animated/decorative elements.
3. **Mid Layer — 1600 × 900 transparent**: objects behind the player but above the base background.
4. **Front Layer — 1600 × 900 transparent**: objects intended to pass visually in front of the player.

Do not bake gameplay hazards, enemies, bosses or HUD elements into the background.

## Files in this reference pack

- `reference-sheet.svg` — labelled visual comparison sheet for the main procedural placeholders and their in-game footprints.
- `background-layer-guide.svg` — 1600 × 900 scene/layer composition guide.
- `sprite-sheet-template.svg` — example regular-grid animation sheet layout.
- `asset-reference.json` — machine-readable dimensions/status list for future Admin hints/validation.

## Coverage status

Already replaceable through Admin:

- all nine main backgrounds;
- Back/Mid/Front layers for every scene;
- Cheeky, Tier-Tex, generic enemy and all five boss sprite sheets;
- static boss fallbacks;
- stage hazard fallbacks;
- collectibles and power-ups;
- Cheeky static rig parts;
- Tier-Tex static action sprites;
- Alien Formation aliens, ship, bunker and projectiles;
- music and SFX.

Still procedural and worth adding dedicated slots later:

- Electric Bead ball;
- individual named hazard variants rather than one hazard image per stage;
- Dot-Maze wall tile, normal dot, power cell and four bug personalities;
- optional player/boss projectile artwork outside Alien Formation;
- particles/hit flashes/glitch effects.
