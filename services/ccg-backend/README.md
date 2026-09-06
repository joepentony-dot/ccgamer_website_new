# CCG Backend

This directory is the isolated foundation for a CCG-owned online-services backend. It is designed to reduce The Lost Sizzler's dependence on Supabase while preserving the existing local-first rule:

**offline game first, online enhancements second.**

Nothing in this service changes or deletes Supabase data. The existing Supabase project remains the source system until a later verified export/import and explicit human migration decision.

## Scope

The service boundary covers only online features:

- account identity verification;
- optional cloud-save synchronization;
- optional achievement synchronization;
- optional permanent collection/dossier synchronization;
- Weekly Vault state;
- ratings and feedback;
- multiplayer room state.

The following must remain local/package responsibilities and must not be routed through this backend:

- normal game startup;
- Solo, Tutorial or 2P Split Screen;
- packaged Lost Sizzler music and ordinary media;
- local Save & Quit / Continue;
- local achievements and collection state;
- packaged C64 catalogue data.

## Current implementation

The service remains deliberately small and fail-closed:

- Node.js HTTP service;
- PostgreSQL persistence boundary;
- JWT verification against an external JWKS endpoint;
- explicit CORS origin allowlist;
- `/health` for process liveness;
- `/ready` for database readiness;
- authenticated `/v1/me` identity proof;
- authenticated Lost Sizzler cloud-save GET/PUT;
- deterministic save-payload SHA-256 verification;
- 512 KiB canonical save-payload limit;
- compare-and-swap revision protection;
- idempotent exact retry handling.

The game client is **not** pointed at this service yet. Supabase remains selectable/source-of-record until later migration and cut-over gates are deliberately satisfied.

## Required environment

```text
DATABASE_URL=postgresql://...
CCG_DB_SSL=require
CCG_ALLOWED_ORIGINS=https://www.cheekycommodoregamer.co.uk
CCG_JWT_ISSUER=https://identity.example.invalid/
CCG_JWT_AUDIENCE=ccg-backend
CCG_JWT_JWKS_URL=https://identity.example.invalid/.well-known/jwks.json
PORT=8787
```

`CCG_ALLOWED_ORIGINS` is comma-separated when more than one explicit origin is needed. Wildcard CORS is intentionally unsupported.

`CCG_DB_SSL=disable` is intended only for a trusted local development PostgreSQL instance. Remote deployments default to TLS certificate validation.

## Database

Apply `migrations/001_initial.sql` only to a new CCG-owned PostgreSQL database. The migration creates the first normalized online-service tables for Lost Sizzler.

The schema deliberately stores no game music/media blobs. Large downloadable assets belong in the website/package asset pipeline, not in the transactional database.

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

## Migration programme

Migration away from Supabase must remain staged:

1. Build and validate this service independently.
2. Select/host the PostgreSQL and identity components.
3. Add read/write API contracts with concurrency and ownership tests.
4. Add a second provider implementation behind Lost Sizzler's existing online-services gate.
5. Keep Supabase and the CCG backend selectable during verification; never silently switch production users.
6. Once Supabase Storage restriction has cleared, complete the frozen enabled-object recovery first: actual bytes, SHA-256 and decode/ffprobe evidence.
7. Export Supabase database data read-only and produce record counts/hashes where practical.
8. Import into the CCG database without deleting or modifying the Supabase source.
9. Run offline regressions separately from online account/cloud/multiplayer regressions.
10. Make the production cut-over only after explicit human approval.

## Security boundary

The backend must never receive or ship:

- Supabase service-role keys in browser/package code;
- database superuser credentials in the game client;
- private JWT signing keys in the repository;
- packaged media as database payloads;
- unauthenticated save/achievement mutation access.

JWT verification is performed server-side using public JWKS material. Database credentials remain server-only.

Cloud-save writes additionally serialize against the authenticated user's database row before evaluating the current save revision. This prevents two concurrent writers for one user from both treating the same revision as current.

## Supabase recovery lock

This backend work does not change the existing recovery rule. The prior one-shot Storage request for frozen enabled row 62 returned HTTP 402 before any bytes were downloaded. Do not retry that recovery merely because this service now exists. Recovery resumes only after concrete evidence that the restriction has cleared.

## Next implementation slice

After the cloud-save contract is green, the next safe slice is the provider/client boundary and account-state synchronization:

- add an isolated CCG-backend provider without changing the default production provider;
- prove offline startup never constructs or contacts it;
- prove failed cloud synchronization cannot mutate local Save & Quit / Continue state;
- add achievement and permanent-collection synchronization with idempotent ownership rules;
- keep multiplayer, Weekly Vault, ratings and feedback behind later explicit online-only slices.
