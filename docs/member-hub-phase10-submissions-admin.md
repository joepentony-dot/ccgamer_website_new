# Member Hub Phase 10 — administrator submissions inbox

Phase 10 adds an administrator review page for the private submission forms
already present in the Member Hub.

## Submission types

- missing game suggestions
- corrections to existing game information
- website feedback

The inbox does not edit `games/games.json`, generate game pages or publish any
member-supplied content automatically.

## Administrator workflow

The new page is:

`/admin/member-submissions.html`

It is restricted to `admin` and `superadmin` roles. The interface remains
concealed until the shared role guard grants access.

Administrators can:

- search submissions by subject, message, game or member
- filter by submission type and review status
- move a submission between New, Reviewing, Resolved and Declined
- store private administrator notes
- open the referenced game page in a separate tab

Administrator notes are never returned by the member-facing submission history.

## Database deployment

Run after the Phase 7C public-profile compatibility migration:

`supabase/migrations/20260806000500_member_submissions_admin_inbox.sql`

The migration adds internal review fields and two administrator-only RPCs:

- `admin_list_member_submissions`
- `admin_update_member_submission`

Both functions independently verify that the signed-in profile has an
`admin` or `superadmin` role.
