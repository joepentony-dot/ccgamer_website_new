# Member Hub Phase 9 — public-profile preview

Phase 9 lets a signed-in member inspect the exact privacy-filtered public
profile payload before publishing it.

## Owner preview

The Member Hub now summarises which fields are selected for visitors:

- public username
- public bio
- Top Picks visibility
- achievement badge visibility
- the single deliberately shared game list

The summary also states which information is never included: email address,
private notes, unshared lists, private activity history and account controls.

The owner preview page uses:

`/community/member.html?preview=1`

That route calls `get_my_public_profile_preview()` and therefore requires the
signed-in account. Anonymous visitors cannot call the owner-preview RPC.

## Public badge details

Public badges use the Phase 8 catalogue to display a name, description and
earned month rather than exposing only a database code.

## Database deployment

Run the migrations in this order:

1. `20260805230000_member_hub_public_profiles_compatibility.sql`
2. `20260805233000_member_badge_engine.sql`
3. `20260805234500_member_public_profile_preview.sql`

The public profile page remains `noindex,follow` while the feature is being
established. Profiles remain private until the member explicitly enables the
public-profile switch and saves their settings.
