# CCG Backend

This directory is the isolated foundation for a CCG-owned online-services backend. It is designed to reduce The Lost Sizzler's dependence on Supabase while preserving the existing local-first rule:

**offline game first, online enhancements second.**

Nothing in this service changes or deletes Supabase data. The existing Supabase project remains the production source system until a verified export/import, non-production validation and explicit human cut-over decision have all been completed.

## Scope

The backend covers online/account features only:

- account registration, email verification, login, refresh, logout and password recovery;
- website profile and member-owned state;
- optional cloud-save synchronization;
- optional achievement and collection synchronization;
- Weekly Vault state;
- ratings and feedback;
- multiplayer room/realtime state;
- permanent Lost Sizzler purchase entitlements.

The following remain local/package responsibilities and must not depend on this backend:

- normal game startup;
- Solo, Tutorial or 2P Split Screen;
- packaged Lost Sizzler music and ordinary media;
- local Save & Quit / Continue;
- local achievements and collection state;
- packaged C64 catalogue data.

## Current implementation

The service is deliberately fail-closed:

- Node.js HTTP service bound to `127.0.0.1` for reverse-proxy deployment;
- PostgreSQL persistence boundary;
- explicit CORS origin allowlist with no wildcard support;
- selectable authentication mode: external JWKS verification or opt-in CCG local authentication;
- migrated bcrypt password verification in local-auth mode;
- CCG Ed25519 access-token signing and verification;
- rotating refresh sessions whose raw refresh tokens are never stored in PostgreSQL;
- `Secure; HttpOnly; SameSite=Strict` refresh-token cookie boundary;
- server-side login throttling;
- opt-in account registration with Resend verification-email delivery;
- opt-in password recovery with one-way token proofs, Resend delivery and whole-account session revocation after reset;
- authenticated `/v1/me` profile retrieval;
- checksum-locked database migrations with explicit `--apply` writes;
- authenticated Lost Sizzler cloud-save, progression and online-service boundaries;
- optional Lost Sizzler realtime transport;
- optional PayPal-backed permanent purchase entitlement service;
- `/health` for process liveness and feature-state reporting;
- `/ready` for database readiness;
- passive browser clients that do not silently enable local authentication or persist raw credentials.

The live website and Lost Sizzler client are **not** switched to local-auth mode yet. Supabase remains authoritative in production until the migration/cut-over gates below are deliberately satisfied.

## Authentication modes

`CCG_AUTH_MODE` defaults to `external`.

### External mode

This preserves the existing external identity contract and verifies bearer JWTs from an external JWKS endpoint.

```text
DATABASE_URL=postgresql://...
CCG_DB_SSL=require
CCG_ALLOWED_ORIGINS=https://www.cheekycommodoregamer.co.uk
CCG_AUTH_MODE=external
CCG_JWT_ISSUER=https://identity.example.invalid/
CCG_JWT_AUDIENCE=ccg-backend
CCG_JWT_JWKS_URL=https://identity.example.invalid/.well-known/jwks.json
PORT=8787
```

### Local CCG mode

Local mode is opt-in. It uses CCG PostgreSQL account/session tables and deployment-mounted Ed25519 signing keys.

```text
DATABASE_URL=postgresql://...
CCG_DB_SSL=require
CCG_ALLOWED_ORIGINS=https://www.cheekycommodoregamer.co.uk
CCG_AUTH_MODE=local
CCG_LOCAL_AUTH_ISSUER=https://auth.cheekycommodoregamer.co.uk/
CCG_LOCAL_AUTH_AUDIENCE=ccg-backend
CCG_LOCAL_AUTH_PRIVATE_JWK_FILE=/run/secrets/ccg-auth-private.jwk
CCG_LOCAL_AUTH_PUBLIC_JWK_FILE=/etc/ccg/ccg-auth-public.jwk
CCG_LOCAL_AUTH_KEY_ID=ccg-ed25519-1
PORT=8787
```

Signing-key material is loaded from deployment-mounted files. Private JWK contents must never be committed to the repository, placed in browser code or returned by an endpoint. The public JWK may be exposed through the local JWKS endpoint.

`CCG_ALLOWED_ORIGINS` is comma-separated when multiple explicit origins are required. Plain HTTP is accepted only for loopback development origins. `CCG_DB_SSL=disable` is intended only for a trusted local development PostgreSQL instance; remote deployments default to TLS certificate validation.

## Local registration and verification

Registration remains disabled unless all required local-auth configuration is supplied.

```text
CCG_AUTH_MODE=local
CCG_LOCAL_AUTH_REGISTRATION_ENABLED=true
CCG_AUTH_EMAIL_FROM=CCG Accounts <accounts@your-domain.example>
CCG_AUTH_VERIFY_URL=https://www.cheekycommodoregamer.co.uk/account/verify-email
RESEND_API_KEY=...
```

`CCG_AUTH_VERIFY_URL` must be HTTPS and must not contain a query string or fragment. Verification tokens are appended server-side.

### `POST /v1/auth/register`

Accepts a bounded JSON request containing `email` and `password`. Registration creates the CCG account/identity through the local registration service and sends the verification token through Resend. The endpoint is unavailable when registration is disabled.

### `POST /v1/auth/confirm-email`

Consumes the verification token and confirms the local account. Verification remains separate from login/session issuance.

## Local login/session API

These routes exist when `CCG_AUTH_MODE=local`.

### `POST /v1/auth/login`

Accepts JSON containing `email` and `password`. Password verification occurs server-side against the migrated bcrypt hash. A successful login returns a short-lived CCG access token and places the rotating refresh token in a host-only `Secure; HttpOnly; SameSite=Strict` cookie scoped to the auth API. The raw refresh token is never returned in JSON.

### `POST /v1/auth/refresh`

Uses the HttpOnly refresh cookie, revokes the previous refresh session and rotates to a new one. Reuse of an old refresh token is rejected.

### `POST /v1/auth/logout`

Revokes the current refresh session and expires the refresh cookie. Repeated logout is safe and does not create a new session.

### `GET /.well-known/jwks.json`

Publishes only the CCG public Ed25519 signing key. Private JWK material is rejected by the local-auth key contract.

### `GET /v1/me`

Returns the authenticated CCG user ID and profile. In local mode, the access token must map to a currently active, non-revoked CCG session and usable account. Accounts without a profile row remain valid accounts and return no fabricated profile.

## Password recovery

Password recovery is implemented but **disabled by default**. It can be enabled only with local auth and an actual server-side Resend delivery path:

```text
CCG_AUTH_MODE=local
CCG_LOCAL_AUTH_RECOVERY_ENABLED=true
CCG_AUTH_EMAIL_FROM=CCG Accounts <accounts@your-domain.example>
CCG_AUTH_RECOVERY_URL=https://www.cheekycommodoregamer.co.uk/account/reset-password
RESEND_API_KEY=...
```

`CCG_AUTH_RECOVERY_URL` must be HTTPS without a query string or fragment. Recovery tokens are appended server-side and the raw token is never stored in PostgreSQL.

### `POST /v1/auth/recover`

Accepts an email address and returns the same accepted response shape whether or not a usable account exists. This prevents account enumeration. Confirmed usable accounts receive a time-limited reset link through Resend. Request throttling uses a one-way fingerprint rather than storing raw client-identifying request material.

### `POST /v1/auth/reset-password`

Accepts the recovery token and a new password. A successful reset replaces the bcrypt password hash, consumes/inactivates recovery tokens and revokes all active CCG refresh sessions for the account. The browser must log in again with the new password.

The passive `client/ccg-auth-client.mjs` exposes registration, confirmation, login, refresh, logout, `/v1/me`, recovery-request and password-reset calls. It holds access-token state in memory only and never reads or writes `localStorage`, `sessionStorage` or `document.cookie` for credentials.

## Database

Apply migrations in numeric order to a new CCG-owned PostgreSQL database:

1. `migrations/001_initial.sql`
2. `migrations/002_account_profiles.sql`
3. `migrations/003_auth_sessions.sql`
4. `migrations/004_profile_owned_state.sql`
5. `migrations/005_online_service_state.sql`

The schema stores no game music/media blobs. Large downloadable assets belong in the website/package asset pipeline, not the transactional database.

Authentication and profile state remain separate. This preserves valid auth-only accounts with no profile row instead of inventing profile data during migration.

The destination structures preserve the member-owned Supabase state needed for cut-over, including profile favourites, game-library/list state, top picks, badges, roles, email subscriptions, legacy comments, Weekly Vault data, Lost Sizzler saves/progression and other online-service state represented by the migrations.

The initial CCG user ID remains the existing Supabase Auth UUID represented as text. Keeping this ownership key stable allows migrated profile/member rows and Lost Sizzler state to stay attached to the same account when authentication later moves away from Supabase.

## Read-only source inventory — 6 September 2026

The Supabase source was inspected read-only before defining the destination schema. No source row was changed.

Current account/profile snapshot:

- 33 Auth users / 33 email identities;
- 33 password-backed accounts;
- 31 confirmed-email accounts;
- 27 profile rows;
- 6 valid auth-only accounts with no profile row.

Currently populated member-owned source tables include:

- `profile_favourites`: 15 rows;
- `profile_game_library`: 3 rows;
- `profile_top_picks`: 7 rows;
- `user_badges`: 101 rows;
- `user_roles`: 1 row;
- `email_subscriptions`: 5 rows;
- `ccq_weekly_attempts`: 6 rows;
- `lost_sizzler_solo_saves`: 2 rows;
- legacy `comments`: 2 rows.

The sanitized migration snapshot intentionally contains counts and structural facts only. It does not contain user IDs, email addresses, password hashes, session tokens, recovery tokens or unsubscribe bearer tokens.

## Migration tooling

The migration runner supports:

```text
npm run migrate:check
npm run migrate:apply
```

`migrate:check` performs no schema writes. `migrate:apply` is the explicit write path and checksum-locks the numbered migration sequence in `ccg_schema_migrations`, serializes execution and refuses drift or unknown ledger entries.

The source/destination migration tooling also includes:

```text
npm run migration:snapshot:check
npm run migration:import
npm run migration:verify
npm run migration:export
```

The repository snapshot is sanitized. Sensitive export/import material must be handled outside repository history. The verifier is designed to report count/ownership mismatches without printing credential or bearer-token material.

## Cloud saves and local-first behaviour

`GET /v1/lost-sizzler/cloud-save` and `PUT /v1/lost-sizzler/cloud-save` require authenticated identity. Clients cannot provide another user's ID.

Cloud saves use revision, SHA-256, compare-and-swap and idempotent-retry rules. Canonical payloads over 512 KiB are refused. A stale revision cannot overwrite newer remote state.

The backend remains an optional remote mirror. A failed network request, rejected write or unavailable backend is never permission to discard the authoritative local Lost Sizzler save.

`client/lost-sizzler-cloud-sync.mjs` is passive: construction performs no request, credentials are not persisted, and bearer tokens are sent only when a pull or push is explicitly requested.

## Migration programme and cut-over gate

Migration away from Supabase remains staged:

1. Keep current production Supabase behaviour unchanged while this backend is developed.
2. Validate the CCG PostgreSQL migrations and contracts independently.
3. Preserve the read-only 33-account / 27-profile source inventory and six auth-only accounts.
4. Import the authorized migration bundle into a **non-production** CCG PostgreSQL database first.
5. Verify source/destination counts, stable UUID ownership and representative migrated bcrypt login.
6. Verify registration, verification, login, refresh, `/v1/me`, logout, password recovery and session revocation in non-production local-auth mode.
7. Exercise the passive browser provider in parallel without silently replacing the production provider.
8. Verify online-service state and permanent purchase entitlements independently from offline game regressions.
9. Keep Supabase and the CCG backend selectable until the full cut-over checklist is green.
10. Make production cut-over only after explicit human approval.

This means the backend is technically capable of storing CCG profiles and issuing CCG-owned login sessions, but **production users are not yet migrated away from Supabase**.

## Security boundary

The backend must never receive or ship:

- Supabase service-role keys in browser/package code;
- database superuser credentials in the game client;
- private JWT signing keys in repository source;
- raw refresh tokens in PostgreSQL;
- raw password-recovery tokens in PostgreSQL;
- password hashes in API responses or logs;
- unsubscribe bearer tokens in migration diagnostics/logs;
- packaged media as database payloads;
- unauthenticated save/achievement mutation access.

Local CCG access tokens are signed server-side. Refresh tokens and password-recovery tokens are stored only as one-way proofs. Logout and password reset revoke server-side sessions as required.

## Supabase recovery lock

This backend work does not change the frozen Storage-recovery rule. The prior one-shot Storage request for frozen enabled row 62 returned HTTP 402 before any bytes were downloaded. **Do not retry that recovery merely because the CCG backend now exists.** Recovery resumes only after concrete evidence that the Supabase restriction/quota problem has cleared.

## Next implementation slice

The next safe step is **non-production migration and cut-over verification**, not production switching:

- import the authorized account/profile/member-owned migration bundle into a non-production CCG PostgreSQL database;
- prove destination counts against the sanitized 33-account / 27-profile snapshot;
- prove all six auth-only accounts remain accounts without fabricated profiles;
- verify representative migrated bcrypt login and CCG session issuance;
- exercise registration/verification and password recovery through the configured Resend boundary;
- verify `/v1/me`, refresh, logout, recovery-triggered session revocation and passive browser-provider behaviour;
- verify Lost Sizzler cloud/progression/realtime/purchase state against the same stable user IDs;
- only then prepare an explicit production cut-over checklist while leaving current Supabase login untouched until approved.
