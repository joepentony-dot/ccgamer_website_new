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
    async close() {
      await pool.end();
    },
  });
}
