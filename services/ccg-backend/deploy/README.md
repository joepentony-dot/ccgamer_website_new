# CCG Backend Render Staging

This directory defines the **non-production** Render validation environment for the CCG-owned backend. It is intentionally separate from the repository-root `render.yaml`, which continues to own the existing Lost Sizzler multiplayer service.

Nothing in this staging deployment authorises a production auth switch, a Supabase deletion, or a migration of live users.

## Blueprint

Use the custom Blueprint path:

```text
services/ccg-backend/deploy/render-staging.yaml
```

The Blueprint creates:

- `ccg-backend-staging` — free Node.js web service in Frankfurt;
- `ccg-backend-staging-db` — free PostgreSQL 17 database in Frankfurt;
- an internal `DATABASE_URL` connection between the service and database;
- explicit `0.0.0.0` service binding for Render only;
- local CCG authentication capability with registration/recovery disabled;
- manual deploys (`autoDeployTrigger: off`);
- no public PostgreSQL allowlist by default.

The free PostgreSQL tier is suitable only for temporary validation. It has provider-imposed lifetime/capacity limits and must not be treated as the production database.

## Signing keys

Generate a dedicated staging Ed25519 pair outside the repository:

```text
npm run auth:keygen -- --out-dir <private-directory> --key-id ccg-staging-ed25519-1
```

The generator creates:

```text
ccg-auth-private.jwk
ccg-auth-public.jwk
```

It refuses to overwrite either file. The private JWK is written with restrictive permissions where the operating system supports them and is never printed by the generator.

Do **not** commit these files.

Upload them to the Render web service as Secret Files using exactly these filenames:

```text
ccg-auth-private.jwk
ccg-auth-public.jwk
```

Render exposes them to the service at:

```text
/etc/secrets/ccg-auth-private.jwk
/etc/secrets/ccg-auth-public.jwk
```

The Blueprint already points the backend at those locations.

## First deployment

The first deployment must remain inert with these feature switches false:

```text
CCG_LOCAL_AUTH_REGISTRATION_ENABLED=false
CCG_LOCAL_AUTH_RECOVERY_ENABLED=false
CCG_LOST_SIZZLER_REALTIME_ENABLED=false
CCG_LOST_SIZZLER_COMMERCE_ENABLED=false
```

The free web-service start command runs the checksum-locked migration runner before starting the server:

```text
npm run migrate:apply && npm start
```

This avoids relying on Render's paid pre-deploy-command feature. Re-running unchanged migrations is a no-op and migration checksum drift is refused by the existing migration contract.

## Initial verification

Before importing any migrated account data, confirm:

1. `/health` returns HTTP 200 and reports local auth with registration/recovery/realtime/commerce disabled.
2. `/ready` returns HTTP 200 and reports the database available.
3. all eight repository migrations are present in `ccg_schema_migrations` with their expected checksums.
4. no production website configuration points at the staging URL.
5. the service can publish its public-only JWKS endpoint without exposing private JWK material.

## Migration validation gate

Only after the empty staging service is healthy:

1. create an authorised, repository-external migration bundle from the frozen Supabase source;
2. import it into the staging database only;
3. verify the frozen 33-account / 27-profile counts;
4. confirm all six auth-only accounts remain accounts without fabricated profile rows;
5. verify representative migrated bcrypt login, refresh, `/v1/me`, logout and session rotation/revocation;
6. verify cloud-save, Weekly Vault, progress and other owner-linked state against stable user IDs;
7. test password recovery and registration email delivery only after their staging switches and Resend configuration are explicitly enabled;
8. keep the production website on Supabase throughout this validation.

## Registration preference gate

Migration `008_registration_preferences.sql` stores recorded registration notification choices only during the pre-confirmation period. The confirmation transaction applies those choices to `ccg_profiles` and removes the temporary row.

Do not enable browser CCG registration until the staging registration flow proves:

- preference choices survive retry;
- a retry with no preference payload does not erase a recorded choice;
- confirmation applies the values atomically;
- registrations without a recorded choice retain unrecorded defaults;
- verification email delivery succeeds without leaking tokens or credentials.

## Production cut-over

A successful staging deployment is evidence only. It does not authorise production cut-over.

Production switching requires a separate explicit decision after migration parity, account/session tests, browser-provider tests and the relevant Lost Sizzler online/offline regressions are green. PR #1860 remains subject to its own deliberate merge gate.
