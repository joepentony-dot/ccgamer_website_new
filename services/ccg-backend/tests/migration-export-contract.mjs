import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {
  SOURCE_QUERIES,
  collectSourceMigrationRows,
  validateSourceQueryContract,
  writeSensitiveMigrationBundle,
} from '../scripts/export-supabase-migration-bundle.mjs';

assert.equal(validateSourceQueryContract(), true);
assert.equal(Object.keys(SOURCE_QUERIES).length, 12);
assert.match(SOURCE_QUERIES.auth_accounts, /encrypted_password/i);
assert.doesNotMatch(Object.values(SOURCE_QUERIES).join('\n'), /\bauth\.sessions\b/i);
assert.doesNotMatch(
  Object.values(SOURCE_QUERIES).join('\n'),
  /\b(confirmation_token|recovery_token|email_change_token_new|email_change_token_current|phone_change_token|reauthentication_token)\b/i
);

assert.throws(
  () => validateSourceQueryContract({ ...SOURCE_QUERIES, comments: 'delete from public.comments' }),
  /SELECT-only|forbidden SQL verb/
);

let queryCount = 0;
const fakeClient = {
  async query(sql) {
    assert.match(String(sql).trim(), /^select\b/i);
    queryCount += 1;
    return { rows: [{ query_index: queryCount }] };
  },
};
const collected = await collectSourceMigrationRows(fakeClient);
assert.equal(queryCount, Object.keys(SOURCE_QUERIES).length);
assert.deepEqual(Object.keys(collected), Object.keys(SOURCE_QUERIES));
assert.equal(collected.comments[0].query_index, queryCount);

const forbiddenRepositoryPath = fileURLToPath(
  new URL('../migration/forbidden-sensitive-export.json', import.meta.url)
);
await assert.rejects(
  writeSensitiveMigrationBundle(forbiddenRepositoryPath, { fixture: true }),
  /inside the repository/
);

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-migration-export-'));
const outputPath = path.join(tempDir, 'sensitive-bundle.json');
try {
  const writeResult = await writeSensitiveMigrationBundle(outputPath, { fixture: true });
  assert.equal(writeResult.path, outputPath);
  assert.equal(writeResult.bytes > 0, true);

  const stat = await fs.stat(outputPath);
  assert.equal(stat.isFile(), true);
  if (process.platform !== 'win32') assert.equal(stat.mode & 0o077, 0);

  await assert.rejects(
    writeSensitiveMigrationBundle(outputPath, { fixture: false }),
    (error) => error?.code === 'EEXIST'
  );
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('CCG Supabase export contract passed: source queries are SELECT-only, Supabase session/recovery token material is excluded, sensitive output is repository-external, owner-only and non-overwriting.');
