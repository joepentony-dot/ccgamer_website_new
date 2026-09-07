# Supabase retirement inventory

Read-only source inventory captured on 6 September 2026 for the staged CCG-backend migration.

This document is an inventory and migration-planning artifact only. It does not authorize deletion, alteration, disabling, export cleanup, Storage recovery retries, or production cut-over. Supabase remains the source system until destination verification and an explicit later human decision.

## Migration rules

- Preserve existing account UUID ownership keys when moving to CCG PostgreSQL.
- Never place password hashes, bearer tokens, refresh tokens, recovery tokens, unsubscribe tokens, service-role credentials, or private signing keys in this document or repository diagnostics.
- Never infer Storage duplicate identity from byte size.
- Storage recovery remains separately frozen: enabled objects first, actual downloaded bytes, SHA-256, ffprobe/decode, then disabled counterparts.
- The prior enabled-row-62 Storage request returned HTTP 402 before any object bytes were recovered; this inventory does not change that blocker or authorize another Storage request.
- Offline/package operation remains independent of all services below.

## Account and member state

These are migration-critical because they represent login identity, profile state, or existing user-owned records.

| Source | Rows | Destination/status |
| --- | ---: | --- |
| Supabase Auth users | 33 | `ccg_auth_accounts`; preserve existing user UUIDs |
| Email identities | 33 | `ccg_auth_identities` |
| Profiles | 27 | `ccg_profiles`; retain six valid auth-only accounts without inventing profiles |
| `profile_favourites` | 15 | destination structure exists |
| `profile_game_library` | 3 | destination structure exists, including soft-delete state |
| `profile_top_picks` | 7 | destination structure exists |
| `user_badges` | 101 | destination structure exists |
| `user_roles` | 1 | destination structure exists |
| `email_subscriptions` | 5 | destination structure exists; unsubscribe secrets must never appear in logs |
| `comments` | 2 | destination structure exists for the legacy account comments |
| `ccq_weekly_attempts` | 6 | destination structure exists |
| `lost_sizzler_solo_saves` | 2 | destination cloud-save structure exists with source-compatible fields plus SHA-256 integrity |

The sanitized migration snapshot and destination verifier remain the acceptance authority for counts and ownership relationships. Supabase sessions are not migration data: successful cut-over issues fresh CCG sessions.

## Currently empty member-facing structures

The following source tables contain zero rows today. Zero rows mean there is no historical payload to copy, but the feature contract still needs an explicit retain/replace/retire decision before Supabase can be considered fully retired.

| Source | Rows | Classification |
| --- | ---: | --- |
| `favourites` | 0 | legacy favourite model; do not confuse with populated `profile_favourites` |
| `quiz_scores` | 0 | future/legacy member score state |
| `achievements` | 0 | legacy website achievement model; Lost Sizzler local achievements remain local-first |
| `stats` | 0 | optional member activity state |
| `ratings` | 0 | legacy rating model |
| `challenges` | 0 | generic challenge definitions |
| `user_challenge_progress` | 0 | generic challenge progress |
| `comment_reports` | 0 | moderation workflow |
| `supporter_links` | 0 | optional member links |
| `game_comments` | 0 | newer game-comment model |
| `game_ratings` | 0 | newer game-rating model |
| `community_activity` | 0 | optional activity feed |
| `user_soft_bans` | 0 | moderation state; destination auth/profile ban enforcement must remain authoritative |
| `member_submissions` | 0 | moderation/member-submission workflow |
| `game_feedback_replies` | 0 | admin reply/email-delivery workflow |

No destination rows should be fabricated for these tables. A later implementation may create compatible empty structures when the corresponding feature is moved, or formally retire a redundant legacy model after source-code usage is audited.

## Populated service, catalogue, moderation and historical data

These are not all required to authenticate a user, but they must be deliberately accounted for before final Supabase retirement.

| Source | Rows | Treatment |
| --- | ---: | --- |
| `_old_game_ratings` | 2 | historical data; preserve/export before any retirement decision |
| `badge_definitions` | 89 | catalogue/reference data; map separately from user badge ownership |
| `badges` | 7 | reference/legacy badge data; classify against `badge_definitions` |
| `game_releases` | 1 | site publishing/release state; outside login cut-over |
| `content_announcements` | 16 | notification audit/history; preserve separately |
| `arcade_assets` | 72 | Storage metadata; governed by the frozen Storage recovery programme, not auth migration |
| `ccq_weekly_leaderboard` | 2 | public projection derived from Weekly Vault activity |
| `ccq_weekly_result_deliveries` | 2 | delivery history; preserve until Weekly Vault replacement is verified |
| `game_feedback` | 7 | Lost Sizzler feedback history; migrate/preserve before feedback service cut-over |
| `lost_sizzler_collectible_effects` | 52 | game/service reference data; classify with Lost Sizzler online service replacement |
| `game_play_events` | 926 | telemetry/history; not required for login, but preserve/export before source retirement |
| `lost_sizzler_request_buckets` | 83 | one-way rate-limit fingerprints; operational state, not user profile history |

Administrative audit tables currently contain no rows and should remain a separate operational-retention decision rather than being folded into user profile migration.

## Active Supabase Edge Functions

Read-only function inventory on the same date:

| Function | Current role in retirement plan |
| --- | --- |
| `ccq-weekly-challenge` | CCG Weekly Vault API and passive Lost Sizzler compatibility mapping now exist; production remains on Supabase until pilot/regression acceptance |
| `ccq-weekly-results` | replace result/delivery path before Supabase retirement |
| `lost-sizzler-feedback` | CCG feedback API/client exists; preserve/migrate history and verify the runtime call path before production cut-over |
| `lost-sizzler-admin-feedback` | replace admin reply/moderation path if retained |
| `send-new-game-notification` | website publishing/notification service; separate from Lost Sizzler login migration |
| `search-console-opportunities` | website/search tooling; separate from Lost Sizzler and account cut-over |

No Supabase Edge Function was changed or redeployed during this inventory/migration checkpoint.

## Lost Sizzler compatibility checkpoint

The CCG backend now includes:

- `client/lost-sizzler-supabase-compat.mjs`, a passive compatibility bridge that maps the current Weekly Vault function shape and multiplayer channel shape onto CCG-owned services;
- `client/lost-sizzler-ccg-pilot.mjs`, an explicit installer for controlled pilots only;
- exact rollback behavior that restores any prior `ccgSupabase` property descriptor when a deliberate replacement pilot is uninstalled;
- local failure for unsupported legacy Edge Function names rather than accidental forwarding.

Neither module installs itself on import. The live website still defaults to the existing Supabase path, and normal Solo/offline operation remains independent of both providers.

## Authentication cut-over boundary

The CCG backend now has an independent local-auth core, provider-neutral browser auth client, Lost Sizzler compatibility bridge and explicit pilot installer, but production remains on the existing source system.

A safe account cut-over requires all of the following before changing the live website:

1. Import the sensitive account/profile bundle only into a non-production CCG PostgreSQL database.
2. Verify all 33 account identities and the 27 profile rows against the sanitized baseline without logging password hashes.
3. Prove representative migrated bcrypt passwords authenticate and issue fresh CCG sessions.
4. Verify the six auth-only accounts remain valid without fabricated profile rows.
5. Verify member-owned rows remain attached to the same user UUIDs.
6. Select and configure a CCG-controlled recovery-email delivery path before exposing password recovery.
7. Run the explicit CCG pilot in parallel with existing production auth; do not silently switch users.
8. Verify `/v1/me`, refresh rotation, logout/revocation and relevant member-owned reads/writes against the non-production destination.
9. Run Lost Sizzler Weekly Vault and multiplayer regressions through the CCG compatibility bridge while preserving the Supabase rollback route.
10. Perform a deliberate production cut-over only after human approval.

## Storage remains independent

The account/backend migration does not unblock Supabase Storage recovery. No Storage request should be made merely because database/auth migration work is progressing. The row-62 HTTP 402 blocker remains the controlling evidence until a concrete external signal shows that restriction has cleared.
