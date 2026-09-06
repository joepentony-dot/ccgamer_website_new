# CCG Backend

This directory is the isolated foundation for a CCG-owned online-services backend. It is designed to reduce The Lost Sizzler's dependence on Supabase while preserving the existing local-first rule:

**offline game first, online enhancements second.**

Nothing in this service changes or deletes Supabase data. The existing Supabase project remains the source system until a later verified export/import and explicit human migration decision.

## Scope

The first service boundary covers only online features:

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

The initial service is deliberately small and fail-closed:

- Node.js HTTP service;
- PostgreSQL persistence boundary;
- JWT verification against an external JWKS endpoint;
- explicit CORS origin allowlist;
- `/health` for process liveness;
- `/ready` for database readiness;
- authenticated `/v1/me` identity proof;
- no gameplay data mutation routes yet.

This lets infrastructure, authentication and database ownership be tested before any Lost Sizzler client is pointed at the new backend.

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

Cloud saves include a revision and SHA-256 field so later synchronization can use compare-and-swap/idempotent rules instead of blindly overwriting newer local state.

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

## Supabase recovery lock

This backend work does not change the existing recovery rule. The prior one-shot Storage request for frozen enabled row 62 returned HTTP 402 before any bytes were downloaded. Do not retry that recovery merely because this service now exists. Recovery resumes only after concrete evidence that the restriction has cleared.

## Next implementation slice

The next safe slice is authenticated cloud-save read/write with:

- ownership by JWT subject;
- explicit revision matching;
- request-size limits;
- SHA-256 verification;
- idempotency;
- no remote write during ordinary offline gameplay;
- contract tests proving a failed online call cannot damage local state.
