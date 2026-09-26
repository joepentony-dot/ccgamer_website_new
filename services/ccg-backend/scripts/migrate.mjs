import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const MIGRATION_PATTERN = /^([0-9]{3})_[a-z0-9][a-z0-9_-]*\.sql$/;
const LOCK_NAME = 'ccg-backend-schema-migrations-v1';

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export async function loadMigrations(directoryUrl = new URL('../migrations/', import.meta.url)) {
  const names = (await fs.readdir(directoryUrl))
    .filter((name) => MIGRATION_PATTERN.test(name))
    .sort();

  if (names.length === 0) throw new Error('No CCG backend migrations were found.');

  const seenNumbers = new Set();
  const migrations = [];
  for (const name of names) {
    const match = name.match(MIGRATION_PATTERN);
    const number = Number(match[1]);
    if (seenNumbers.has(number)) throw new Error(`Duplicate migration number: ${match[1]}`);
    seenNumbers.add(number);
    const sql = await fs.readFile(new URL(name, directoryUrl), 'utf8');
    if (!sql.trim()) throw new Error(`Migration is empty: ${name}`);
    migrations.push(Object.freeze({ name, number, sql, sha256: sha256(sql) }));
  }

  for (let index = 0; index < migrations.length; index += 1) {
    const expected = index + 1;
    if (migrations[index].number !== expected) {
      throw new Error(`Migration sequence gap: expected ${String(expected).padStart(3, '0')} but found ${String(migrations[index].number).padStart(3, '0')}.`);
    }
  }

  return Object.freeze(migrations);
}

function poolOptions(databaseUrl) {
  return {
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.CCG_DB_SSL === 'disable' ? false : { rejectUnauthorized: true },
  };
}

async function trackingTableExists(client) {
  const result = await client.query("select to_regclass('public.ccg_schema_migrations') as relation");
  return Boolean(result.rows?.[0]?.relation);
}

async function readApplied(client) {
  if (!(await trackingTableExists(client))) return new Map();
  const result = await client.query(
    `select filename, sha256
       from ccg_schema_migrations
      order by filename`
  );
  return new Map(result.rows.map((row) => [String(row.filename), String(row.sha256)]));
}

function compareMigrations(migrations, applied) {
  const knownNames = new Set(migrations.map((entry) => entry.name));
  for (const [filename] of applied) {
    if (!knownNames.has(filename)) throw new Error(`Database contains unknown applied migration: ${filename}`);
  }

  const pending = [];
  for (const migration of migrations) {
    const storedHash = applied.get(migration.name);
    if (!storedHash) {
      pending.push(migration);
      continue;
    }
    if (storedHash !== migration.sha256) {
      throw new Error(`Migration checksum mismatch: ${migration.name}`);
    }
  }
  return pending;
}

export async function checkMigrations({ databaseUrl, migrations = null }) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const expected = migrations || await loadMigrations();
  const pool = new Pool(poolOptions(databaseUrl));
  try {
    const client = await pool.connect();
    try {
      const applied = await readApplied(client);
      const pending = compareMigrations(expected, applied);
      return Object.freeze({
        total: expected.length,
        applied: applied.size,
        pending: Object.freeze(pending.map((entry) => entry.name)),
      });
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

export async function applyMigrations({ databaseUrl, migrations = null }) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  const expected = migrations || await loadMigrations();
  const pool = new Pool(poolOptions(databaseUrl));
  const client = await pool.connect();
  const appliedNow = [];
  try {
    await client.query('select pg_advisory_lock(hashtext($1))', [LOCK_NAME]);
    await client.query(
      `create table if not exists ccg_schema_migrations (
         filename text primary key,
         sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
         applied_at timestamptz not null default now()
       )`
    );

    const applied = await readApplied(client);
    const pending = compareMigrations(expected, applied);
    for (const migration of pending) {
      await client.query(migration.sql);
      await client.query(
        `insert into ccg_schema_migrations (filename, sha256)
         values ($1, $2)`,
        [migration.name, migration.sha256]
      );
      appliedNow.push(migration.name);
    }

    return Object.freeze({
      total: expected.length,
      applied_now: Object.freeze(appliedNow),
      pending: 0,
    });
  } finally {
    try {
      await client.query('select pg_advisory_unlock(hashtext($1))', [LOCK_NAME]);
    } catch {
      // Connection teardown will release a session advisory lock if unlock fails.
    }
    client.release();
    await pool.end();
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const check = args.has('--check');
  const apply = args.has('--apply');
  if (check === apply || args.size !== 1) {
    throw new Error('Use exactly one of --check or --apply. Migration writes require the explicit --apply flag.');
  }

  const databaseUrl = String(process.env.DATABASE_URL || '').trim();
  const result = check
    ? await checkMigrations({ databaseUrl })
    : await applyMigrations({ databaseUrl });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(`CCG migration runner failed: ${error.message}`);
    process.exitCode = 1;
  });
}
