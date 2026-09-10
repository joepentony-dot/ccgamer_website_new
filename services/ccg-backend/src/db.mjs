import pg from 'pg';

const { Pool } = pg;

export function createDatabase(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl: process.env.CCG_DB_SSL === 'disable' ? false : { rejectUnauthorized: true },
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
