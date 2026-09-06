import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';

const blueprint = await fs.readFile(new URL('../deploy/render-staging.yaml', import.meta.url), 'utf8');
const rootRender = await fs.readFile(new URL('../../../render.yaml', import.meta.url), 'utf8');

assert.match(blueprint, /name:\s+ccg-backend-staging\b/);
assert.match(blueprint, /name:\s+ccg-backend-staging-db\b/);
assert.match(blueprint, /branch:\s+codex\/supabase-egress-containment\b/);
assert.match(blueprint, /autoDeployTrigger:\s+off\b/, 'Staging deploys must remain explicit.');
assert.match(blueprint, /rootDir:\s+services\/ccg-backend\b/);
assert.match(blueprint, /startCommand:\s+npm run migrate:apply && npm start\b/);
assert.match(blueprint, /healthCheckPath:\s+\/ready\b/);
assert.match(blueprint, /key:\s+CCG_BIND_HOST\s+value:\s+0\.0\.0\.0/m);
assert.match(blueprint, /key:\s+DATABASE_URL\s+fromDatabase:\s+name:\s+ccg-backend-staging-db\s+property:\s+connectionString/m);
assert.match(blueprint, /key:\s+CCG_DB_SSL\s+value:\s+disable/m);
assert.match(blueprint, /key:\s+CCG_AUTH_MODE\s+value:\s+local/m);
assert.match(blueprint, /CCG_LOCAL_AUTH_PRIVATE_JWK_FILE[\s\S]*\/etc\/secrets\/ccg-auth-private\.jwk/);
assert.match(blueprint, /CCG_LOCAL_AUTH_PUBLIC_JWK_FILE[\s\S]*\/etc\/secrets\/ccg-auth-public\.jwk/);

for (const feature of [
  'CCG_LOCAL_AUTH_REGISTRATION_ENABLED',
  'CCG_LOCAL_AUTH_RECOVERY_ENABLED',
  'CCG_LOST_SIZZLER_REALTIME_ENABLED',
  'CCG_LOST_SIZZLER_COMMERCE_ENABLED',
]) {
  const escaped = feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(
    blueprint,
    new RegExp(`key:\\s+${escaped}\\s+value:\\s+"false"`, 'm'),
    `${feature} must stay disabled in the initial staging Blueprint.`
  );
}

assert.match(blueprint, /postgresMajorVersion:\s+"17"/);
assert.match(blueprint, /databaseName:\s+ccg_backend_staging_db\b/, 'Blueprint must adopt the provisioned staging database name without trying to mutate it.');
assert.match(blueprint, /user:\s+ccg_backend_staging_db_user\b/, 'Blueprint must preserve the provisioned staging database user.');
assert.match(blueprint, /ipAllowList:\s+\[\]/, 'Staging PostgreSQL must not expose a public database allowlist by default.');
assert.doesNotMatch(blueprint, /preDeployCommand:/, 'Free staging must not rely on paid-only pre-deploy commands.');
assert.doesNotMatch(blueprint, /RESEND_API_KEY|PAYPAL_CLIENT_SECRET|PAYPAL_CLIENT_ID|PAYPAL_WEBHOOK_ID/);
assert.doesNotMatch(blueprint, /"d"\s*:/, 'No private JWK material may be committed in the Blueprint.');
assert.doesNotMatch(rootRender, /ccg-backend-staging/, 'The staging backend must remain outside the existing root Render Blueprint.');

console.log('CCG Render staging contract passed: deployment is isolated, manual, local-auth capable, adopts the provisioned private database, is secret-file based, and all write/commerce/realtime feature switches remain disabled initially.');
