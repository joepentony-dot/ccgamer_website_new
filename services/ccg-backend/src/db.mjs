import pg from 'pg';

const { Pool } = pg;

function readPoolMax(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isSafeInteger(parsed)) return 10;
  return Math.min(20, Math.max(1, parsed));
}

function readPositiveInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function createDatabase(databaseUrl) {
  const poolMax = readPoolMax(process.env.CCG_DB_POOL_MAX);
  const idleTimeoutMillis = readPositiveInteger(process.env.CCG_DB_IDLE_TIMEOUT_MS, 30_000, 1_000, 120_000);
  const connectionTimeoutMillis = readPositiveInteger(process.env.CCG_DB_CONNECTION_TIMEOUT_MS, 5_000, 1_000, 30_000);

  const pool = new Pool({
    connectionString: databaseUrl,
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    ssl: process.env.CCG_DB_SSL === 'disable' ? false : { rejectUnauthorized: true },
  });

  return Object.freeze({
    poolMax,
    async ping() {
      const result = await pool.query('select 1 as ok');
      return result.rows?.[0]?.ok === 1;
    },
    async query(text, params = []) {
      return pool.query(text, params);
    },
    async transaction(action) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const tx = Object.freeze({
          query(text, params = []) {
            return client.query(text, params);
          },
        });
        const result = await action(tx);
        await client.query('commit');
        return result;
      } catch (error) {
        try {
          await client.query('rollback');
        } catch {
          // Preserve the original transaction failure.
        }
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  });
}
