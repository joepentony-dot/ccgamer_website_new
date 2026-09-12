import pg from 'pg';

const { Pool } = pg;

function normalizeSslMode(value) {
  const mode = String(value || 'verify-full').trim().toLowerCase();
  if (!['disable', 'verify-full'].includes(mode)) {
    throw new Error('C64 Dungeon Carnage database SSL mode must be disable or verify-full.');
  }
  return mode;
}

export function createDatabase(databaseUrl, { sslMode = 'verify-full' } = {}) {
  const connectionString = String(databaseUrl || '').trim();
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    throw new Error('C64 Dungeon Carnage database adapter requires a PostgreSQL DATABASE_URL.');
  }

  const normalizedSslMode = normalizeSslMode(sslMode);
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: normalizedSslMode === 'disable' ? false : { rejectUnauthorized: true },
  });

  return Object.freeze({
    async ping() {
      const result = await pool.query('select 1 as ok');
      return result.rows?.[0]?.ok === 1;
    },
    async query(text, params = []) {
      return pool.query(text, params);
    },
    async transaction(action) {
      if (typeof action !== 'function') throw new TypeError('Database transaction requires an action function.');
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
