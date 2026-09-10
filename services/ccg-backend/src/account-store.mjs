function normalizeAccount(row) {
  if (!row) return null;
  return Object.freeze({
    user_id: String(row.user_id),
    email: String(row.email),
    email_confirmed_at: row.email_confirmed_at || null,
  });
}

/**
 * Read-only browser-safe account projection.
 *
 * This store intentionally cannot select password hashes, provider metadata,
 * ban internals or session material. Those remain confined to the local-auth
 * and migration boundaries.
 */
export function createAccountStore(database) {
  if (!database || typeof database.query !== 'function') {
    throw new Error('CCG account store requires a database query interface.');
  }

  return Object.freeze({
    async getPublic(userId) {
      const id = String(userId || '').trim();
      if (!id) return null;
      const result = await database.query(
        `select user_id, email, email_confirmed_at
           from ccg_auth_accounts
          where user_id = $1
            and deleted_at is null`,
        [id]
      );
      return normalizeAccount(result.rows?.[0] ?? null);
    },
  });
}
