# CCG Backend

This directory is the isolated foundation for a CCG-owned online-services backend. It is designed to reduce The Lost Sizzler's dependence on Supabase while preserving the existing local-first rule:

**offline game first, online enhancements second.**

Nothing in this service changes or deletes Supabase data. The existing Supabase project remains the source system until a later verified export/import and explicit human migration decision.

## Scope

The service boundary covers only online features:

- account authentication and identity verification;
- website profile reads;
- optional cloud-save synchronization;
- optional achievement synchronization;
- optional permanent collection/dossier synchronization;
- Weekly Vault state;
- ratings and feedback;
- multiplayer room state.

The following remain local/package responsibilities and must not be routed through this backend:

- normal game startup;
- Solo, Tutorial or 2P Split Screen;
- packaged Lost Sizzler music and ordinary media;
- local Save & Quit / Continue;
- local achievements and collection state;
- packaged C64 catalogue data.

## Current implementation

The service is deliberately small and fail-closed:

- Node.js HTTP service bound to `127.0.0.1` for reverse-proxy deployment;
- PostgreSQL persistence boundary;
- explicit CORS origin allowlist;
- selectable authentication mode: existing external-JWKS verification or opt-in CCG local authentication;
- migrated bcrypt password verification in local-auth mode;
- CCG Ed25519 access-token signing and verification;
- rotating refresh sessions whose raw refresh tokens are never stored in PostgreSQL;
- Secure, HttpOnly, SameSite=Strict refresh-token cookie boundary for the web login API;
- server-side login throttling;
- `/health` for process liveness;
- `/ready` for database readiness;
- authenticated `/v1/me` identity/profile proof;
- authenticated Lost Sizzler cloud-save GET/PUT;
- deterministic save-payload SHA-256 verification;
- 512 KiB canonical save-payload limit;
- compare-and-swap revision protection;
- idempotent exact retry handling;
- a passive browser-compatible cloud-sync provider in `client/lost-sizzler-cloud-sync.mjs`.

The live website and Lost Sizzler client are **not** pointed at local-auth mode yet. Supabase remains the source system until migration and cut-over gates are deliberately satisfied.

## Authentication modes

`CCG_AUTH_MODE` defaults to `external`.

### External mode

This preserves the original bootstrap contract and verifies bearer JWTs from an external JWKS endpoint.

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

Local mode is opt-in. It uses the CCG PostgreSQL account/session tables and CCG-owned Ed25519 signing keys.

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

Signing-key material is loaded from deployment-mounted files. Private JWK contents must never be committed to the repository, placed in browser code, or returned by an endpoint. The public JWK may be published through the local JWKS endpoint.

`CCG_ALLOWED_ORIGINS` is comma-separated when more than one explicit origin is needed. Wildcard CORS is intentionally unsupported.

`CCG_DB_SSL=disable` is intended only for a trusted local development PostgreSQL instance. Remote deployments default to TLS certificate validation.

## Local-auth HTTP API

These routes exist only when `CCG_AUTH_MODE=local`:

### `POST /v1/auth/login`

Accepts JSON containing `email` and `password`. Password verification occurs server-side against the migrated bcrypt hash. Successful login returns a short-lived CCG access token and places the rotating refresh token in a host-only `Secure; HttpOnly; SameSite=Strict` cookie scoped to `/v1/auth`.

The raw refresh token is intentionally omitted from the JSON response.

### `POST /v1/auth/refresh`

Uses the refresh cookie, revokes the previous refresh session and rotates to a new one. Reuse of the old refresh token is rejected.

### `POST /v1/auth/logout`

Revokes the current refresh session and expires the refresh cookie. Repeated logout remains safe and does not create a new session.

### `GET /.well-known/jwks.json`

Publishes only the CCG public Ed25519 signing key. The private JWK component is rejected by the local-auth key contract and is never returned.

### `GET /v1/me`

Uses whichever authentication mode the deployment selected. In local mode, a valid CCG access token must map to a currently active, non-revoked CCG session and a usable account before the profile is returned.

## Database

Apply migrations in numeric order to a new CCG-owned PostgreSQL database:

1. `migrations/001_initial.sql`
2. `migrations/002_account_profiles.sql`
3. `migrations/003_auth_sessions.sql`

The schema stores no game music/media blobs. Large downloadable assets belong in the website/package asset pipeline, not in the transactional database.

Authentication and profile state remain separate. This preserves valid auth-only accounts that have no profile row instead of inventing profile data during migration.

Cloud saves include a revision and SHA-256 field so synchronization uses compare-and-swap/idempotent rules instead of blindly overwriting newer local state.

## Cloud-save API

### GET `/v1/lost-sizzler/cloud-save`

Requires a valid bearer JWT. Identity is derived only from the verified JWT subject; clients cannot supply another user's ID.

The response is:

```json
{
  "save": null
}
```

when no remote save exists, or a save record containing `revision`, `payload`, `payload_sha256`, timestamps and an `idempotent` flag.

### PUT `/v1/lost-sizzler/cloud-save`

Requires `Content-Type: application/json` and a valid bearer JWT.

The body contract is:

```json
{
  "expected_revision": 0,
  "payload": {},
  "payload_sha256": "64 lowercase hex characters"
}
```

Rules:

- `expected_revision: 0` means the caller expects no remote save yet;
- a changed save must match the current remote revision before it can replace it;
- a stale revision returns HTTP 409 and cannot overwrite the newer remote state;
- an exact retry whose payload hash already matches the remote save is returned idempotently even if the first write already advanced the revision;
- the backend canonicalizes JSON object keys before hashing, so equivalent object key ordering has the same SHA-256;
- canonical payloads over 512 KiB are refused;
- malformed JSON, invalid hashes and non-object save payloads are refused before database mutation.

This API is an optional remote mirror. A failed PUT must never be interpreted by the eventual game adapter as permission to discard or replace the authoritative local save.

## Passive cloud-sync provider

`client/lost-sizzler-cloud-sync.mjs` is intentionally not loaded by the current Lost Sizzler runtime. It is the future CCG-backend provider boundary and requires explicit construction with:

- the backend base URL;
- an access-token callback;
- `fetch`;
- Web Crypto SHA-256 support.

It enforces HTTPS for remote deployments, with plain HTTP accepted only for localhost development. It does not persist credentials and sends bearer tokens only when `pull()` or `push()` is explicitly called.

Its contract tests prove:

- construction causes zero requests;
- browser-side canonical SHA-256 matches the server's canonical save hash;
- missing authentication fails before a request;
- network failure leaves caller-owned local save data unchanged;
- revision conflict leaves caller-owned local save data unchanged;
- successful mirroring also does not mutate the caller-owned local object.

This remains separate from the current Supabase-shaped `online-services-gate.js`. Existing multiplayer, Weekly Vault, feedback and rating code still expects a Supabase client and is therefore not redirected prematurely.

## Migration programme

Migration away from Supabase remains staged:

1. Build and validate this service independently.
2. Keep external-JWKS mode as the default while CCG local-auth mode is tested separately.
3. Export source account/profile data read-only and verify account/profile counts without printing credential material.
4. Import into a non-production CCG PostgreSQL database first.
5. Verify migrated bcrypt login and fresh CCG session issuance.
6. Add password recovery/email confirmation before production account cut-over.
7. Add a second provider implementation behind the website/Lost Sizzler online-service boundaries.
8. Keep Supabase and the CCG backend selectable during verification; never silently switch production users.
9. Once the Supabase Storage restriction has cleared, complete the frozen enabled-object recovery first: actual bytes, SHA-256 and decode/ffprobe evidence.
10. Run offline regressions separately from online account/cloud/multiplayer regressions.
11. Make production cut-over only after explicit human approval.

## Security boundary

The backend must never receive or ship:

- Supabase service-role keys in browser/package code;
- database superuser credentials in the game client;
- private JWT signing keys in the repository;
- raw refresh tokens in PostgreSQL;
- password hashes in API responses or logs;
- packaged media as database payloads;
- unauthenticated save/achievement mutation access.

Local CCG access tokens are signed server-side. Refresh tokens are stored only as SHA-256 proofs and are rotated on refresh. Logout revokes the active refresh session, and bearer verification also checks that the underlying session remains active.

Cloud-save writes additionally serialize against the authenticated user's database row before evaluating the current save revision. This prevents two concurrent writers for one user from both treating the same revision as current.

## Supabase recovery lock

This backend work does not change the existing recovery rule. The prior one-shot Storage request for frozen enabled row 62 returned HTTP 402 before any bytes were downloaded. Do not retry that recovery merely because this service now exists. Recovery resumes only after concrete evidence that the restriction has cleared.

## Next implementation slice

After the local-auth HTTP contract is green, the next safe slice is account recovery and migration verification:

- add one-time password-recovery issuance/consumption contracts without committing SMTP credentials;
- revoke existing CCG refresh sessions after password reset;
- add a dry-run source/destination account-count verifier for the current 33-account / 27-profile snapshot;
- add deployment migration/checksum tooling for a fresh CCG PostgreSQL instance;
- only after those gates are green, add an opt-in website client provider while leaving current production login unchanged;
- keep multiplayer, Weekly Vault, ratings and feedback behind later explicit online-only slices.
