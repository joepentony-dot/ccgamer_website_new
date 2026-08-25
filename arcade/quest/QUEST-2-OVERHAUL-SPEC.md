# Quest 2.0 Overhaul Spec — Balanced Pass

This document replaces the first Quest 2.0 excess-heavy pass while retaining the stronger runtime and stage identity work.

## Direction
Commodore Quest should feel richer than the original without becoming an obstacle conveyor belt. Variety, recognisable character art and readable reactions take priority over throwing more hazards at the player.

The existing `main` branch remains the stable reference build until this branch passes review and validation.

## Quality benchmark
The Bedroom remains the benchmark stage, but the benchmark is now restraint as well as variety:
- meaningful gaps between encounters;
- one readable decision at a time more often than stacked hazards;
- collectible lanes that are physically reachable with the normal jump arc;
- a crouch that looks natural and still has a useful reduced collision body;
- recognisable Cheeky artwork rather than generic replacement sprites;
- stage mechanics that add identity without constantly increasing screen density.

## Stage identity
1. The Bedroom — loading ritual / cassette machinery / bedroom traversal.
2. Electric Bead Run — short reaction challenge with more breathing room between beads.
3. The Budget Rack — shop/rack traversal with moving shelves, price traps and bargain-chain scoring.
4. 36% Conversion Bout — one-on-one fight with crouch, guard, counters and readable attack telegraphs.
5. Alien Formation — arcade shooter with destructible bunkers, wave pressure and formation events.
6. Christmas Morning — reverse-flow traversal with presents, wrapping hazards and moving household obstacles.
7. Dot-Maze Run — maze chase with power windows, role-based enemies and risk/reward routes.
8. Amiga Upgrade — disk/workbench world with bouncing media and window hazards.
9. Guru Meditation — final corruption stage with glitch zones and a multi-phase final boss.

## Player standard
Movement and collision remain driven from named sprite states. The active player art returns to the established raster Cheeky sheets. Crouch collision is reduced enough to pass overhead hazards, but the pose must remain recognisable and anatomically believable. The standard jump must reach every collectible lane.

## Pacing standard
- Main-stage encounter gaps are increased by roughly one third over the first Quest 2.0 pass.
- Stage durations and boss endurance are reduced.
- Ambient enemy spawning must not routinely overlap a freshly spawned stage pattern.
- Electric Bead Run is shorter and less densely populated.
- Difficulty should come from recognising what is approaching, not from simultaneous unavoidable threats.

## Presentation standard
Each major stage keeps its parallax treatment, environmental particles, foreground pass, colour treatment, bespoke hazards and stage-specific HUD cue. Camera shake and flashes stay restrained and tied to meaningful impacts.

## Compatibility
Existing achievements, remote background/music overrides and mobile landscape support remain operational unless a replacement is explicitly implemented.
