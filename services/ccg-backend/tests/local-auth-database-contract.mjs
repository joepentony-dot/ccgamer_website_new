import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import bcrypt from 'bcryptjs';
import { exportJWK, generateKeyPair } from 'jose';
import pg from 'pg';
import { createDatabase } from '../src/db.mjs';
import { createLocalAuthService } from '../src/local-auth.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the local-auth database contract.');

const bootstrap = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
try {
  for (const relativePath of [
    '../migrations/001_initial.sql',
    '../migrations/002_account_profiles.sql',
    '../migrations/003_auth_sessions.sql',
  ]) {
    const migration = await fs.readFile(new URL(relativePath, import.meta.url), 'utf8');
    await bootstrap.query(migration);
  }
} finally {
  await bootstrap.end();
}

const database = createDatabase(databaseUrl);
try {
  const primaryUserId = 'local-auth-contract-primary';
  const limitedUserId = 'local-auth-contract-limited';
  const unconfirmedUserId = 'local-auth-contract-unconfirmed';
  const password = 'Contract-password-42!';
  const passwordHash = await bcrypt.hash(password, 4);

  await database.query(
    `delete from ccg_auth_login_buckets where bucket_key is not null;
     delete from ccg_auth_sessions where user_id = any($1::text[]);
     delete from ccg_profiles where user_id = any($1::text[]);
     delete from ccg_auth_accounts where user_id = any($1::text[]);
     delete from ccg_users where user_id = any($1::text[]);`,
    [[primaryUserId, limitedUserId, unconfirmedUserId]]
  );

  await database.query(
    `insert into ccg_users (user_id) values ($1), ($2), ($3)`,
    [primaryUserId, limitedUserId, unconfirmedUserId]
  );
  await database.query(
    `insert into ccg_auth_accounts
      (user_id, email, password_hash, password_hash_algorithm, email_confirmed_at, source_provider)
     values
      ($1, 'login-contract@example.test', $4, 'bcrypt', now(), 'supabase'),
      ($2, 'limit-contract@example.test', $4, 'bcrypt', now(), 'supabase'),
      ($3, 'unconfirmed-contract@example.test', $4, 'bcrypt', null, 'supabase')`,
    [primaryUserId, limitedUserId, unconfirmedUserId, passwordHash]
  );
  await database.query(
    `insert into ccg_profiles (user_id, username, display_name)
     values ($1, 'login-contract', 'Login Contract')`,
    [primaryUserId]
  );

  const { publicKey, privateKey } = await generateKeyPair('EdDSA');
  const privateJwk = await exportJWK(privateKey);
  const publicJwk = await exportJWK(publicKey);
  const auth = createLocalAuthService({
    database,
    issuer: 'https://auth.cheekycommodoregamer.co.uk/',
    audience: 'ccg-backend',
    privateJwk,
    publicJwk,
    keyId: 'contract-ed25519-1',
    accessTokenSeconds: 300,
    refreshTokenSeconds: 3600,
    loginLimit: 2,
    loginWindowSeconds: 900,
  });

  const login = await auth.login({
    email: 'LOGIN-CONTRACT@EXAMPLE.TEST',
    password,
    fingerprint: 'contract-browser-a',
  });
  assert.equal(login.user_id, primaryUserId);
  assert.equal(typeof login.access_token, 'string');
  assert.equal(typeof login.refresh_token, 'string');
  assert.ok(login.refresh_token.length >= 32);

  const identity = await auth.verifyBearer(`Bearer ${login.access_token}`);
  assert.equal(identity.userId, primaryUserId);
  assert.equal(typeof identity.sessionId, 'string');

  const storedSession = await database.query(
    `select refresh_token_sha256, revoked_at from ccg_auth_sessions where session_id = $1`,
    [identity.sessionId]
  );
  assert.equal(storedSession.rows[0].revoked_at, null);
  assert.notEqual(storedSession.rows[0].refresh_token_sha256, login.refresh_token, 'Raw refresh tokens must never be stored.');
  assert.equal(
    storedSession.rows[0].refresh_token_sha256,
    crypto.createHash('sha256').update(login.refresh_token).digest('hex'),
    'PostgreSQL must store only the one-way refresh-token proof.'
  );

  const rotated = await auth.refresh(login.refresh_token);
  assert.equal(rotated.user_id, primaryUserId);
  assert.notEqual(rotated.refresh_token, login.refresh_token);
  await assert.rejects(
    auth.refresh(login.refresh_token),
    (error) => error?.statusCode === 401 && error?.code === 'invalid_refresh_token'
  );
  await assert.rejects(
    auth.verifyBearer(`Bearer ${login.access_token}`),
    (error) => error?.statusCode === 401 && error?.code === 'invalid_bearer_token'
  );

  const rotatedIdentity = await auth.verifyBearer(`Bearer ${rotated.access_token}`);
  assert.equal(rotatedIdentity.userId, primaryUserId);

  const logout = await auth.logout(rotated.refresh_token);
  assert.equal(logout.revoked, true);
  const secondLogout = await auth.logout(rotated.refresh_token);
  assert.equal(secondLogout.revoked, false, 'Logout must be idempotent and never resurrect/reissue a session.');
  await assert.rejects(
    auth.verifyBearer(`Bearer ${rotated.access_token}`),
    (error) => error?.statusCode === 401 && error?.code === 'invalid_bearer_token'
  );

  await assert.rejects(
    auth.login({ email: 'unconfirmed-contract@example.test', password, fingerprint: 'contract-unconfirmed' }),
    (error) => error?.statusCode === 403 && error?.code === 'email_not_confirmed'
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await assert.rejects(
      auth.login({ email: 'limit-contract@example.test', password: 'wrong-password', fingerprint: 'contract-rate-limit' }),
      (error) => error?.statusCode === 401 && error?.code === 'invalid_credentials'
    );
  }
  await assert.rejects(
    auth.login({ email: 'limit-contract@example.test', password: 'wrong-password', fingerprint: 'contract-rate-limit' }),
    (error) => error?.statusCode === 429 && error?.code === 'too_many_login_attempts'
  );

  const jwks = auth.jwks();
  assert.equal(jwks.keys.length, 1);
  assert.equal(jwks.keys[0].kid, 'contract-ed25519-1');
  assert.equal(jwks.keys[0].d, undefined, 'Published JWKS must never expose the private Ed25519 component.');

  console.log('CCG local-auth PostgreSQL contract passed: migrated bcrypt login, Ed25519 access tokens, session rotation, logout revocation and login throttling work without Supabase.');
} finally {
  await database.close();
}
