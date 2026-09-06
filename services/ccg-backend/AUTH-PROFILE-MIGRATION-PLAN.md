# CCG Auth and Profile Migration Plan

## Goal

Move CCG website account identity and profile ownership away from Supabase without forcing existing members to create new accounts or discarding profile data.

This document is a migration contract only. It does not switch production authentication and does not mutate Supabase.

## Read-only source snapshot — 6 September 2026

The current Supabase project was inspected read-only.

- `auth.users`: 33 users
- `auth.identities`: 33 identities
- identity providers: 33 `email`
- password-backed users: 33
- confirmed-email users: 31
- anonymous users: 0
- deleted auth users: 0
- `public.profiles`: 27 rows
- auth users with a matching profile: 27
- auth-only users with no `public.profiles` row: 6
- confirmed auth-only users: 5

The 6 auth-only users must be preserved as accounts. Migration must **not** invent profile records for them merely to make row counts match.

## Existing password compatibility

Supabase Auth stores password hashes in `auth.users.encrypted_password`. Supabase documents these hashes as bcrypt. The CCG migration must copy hashes only through a privileged server-side migration path and must never expose them to browser code, logs, support output or client diagnostics.

The CCG account schema accepts compatible bcrypt hashes so existing members can retain their current password after cut-over. Plaintext passwords are never required for migration.

A password hash import is not authorised merely because this schema exists. It requires a deliberate migration run, encrypted transport, destination verification and a final account-count/hash-format audit.

## Stable ownership

The current Supabase `auth.users.id` value becomes the stable CCG `user_id` string. Preserving it avoids breaking ownership relationships for:

- profiles;
- Lost Sizzler Solo cloud saves;
- Weekly Vault attempts;
- achievements and permanent collection state;
- ratings, comments and feedback ownership where applicable;
- favourites, top picks and personal game-library rows.

No remapping to new arbitrary user IDs should occur during initial migration.

## Destination tables

### `ccg_auth_accounts`

Stores account-level identity state:

- stable `user_id`;
- email;
- server-only password hash and algorithm marker;
- email confirmation time;
- last sign-in time;
- ban/disable/delete state;
- source provider and source metadata for migration provenance.

### `ccg_auth_identities`

Stores provider identity mapping independently of profile data. The current source has one email identity per user, but the table remains provider-neutral for future changes.

### `ccg_profiles`

Mirrors the current `public.profiles` fields needed by the CCG website, including:

- username/display name/profile text;
- C64/Amiga preference;
- role/admin/banned state;
- notification preferences;
- public-profile/list settings;
- Hall of Fame/supporter fields;
- Weekly Challenge notification preference.

Profile data and login credentials remain separate by design.

## Login without Supabase

Migrating profiles alone is not sufficient for independent login. The complete cut-over requires all of the following:

1. CCG-owned account/profile tables populated and verified.
2. Existing bcrypt password hashes migrated server-to-server, or a controlled password-reset fallback for any account that cannot be migrated.
3. A CCG authentication service that verifies passwords server-side.
4. CCG-issued access and refresh tokens with rotation/revocation.
5. Login rate limiting and credential-stuffing protection.
6. Email confirmation, password reset and account recovery flows using CCG-controlled email delivery.
7. Website and Lost Sizzler clients changed to the CCG provider only after parallel verification.
8. Supabase kept available during rollback/verification until explicit final approval.

Once these gates are complete, members can sign in through the CCG service without Supabase being involved in normal login.

## Security rules

- Never expose `password_hash` through an API response.
- Never write password hashes to application logs.
- Never put database credentials or signing keys in browser/package code.
- Do not migrate current refresh tokens or active Supabase sessions as CCG sessions.
- Issue fresh CCG sessions after the user authenticates against the new service.
- Preserve ban/disable state during migration.
- Treat email as case-insensitive for account uniqueness.
- Keep profile storage separate from authentication credentials.

## Migration verification gate

Before any production cut-over:

1. Export source account/profile data read-only.
2. Record source counts without printing credential material.
3. Import into a non-production CCG PostgreSQL database first.
4. Verify 33/33 account ownership rows and 27/27 profile rows for the current snapshot.
5. Verify exactly 6 auth-only accounts remain profile-less unless they later create profiles legitimately.
6. Verify every imported password hash has an approved format without printing the hash itself.
7. Test existing-password login against disposable test accounts or controlled migration fixtures.
8. Verify banned/disabled users cannot obtain sessions.
9. Verify password reset invalidates prior refresh sessions.
10. Run website and Lost Sizzler account regressions before switching production traffic.

Supabase remains the source system until this entire programme is completed and explicitly approved.
