# Member Hub Phase 12 — deployment health

Phase 12 adds an administrator-only report that checks which Member Hub
components are present in the live Supabase project.

## Administrator page

The report is available at:

`/admin/member-hub-health.html`

The page remains concealed until the shared administrator guard grants access
to an `admin` or `superadmin` account.

## What it checks

The report checks database structure rather than member data:

- account profile foundation
- private account-backed game library
- row-level security on private library records
- deletion tombstone column and index
- Phase 7C adaptive rating, comment and badge readers
- private member-submissions table
- visitor public-profile RPC
- owner-only public-profile preview RPC
- Phase 8 achievement catalogue and award functions
- administrator submission-list and review-update functions

Each component displays Ready or Missing. Missing components are grouped into an
ordered list of SQL migration files that can be copied for deployment work.

## Database deployment

Run this migration last:

`supabase/migrations/20260806003000_member_hub_health_check.sql`

The complete Member Hub deployment sequence for the currently unapplied phases
is:

1. `20260805230000_member_hub_public_profiles_compatibility.sql`
2. `20260805233000_member_badge_engine.sql`
3. `20260805234500_member_public_profile_preview.sql`
4. `20260806000500_member_submissions_admin_inbox.sql`
5. `20260806003000_member_hub_health_check.sql`

The cloud-library and deletion-tombstone migrations precede these files. The
health page does not apply migrations itself and cannot edit member records.
