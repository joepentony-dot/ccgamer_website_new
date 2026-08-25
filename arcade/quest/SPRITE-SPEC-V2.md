# Cheeky Sprite Specification — Quest 2.0

## Goals
The player must read immediately at game speed: stand, run, jump, land, deep crouch, fire, take damage and celebrate must all have unmistakable silhouettes. The old shallow duck is retired.

## Main sheet contract
- Logical cell: 256×320.
- Grid: 4×4.
- Frames: 16.
- Ground anchor: the visual feet remain locked to the player ground point unless a state's metadata supplies an offset.
- Runtime display: state-specific, never one fixed box for every pose.
- Collision: state-specific, independent of transparent frame padding.

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
11 deep crouch
12 standing fire
13 crouch fire
14 hit
15 victory

## Crouch requirement
The crouch must reduce the active body collision height to roughly half the standing height. The head and shoulders must sit visibly below high hazards. The pose should look like a deliberate squat with bent knees and lowered torso, not a standing pose with slightly bent legs.

- Standing gameplay body: about 52×107 inside the 78×132 logical player body.
- Deep crouch body: about 64×62.
- Crouch display height: approximately 126–128 px versus ~198 px standing.
- Feet remain planted at the same ground anchor.
- Crouch fire uses a low muzzle position and may widen the visual frame without increasing the collision height.

## Movement feel
- Idle: subtle breathing/weight shift only.
- Run: four distinct phases with readable foot separation and upper-body lean.
- Jump: takeoff compression, rise stretch, compact apex, controlled fall.
- Land: visible one-beat compression before returning to locomotion.
- Hit: recoil away from damage source.
- Victory: upright, confident silhouette and raised arm/joystick pose.

## Fighting sheet
- Logical cell: 248×316.
- Fighting mode needs true idle, walk, jump, guard, deep crouch, punch, kick, hit and victory states.
- Duck input must resolve to `duck`, never substitute the guard pose.
- Crouch collision should be approximately 116×140 around the grounded centre point; standing collision remains near 90×250.

## Art direction
- Keep Cheeky recognisable and consistent across all frames.
- Strong readable silhouette at 1600×900 gameplay scale.
- Avoid tiny limb details that disappear during motion.
- Use a coherent C64/Amiga-inspired palette with modern high-definition edges rather than literal low-resolution blockiness.
- No baked shadows extending far outside the body; shadows belong to the runtime so collision and grounding remain predictable.

## Runtime metadata
Each animation state may define:
- `drawWidth`
- `drawHeight`
- `offsetX`
- `offsetY`
- `hitbox`
- optional `muzzle`
- optional `cameraKick`

The runtime must expose a state-profile lookup so rendering and collision derive from the same named state.
