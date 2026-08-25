# Cheeky Sprite Specification — Quest 2.0 Balanced Pass

## Goals
The player must remain recognisably Cheeky at game speed. Stand, run, jump, land, crouch, fire, take damage and celebrate need distinct silhouettes, but animation should not replace character with generic vector artwork.

## Active art direction
- Restore the existing raster Cheeky sprite sheets as the active gameplay artwork.
- Retain the Quest 2.0 state-based anchor and collision runtime.
- The temporary Quest 2.0 SVG sheets are no longer the preferred active art direction.
- Future replacement artwork must preserve the character and personality of the established Cheeky design rather than simplifying him into a generic mascot.

## Main sheet contract
- Logical cell: 256×320.
- Grid: 4×4.
- Frames: 16.
- Ground anchor: visual feet remain locked to the player ground point unless a state explicitly requires otherwise.
- Runtime display: state-specific rather than one fixed box for every pose.
- Collision: state-specific and independent of transparent frame padding.

### Main frames
0 idle A
1 idle B
2 run contact
3 run recoil
4 run passing
5 run flight
6 jump takeoff
7 jump rise
8 jump apex
9 fall
10 landing compression
11 crouch
12 standing fire
13 crouch fire
14 hit
15 victory

## Crouch requirement
The crouch must be unmistakable without looking compressed or anatomically odd. It should read as Cheeky lowering his body and bending his knees, not as the entire sprite being crushed toward the floor.

- Standing gameplay body: about 52×107 inside the 78×132 logical player body.
- Crouch gameplay body: about 60×90.
- Crouch display height: approximately 166–168 px versus ~198 px standing.
- Feet stay on the normal ground anchor.
- Crouch fire keeps a low muzzle position without forcing an exaggerated squat.

## Movement feel
- Idle: subtle weight shift only.
- Run: readable stride with the established Cheeky silhouette retained.
- Jump: enough height to reach every collectible lane without becoming floaty.
- Land: brief compression before normal movement resumes.
- Hit: recoil away from damage source.
- Victory: recognisable Cheeky character pose rather than generic hero posing.

## Fighting sheet
- Logical cell: 248×316.
- Use the established raster fighting sheet.
- Idle, walk, jump, guard, crouch, punch, kick, hit and victory continue to use state-specific collision profiles.
- The crouch is lower than guard but is not a half-height squat.
- Crouch collision target is roughly 100×170 around the grounded centre point; standing collision remains near 90×250.

## Runtime metadata
Each animation state may define:
- `drawWidth`
- `drawHeight`
- `offsetX`
- `offsetY`
- `hitbox`
- optional `muzzle`
- optional `cameraKick`

Rendering and collision must derive from the same named state so future sprite upgrades can change the artwork without reintroducing hard-coded crouch geometry.
