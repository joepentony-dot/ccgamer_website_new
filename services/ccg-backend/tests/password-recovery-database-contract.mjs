import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import bcrypt from 'bcryptjs';
import { exportJWK, generateKeyPair } from 'jose';
import pg from 'pg';
import { createDatabase } from '../src/db.mjs';
import { createLocalAuthService } from '../src/local-auth.mjs';
import { createPasswordRecoveryService } from '../src/password-recovery.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the password-recovery contract.');

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
  const primaryUserId = 'recovery-contract-primary';
  const unconfirmedUserId = 'recovery-contract-unconfirmed';
  const oldPassword = 'Old-contract-password-42!';
  const newPassword = 'New-contract-password-84!';
  const oldHash = await bcrypt.hash(oldPassword, 4);

  await database.query(
    `delete from ccg_auth_login_buckets where bucket_key is not null;
     delete from ccg_auth_recovery_tokens where user_id = any($1::text[]);
     delete from ccg_auth_sessions where user_id = any($1::text[]);
     delete from ccg_profiles where user_id = any($1::text[]);
     delete from ccg_auth_accounts where user_id = any($1::text[]);
     delete from ccg_users where user_id = any($1::text[]);`,
    [[primaryUserId, unconfirmedUserId]]
  );

  await database.query(
    `insert into ccg_users (user_id) values ($1), ($2)`,
    [primaryUserId, unconfirmedUserId]
  );
  await database.query(
    `insert into ccg_auth_accounts
      (user_id, email, password_hash, password_hash_algorithm, email_confirmed_at, source_provider)
     values
      ($1, 'recover-contract@example.test', $3, 'bcrypt', now(), 'supabase'),
      ($2, 'recover-unconfirmed@example.test', $3, 'bcrypt', null, 'supabase')`,
    [primaryUserId, unconfirmedUserId, oldHash]
  );
  await database.query(
    `insert into ccg_profiles (user_id, username, display_name)
     values ($1, 'recover-contract', 'Recovery Contract')`,
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
    keyId: 'recovery-contract-key',
    accessTokenSeconds: 300,
    refreshTokenSeconds: 3600,
  });

  const oldSession = await auth.login({
    email: 'recover-contract@example.test',
    password: oldPassword,
    fingerprint: 'recovery-contract-login',
  });
  const oldIdentity = await auth.verifyBearer(`Bearer ${oldSession.access_token}`);
  assert.equal(oldIdentity.userId, primaryUserId);

  const deliveries = [];
  const recovery = createPasswordRecoveryService({
    database,
    sendRecovery: async (message) => deliveries.push(message),
    tokenSeconds: 1800,
    requestLimit: 2,
    requestWindowSeconds: 3600,
    bcryptCost: 10,
  });

  const missing = await recovery.request({
    email: 'missing-recovery@example.test',
    fingerprint: 'browser-a',
  });
  assert.deepEqual(missing, { accepted: true });
  assert.equal(deliveries.length, 0, 'Unknown accounts must not create a recovery delivery.');

  const unconfirmed = await recovery.request({
    email: 'recover-unconfirmed@example.test',
    fingerprint: 'browser-a',
  });
  assert.deepEqual(unconfirmed, { accepted: true });
  assert.equal(deliveries.length, 0, 'Unconfirmed accounts must not receive a recovery token.');

  const firstRequest = await recovery.request({
    email: 'RECOVER-CONTRACT@EXAMPLE.TEST',
    fingerprint: 'browser-primary',
  });
  assert.deepEqual(firstRequest, { accepted: true });
  assert.equal(deliveries.length, 1);
  assert.equal(firstRequest.token, undefined, 'Recovery request responses must never expose the raw token.');
  const firstToken = deliveries[0].token;

  const firstStored = await database.query(
    `select token_sha256, used_at from ccg_auth_recovery_tokens
      where user_id = $1 order by created_at desc limit 1`,
    [primaryUserId]
  );
  assert.notEqual(firstStored.rows[0].token_sha256, firstToken);
  assert.equal(
    firstStored.rows[0].token_sha256,
    crypto.createHash('sha256').update(firstToken).digest('hex'),
    'PostgreSQL must store only the one-way recovery-token proof.'
  );

  await recovery.request({
    email: 'recover-contract@example.test',
    fingerprint: 'browser-primary',
  });
  assert.equal(deliveries.length, 2);
  const secondToken = deliveries[1].token;
  assert.notEqual(secondToken, firstToken);

  await assert.rejects(
    recovery.confirm({ token: firstToken, new_password: newPassword }),
    (error) => error?.statusCode === 400 && error?.code === 'invalid_or_expired_recovery_token'
  );

  const throttled = await recovery.request({
    email: 'recover-contract@example.test',
    fingerprint: 'browser-primary',
  });
  assert.deepEqual(throttled, { accepted: true });
  assert.equal(deliveries.length, 2, 'Rate-limited recovery remains non-enumerating and must not deliver another token.');

  const reset = await recovery.confirm({ token: secondToken, new_password: newPassword });
  assert.equal(reset.reset, true);
  assert.equal(reset.user_id, primaryUserId);

  await assert.rejects(
    auth.verifyBearer(`Bearer ${oldSession.access_token}`),
    (error) => error?.statusCode === 401 && error?.code === 'invalid_bearer_token'
  );
  await assert.rejects(
    auth.login({ email: 'recover-contract@example.test', password: oldPassword, fingerprint: 'old-password' }),
    (error) => error?.statusCode === 401 && error?.code === 'invalid_credentials'
  );

  const newSession = await auth.login({
    email: 'recover-contract@example.test',
    password: newPassword,
    fingerprint: 'new-password',
  });
  assert.equal(newSession.user_id, primaryUserId);

  await assert.rejects(
    recovery.confirm({ token: secondToken, new_password: 'Another-contract-password-96!' }),
    (error) => error?.statusCode === 400 && error?.code === 'invalid_or_expired_recovery_token'
  );

  const activeRecoveryTokens = await database.query(
    `select count(*)::int as count from ccg_auth_recovery_tokens where user_id = $1 and used_at is null`,
    [primaryUserId]
  );
  assert.equal(activeRecoveryTokens.rows[0].count, 0, 'Successful reset must consume all outstanding recovery tokens.');

  console.log('CCG password-recovery PostgreSQL contract passed: requests are non-enumerating, token proofs are one-way, reset revokes sessions, and existing-password login moves to the new bcrypt hash.');
} finally {
  await database.close();
}
