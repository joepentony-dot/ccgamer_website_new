import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const DEFAULT_TOKEN_SECONDS = 30 * 60;
const DEFAULT_REQUEST_LIMIT = 4;
const DEFAULT_REQUEST_WINDOW_SECONDS = 60 * 60;
const DEFAULT_BCRYPT_COST = 12;

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !email.includes('@')) {
    throw httpError(400, 'invalid_email');
  }
  return email;
}

function normalizeNewPassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 1024) {
    throw httpError(400, 'invalid_new_password');
  }
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`Invalid ${name}`);
  return parsed;
}

function accountUsable(row, nowMs) {
  if (!row || !row.email_confirmed_at || row.deleted_at || row.disabled_at || row.profile_banned === true) return false;
  if (row.banned_until && new Date(row.banned_until).getTime() > nowMs) return false;
  return true;
}

export function createPasswordRecoveryService({
  database,
  sendRecovery,
  now = () => Date.now(),
  tokenSeconds = DEFAULT_TOKEN_SECONDS,
  requestLimit = DEFAULT_REQUEST_LIMIT,
  requestWindowSeconds = DEFAULT_REQUEST_WINDOW_SECONDS,
  bcryptCost = DEFAULT_BCRYPT_COST,
}) {
  if (!database?.query || !database?.transaction) throw new Error('CCG password recovery requires a database boundary.');
  if (typeof sendRecovery !== 'function') throw new Error('CCG password recovery requires a delivery callback.');

  const lifetimeSeconds = positiveInteger(tokenSeconds, DEFAULT_TOKEN_SECONDS, 'recovery token lifetime');
  const maxRequests = positiveInteger(requestLimit, DEFAULT_REQUEST_LIMIT, 'recovery request limit');
  const windowSeconds = positiveInteger(requestWindowSeconds, DEFAULT_REQUEST_WINDOW_SECONDS, 'recovery request window');
  const cost = positiveInteger(bcryptCost, DEFAULT_BCRYPT_COST, 'bcrypt cost');
  if (cost < 10 || cost > 14) throw new Error('CCG password recovery bcrypt cost must be between 10 and 14.');

  async function consumeBudget(email, fingerprint) {
    const bucketKey = sha256(`recovery|${email}|${String(fingerprint || '').slice(0, 256)}`);
    return database.transaction(async (tx) => {
      const currentResult = await tx.query(
        `select bucket_key, window_started_at, request_count
           from ccg_auth_login_buckets
          where bucket_key = $1
          for update`,
        [bucketKey]
      );
      const current = currentResult.rows?.[0] ?? null;
      const nowDate = new Date(now());
      const windowMs = windowSeconds * 1000;

      if (!current) {
        await tx.query(
          `insert into ccg_auth_login_buckets (bucket_key, window_started_at, request_count, updated_at)
           values ($1, $2, 1, $2)`,
          [bucketKey, nowDate]
        );
        return true;
      }

      const started = new Date(current.window_started_at).getTime();
      if (!Number.isFinite(started) || nowDate.getTime() - started >= windowMs) {
        await tx.query(
          `update ccg_auth_login_buckets
              set window_started_at = $2, request_count = 1, updated_at = $2
            where bucket_key = $1`,
          [bucketKey, nowDate]
        );
        return true;
      }

      const nextCount = Number(current.request_count) + 1;
      await tx.query(
        `update ccg_auth_login_buckets
            set request_count = $2, updated_at = $3
          where bucket_key = $1`,
        [bucketKey, nextCount, nowDate]
      );
      return nextCount <= maxRequests;
    });
  }

  async function request({ email, fingerprint = '' }) {
    const normalizedEmail = normalizeEmail(email);
    const allowed = await consumeBudget(normalizedEmail, fingerprint);
    if (!allowed) return Object.freeze({ accepted: true });

    const accountResult = await database.query(
      `select a.user_id, a.email, a.email_confirmed_at, a.banned_until, a.disabled_at, a.deleted_at,
              coalesce(p.banned, false) as profile_banned
         from ccg_auth_accounts a
         left join ccg_profiles p on p.user_id = a.user_id
        where lower(a.email) = $1
        limit 1`,
      [normalizedEmail]
    );
    const account = accountResult.rows?.[0] ?? null;
    if (!accountUsable(account, now())) return Object.freeze({ accepted: true });

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenSha = sha256(rawToken);
    const requestedFingerprintSha = fingerprint ? sha256(String(fingerprint).slice(0, 256)) : null;
    const createdAt = new Date(now());
    const expiresAt = new Date(createdAt.getTime() + lifetimeSeconds * 1000);

    const created = await database.transaction(async (tx) => {
      const locked = await tx.query(
        `select a.user_id, a.email, a.email_confirmed_at, a.banned_until, a.disabled_at, a.deleted_at,
                coalesce(p.banned, false) as profile_banned
           from ccg_auth_accounts a
           left join ccg_profiles p on p.user_id = a.user_id
          where a.user_id = $1
          for update of a`,
        [account.user_id]
      );
      const current = locked.rows?.[0] ?? null;
      if (!accountUsable(current, now())) return null;

      const nowDate = new Date(now());
      await tx.query(
        `update ccg_auth_recovery_tokens
            set used_at = coalesce(used_at, $2)
          where user_id = $1 and used_at is null`,
        [account.user_id, nowDate]
      );
      const inserted = await tx.query(
        `insert into ccg_auth_recovery_tokens
          (user_id, token_sha256, created_at, expires_at, requested_from_fingerprint_sha256)
         values ($1, $2, $3, $4, $5)
         returning token_id`,
        [account.user_id, tokenSha, createdAt, expiresAt, requestedFingerprintSha]
      );
      return Object.freeze({ tokenId: inserted.rows[0].token_id, email: current.email });
    });

    if (!created) return Object.freeze({ accepted: true });

    try {
      await sendRecovery(Object.freeze({
        email: created.email,
        token: rawToken,
        expires_at: expiresAt.toISOString(),
      }));
    } catch {
      await database.query(
        `update ccg_auth_recovery_tokens set used_at = coalesce(used_at, $2) where token_id = $1`,
        [created.tokenId, new Date(now())]
      );
    }

    return Object.freeze({ accepted: true });
  }

  async function confirm({ token, new_password: newPassword }) {
    const rawToken = String(token || '').trim();
    if (rawToken.length < 32 || rawToken.length > 512) throw httpError(400, 'invalid_or_expired_recovery_token');
    const password = normalizeNewPassword(newPassword);
    const tokenSha = sha256(rawToken);
    const passwordHash = await bcrypt.hash(password, cost);

    return database.transaction(async (tx) => {
      const tokenResult = await tx.query(
        `select r.token_id, r.user_id, r.expires_at, r.used_at,
                a.banned_until, a.disabled_at, a.deleted_at,
                coalesce(p.banned, false) as profile_banned
           from ccg_auth_recovery_tokens r
           join ccg_auth_accounts a on a.user_id = r.user_id
           left join ccg_profiles p on p.user_id = r.user_id
          where r.token_sha256 = $1
          for update of r, a`,
        [tokenSha]
      );
      const current = tokenResult.rows?.[0] ?? null;
      const nowMs = now();
      if (
        !current || current.used_at || new Date(current.expires_at).getTime() <= nowMs ||
        current.deleted_at || current.disabled_at || current.profile_banned === true ||
        (current.banned_until && new Date(current.banned_until).getTime() > nowMs)
      ) {
        throw httpError(400, 'invalid_or_expired_recovery_token');
      }

      const changedAt = new Date(nowMs);
      await tx.query(
        `update ccg_auth_accounts
            set password_hash = $2, password_hash_algorithm = 'bcrypt', updated_at = $3
          where user_id = $1`,
        [current.user_id, passwordHash, changedAt]
      );
      await tx.query(
        `update ccg_auth_recovery_tokens
            set used_at = coalesce(used_at, $2)
          where user_id = $1 and used_at is null`,
        [current.user_id, changedAt]
      );
      await tx.query(
        `update ccg_auth_sessions
            set revoked_at = coalesce(revoked_at, $2), last_used_at = $2
          where user_id = $1 and revoked_at is null`,
        [current.user_id, changedAt]
      );

      return Object.freeze({ reset: true, user_id: String(current.user_id) });
    });
  }

  return Object.freeze({ request, confirm });
}
