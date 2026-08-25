# Quest 2.0 Overhaul Spec

This document replaces the legacy conservative rebuild brief for the overhaul branch.

## Non-negotiable direction
Commodore Quest is now a full redesign rather than a balance-preserving refresh. The existing main branch remains the stable reference build. Quest 2.0 may change movement, collision, level structure, stage hazards, bosses, enemy behaviours, presentation, camera feedback and pacing where that improves the game.

## Quality benchmark
The Bedroom is the first full benchmark stage. It must establish the new standard: richer movement, readable deep crouch, layered environment, stage-specific interactions, multiple enemy/hazard behaviours, stronger feedback and a boss with mechanics that belong to the stage rather than a generic projectile pattern.

## Stage identity
1. The Bedroom — loading ritual / cassette machinery / bedroom traversal.
2. Electric Bead Run — high-speed reaction challenge with directional bead patterns and destructible interruptions.
3. The Budget Rack — shop/rack traversal with moving shelves, price traps and bargain-chain scoring.
4. 36% Conversion Bout — expanded one-on-one fight with true crouch, guard, counters and readable attack telegraphs.
5. Alien Formation — polished arcade shooter with destructible bunkers, wave pressure and formation events.
6. Christmas Morning — reverse-flow traversal with presents, wrapping hazards and moving household obstacles.
7. Dot-Maze Run — faster maze chase with power windows, role-based enemies and risk/reward routes.
8. Amiga Upgrade — disk/workbench world with bouncing media, window hazards and platform-state changes.
9. Guru Meditation — final corruption stage with glitch zones, moving safe lanes and multi-phase final boss.

## Player standard
Movement and collision are driven from named sprite states. Deep crouch is a real gameplay state with a much shorter collision body. Landing and damage have visible recovery beats. Shots use state-specific muzzle heights.

## Presentation standard
Each major stage receives its own parallax treatment, environmental particles, foreground pass, colour treatment, bespoke hazard silhouettes/behaviours and stage-specific HUD cue. Camera shake and flashes are restrained and tied to meaningful impacts.

## Compatibility
Existing achievements, remote background/music overrides and mobile landscape support should remain operational unless a replacement is explicitly implemented.
