# Member Hub Phase 8 — automatic achievements

Phase 8 adds private activity badges to the CCG Member Hub.

## Badge groups

### Ratings

- First Score — rate 1 game
- Score Keeper — rate 10 games
- Archive Critic — rate 50 games
- Century Critic — rate 100 games

### Comments

- First Word — post 1 game comment
- Community Voice — post 10 game comments
- Community Regular — post 25 game comments

### Private library

- Collection Started — add 1 game
- Shelf Builder — keep 10 games
- Game Room — keep 50 games
- Archive Keeper — keep 100 games
- Mega Archive — keep 250 games

### Systems

- C64 Explorer — add a Commodore 64 game
- Amiga Explorer — add a Commodore Amiga game
- Commodore All-Rounder — add games from both systems

### Completionist compatibility

The three expanded account milestones are additional long-term goals. They do
not revoke or move the established Commodore Completionist reward: that reward
continues to require the original twelve Phase 8 milestones. Members who
already earned Completionist therefore keep it when the expanded milestones
are introduced.

### C64 Dungeon Carnage

The Member Hub appends the current active C64 Dungeon Carnage achievement
catalogue after the account milestones. The historical `LS_` badge keys and
the internal `lost-sizzler` database identifier remain in place only for
backwards compatibility, so members do not lose previously earned badge
history when the public game name changes.

The live profile catalogue follows the current five-depth campaign:

- The Threshold
- Iron Keep
- Moss Crypt
- Ember Depths
- Sigil Sanctum
- Keys of Iron, Bone and Ash
- the final Sigil ritual and escape

Unsupported or removed objectives do not remain as permanently locked profile
cards. Local Split Screen completion, retired online co-op, Weekly Vault
completion, Gilded Elf and the old rare-melee pickup badge are inactive in the
Member Hub catalogue.

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
5. `20260928174100_dungeon_carnage_profile_badge_catalog.sql`

The badge engine is duplicate-safe. Existing awards are preserved, and new
milestones use the existing `user_badges` uniqueness rule plus
`on conflict do nothing`. The Dungeon Carnage reconciliation deactivates
obsolete definitions instead of deleting historical award rows.
