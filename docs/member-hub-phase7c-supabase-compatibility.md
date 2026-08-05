# Member Hub Phase 7C — Supabase compatibility

Phase 7C reconciles the Member Hub public-profile and activity functions with
the historical Supabase schemas used by the live CCG project.

## Why this phase exists

The deployed project has used more than one community schema over time. In
particular, badge records may use:

- `badge_key` with `assigned_at`
- `badge_code` with `awarded_at`
- `badge_id` with `earned_at` and a `badge_definitions` lookup

Rating and comment tables may also identify their owner with `user_id`,
`profile_id` or another established owner column.

The Phase 7C migration detects the deployed columns at runtime and exposes one
stable result shape to the website. It does not rename or discard historical
columns.

## Deployment

Run this file in Supabase SQL Editor after the cloud-library migration:

`supabase/migrations/20260805230000_member_hub_public_profiles_compatibility.sql`

The migration is idempotent and can be run after an earlier public-profile
attempt stopped part-way through.

The private account library and deletion tombstones remain independent of the
optional public-profile feature.

## Verification

Run:

`supabase/diagnostics/member_hub_schema_report.sql`

The report is read-only. Its final result should show:

- `profile_game_library`
- `member_submissions`
- `get_public_member_profile(text)`
- `get_my_member_activity(integer)`
- `deletion_tombstones_ready = true`

Public profiles remain private by default until a member explicitly enables
their public-profile switch.
