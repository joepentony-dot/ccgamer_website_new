import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import pg from 'pg';
import { createDatabase } from '../src/db.mjs';
import { createCloudSaveStore, hashSavePayload } from '../src/cloud-save.mjs';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!databaseUrl) throw new Error('DATABASE_URL is required for the database contract.');

const bootstrap = new Pool({ connectionString: databaseUrl, ssl: false, max: 1 });
try {
  const migration = await fs.readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8');
  await bootstrap.query(migration);
} finally {
  await bootstrap.end();
}

const database = createDatabase(databaseUrl);
try {
  assert.equal(await database.ping(), true);

  const columns = await database.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'lost_sizzler_cloud_saves'
      order by ordinal_position`
  );
  const columnNames = new Set(columns.rows.map((row) => row.column_name));
  for (const required of [
    'user_id',
    'revision',
    'schema_name',
    'schema_version',
    'game_version',
    'save_envelope',
    'save_checksum',
    'payload_sha256',
    'save_saved_at',
    'client_revision_ms',
    'deleted_at',
    'updated_at',
  ]) {
    assert.equal(columnNames.has(required), true, `Missing source-compatible cloud-save column: ${required}`);
  }

  const store = createCloudSaveStore(database);
  const userId = 'database-contract-user';
  const envelope = {
    schema: 'ccg-lost-sizzler-solo-save',
    schemaVersion: 2,
    gameVersion: 'V10.41',
    savedAt: 1788321126482,
    reason: 'contract',
    summary: { floor: 3, score: 12345 },
    checkpoint: { run: { floor: 3, seed: 'contract-seed' }, player: { level: 4 } },
    checksum: '1234abcd',
  };
  const firstProof = hashSavePayload(envelope);
  const first = await store.put(userId, {
    expected_revision: 0,
    client_revision_ms: envelope.savedAt,
    payload: envelope,
    payload_sha256: firstProof.sha256,
  });
  assert.equal(first.revision, 1);
  assert.equal(first.schema_name, envelope.schema);
  assert.equal(first.schema_version, envelope.schemaVersion);
  assert.equal(first.game_version, envelope.gameVersion);
  assert.equal(first.save_checksum, envelope.checksum);
  assert.equal(first.client_revision_ms, envelope.savedAt);
  assert.equal(first.payload_sha256, firstProof.sha256);
  assert.equal(first.deleted_at, null);

  const exactRetry = await store.put(userId, {
    expected_revision: 0,
    client_revision_ms: envelope.savedAt,
    payload: envelope,
    payload_sha256: firstProof.sha256,
  });
  assert.equal(exactRetry.revision, 1);
  assert.equal(exactRetry.idempotent, true);

  const changed = { ...envelope, savedAt: envelope.savedAt + 1000, summary: { floor: 3, score: 13000 } };
  const changedProof = hashSavePayload(changed);
  await assert.rejects(
    store.put(userId, {
      expected_revision: 0,
      client_revision_ms: changed.savedAt,
      payload: changed,
      payload_sha256: changedProof.sha256,
    }),
    (error) => error?.statusCode === 409 && error?.code === 'save_revision_conflict'
  );

  const afterConflict = await store.get(userId);
  assert.equal(afterConflict.revision, 1, 'A rejected stale write must leave the remote save revision unchanged.');
  assert.equal(afterConflict.payload_sha256, firstProof.sha256, 'A rejected stale write must leave remote save content unchanged.');

  const second = await store.put(userId, {
    expected_revision: 1,
    client_revision_ms: changed.savedAt,
    payload: changed,
    payload_sha256: changedProof.sha256,
  });
  assert.equal(second.revision, 2);
  assert.equal(second.client_revision_ms, changed.savedAt);
  assert.equal(second.payload_sha256, changedProof.sha256);

  const stored = await store.get(userId);
  assert.equal(stored.revision, 2);
  assert.deepEqual(stored.payload.summary, changed.summary);

  console.log('CCG PostgreSQL contract passed: source-compatible Solo save fields, transaction serialization, idempotent retry and stale-write rejection work on a real PostgreSQL database.');
} finally {
  await database.close();
}
