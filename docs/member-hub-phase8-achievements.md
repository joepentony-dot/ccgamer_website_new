# Member Hub Phase 8 — automatic achievements

Phase 8 adds private activity badges to the CCG Member Hub.

## Badge groups

### Ratings

- First Score — rate 1 game
- Score Keeper — rate 10 games
- Archive Critic — rate 50 games

### Comments

- First Word — post 1 game comment
- Community Voice — post 10 game comments

### Private library

- Collection Started — add 1 game
- Shelf Builder — keep 10 games
- Game Room — keep 50 games
- Archive Keeper — keep 100 games

### Systems

- C64 Explorer — add a Commodore 64 game
- Amiga Explorer — add a Commodore Amiga game
- Commodore All-Rounder — add games from both systems

## Behaviour

The website checks achievements after a successful rating or comment. The
Member Hub also checks after private-library changes and when the badge gallery
opens. Existing eligible members are therefore backfilled the first time they
visit the updated Member Hub.

Badges are private unless a member later enables badge visibility through the
separate optional public-profile controls.

## Deployment

Run these database migrations in order:

1. `20260805_member_hub_cloud_library.sql`
2. `20260805230000_member_hub_public_profiles_compatibility.sql`
3. `20260805_member_hub_deletion_tombstones.sql`
4. `20260805233000_member_badge_engine.sql`

The Phase 8 migration is idempotent. Duplicate awards are blocked by the
existing `user_badges` uniqueness rule and `on conflict do nothing`.
