import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, importJWK, jwtVerify } from 'jose';

const DEFAULT_ACCESS_SECONDS = 15 * 60;
const DEFAULT_REFRESH_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_LOGIN_LIMIT = 8;
const DEFAULT_LOGIN_WINDOW_SECONDS = 15 * 60;

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

function normalizePassword(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 1024) {
    throw httpError(400, 'invalid_password');
  }
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function ensurePositiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`Invalid ${name}`);
  return parsed;
}

function validateSigningJwks(privateJwk, publicJwk, keyId) {
  if (!privateJwk || privateJwk.kty !== 'OKP' || privateJwk.crv !== 'Ed25519' || !privateJwk.d || !privateJwk.x) {
    throw new Error('CCG local auth requires an Ed25519 private JWK.');
  }
  if (!publicJwk || publicJwk.kty !== 'OKP' || publicJwk.crv !== 'Ed25519' || !publicJwk.x || publicJwk.d) {
    throw new Error('CCG local auth requires a public-only Ed25519 JWK.');
  }
  if (!keyId || String(keyId).length > 128) throw new Error('CCG local auth requires a valid key id.');
  if (privateJwk.x !== publicJwk.x) throw new Error('CCG local auth private/public JWK pair does not match.');
}

function accountIsUsable(row, nowMs) {
  if (!row || !row.password_hash || row.deleted_at || row.disabled_at || row.profile_banned === true) return false;
  if (row.banned_until && new Date(row.banned_until).getTime() > nowMs) return false;
  return true;
}

async function comparePassword(password, row, dummyHashPromise) {
  if (!row?.password_hash) {
    const dummyHash = await dummyHashPromise;
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  if (row.password_hash_algorithm !== 'bcrypt') return false;
  return bcrypt.compare(password, row.password_hash);
}

export function createLocalAuthService({
  database,
  issuer,
  audience,
  privateJwk,
  publicJwk,
  keyId,
  accessTokenSeconds = DEFAULT_ACCESS_SECONDS,
  refreshTokenSeconds = DEFAULT_REFRESH_SECONDS,
  loginLimit = DEFAULT_LOGIN_LIMIT,
  loginWindowSeconds = DEFAULT_LOGIN_WINDOW_SECONDS,
  now = () => Date.now(),
}) {
  if (!database?.query || !database?.transaction) throw new Error('CCG local auth requires a database boundary.');
  if (!issuer || !audience) throw new Error('CCG local auth requires issuer and audience.');
  validateSigningJwks(privateJwk, publicJwk, keyId);

  const accessSeconds = ensurePositiveInteger(accessTokenSeconds, DEFAULT_ACCESS_SECONDS, 'access token lifetime');
  const refreshSeconds = ensurePositiveInteger(refreshTokenSeconds, DEFAULT_REFRESH_SECONDS, 'refresh token lifetime');
  const maxLoginAttempts = ensurePositiveInteger(loginLimit, DEFAULT_LOGIN_LIMIT, 'login limit');
  const loginWindow = ensurePositiveInteger(loginWindowSeconds, DEFAULT_LOGIN_WINDOW_SECONDS, 'login window');
  const privateKeyPromise = importJWK(privateJwk, 'EdDSA');
  const publicKeyPromise = importJWK(publicJwk, 'EdDSA');
  const dummyHashPromise = bcrypt.hash('ccg-auth-timing-placeholder', 12);

  async function consumeLoginBudget(email, fingerprint = '') {
    const bucketKey = sha256(`login|${email}|${String(fingerprint || '').slice(0, 256)}`);
    return database.transaction(async (tx) => {
      const existing = await tx.query(
        `select bucket_key, window_started_at, request_count
           from ccg_auth_login_buckets
          where bucket_key = $1
          for update`,
        [bucketKey]
      );
      const row = existing.rows?.[0] ?? null;
      const nowDate = new Date(now());
      const windowMs = loginWindow * 1000;
      if (!row) {
        await tx.query(
          `insert into ccg_auth_login_buckets (bucket_key, window_started_at, request_count, updated_at)
           values ($1, $2, 1, $2)`,
          [bucketKey, nowDate]
        );
        return true;
      }

      const startedMs = new Date(row.window_started_at).getTime();
      if (!Number.isFinite(startedMs) || nowDate.getTime() - startedMs >= windowMs) {
        await tx.query(
          `update ccg_auth_login_buckets
              set window_started_at = $2, request_count = 1, updated_at = $2
            where bucket_key = $1`,
          [bucketKey, nowDate]
        );
        return true;
      }

      const nextCount = Number(row.request_count) + 1;
      await tx.query(
        `update ccg_auth_login_buckets
            set request_count = $2, updated_at = $3
          where bucket_key = $1`,
        [bucketKey, nextCount, nowDate]
      );
      return nextCount <= maxLoginAttempts;
    });
  }

  async function signAccessToken(userId, sessionId) {
    const key = await privateKeyPromise;
    const issuedAtSeconds = Math.floor(now() / 1000);
    return new SignJWT({ sid: sessionId, token_use: 'access' })
      .setProtectedHeader({ alg: 'EdDSA', kid: keyId, typ: 'JWT' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(userId)
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(issuedAtSeconds + accessSeconds)
      .sign(key);
  }

  async function createSession(tx, userId, rotatedFrom = null) {
    const refreshToken = randomRefreshToken();
    const refreshHash = sha256(refreshToken);
    const createdAt = new Date(now());
    const expiresAt = new Date(createdAt.getTime() + refreshSeconds * 1000);
    const inserted = await tx.query(
      `insert into ccg_auth_sessions
        (user_id, refresh_token_sha256, created_at, last_used_at, expires_at, rotated_from)
       values ($1, $2, $3, $3, $4, $5)
       returning session_id`,
      [userId, refreshHash, createdAt, expiresAt, rotatedFrom]
    );
    const sessionId = String(inserted.rows[0].session_id);
    return {
      sessionId,
      refreshToken,
      refreshExpiresAt: expiresAt.toISOString(),
      accessToken: await signAccessToken(userId, sessionId),
      accessExpiresIn: accessSeconds,
    };
  }

  async function login({ email, password, fingerprint = '' }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = normalizePassword(password);
    if (!(await consumeLoginBudget(normalizedEmail, fingerprint))) {
      throw httpError(429, 'too_many_login_attempts');
    }

    const accountResult = await database.query(
      `select a.user_id, a.email, a.password_hash, a.password_hash_algorithm,
              a.email_confirmed_at, a.banned_until, a.disabled_at, a.deleted_at,
              coalesce(p.banned, false) as profile_banned
         from ccg_auth_accounts a
         left join ccg_profiles p on p.user_id = a.user_id
        where lower(a.email) = $1
        limit 1`,
      [normalizedEmail]
    );
    const account = accountResult.rows?.[0] ?? null;
    const passwordOk = await comparePassword(normalizedPassword, account, dummyHashPromise);
    const nowMs = now();
    if (!passwordOk || !accountIsUsable(account, nowMs)) throw httpError(401, 'invalid_credentials');
    if (!account.email_confirmed_at) throw httpError(403, 'email_not_confirmed');

    return database.transaction(async (tx) => {
      const locked = await tx.query(
        `select a.user_id, a.password_hash, a.banned_until, a.disabled_at, a.deleted_at,
                coalesce(p.banned, false) as profile_banned
           from ccg_auth_accounts a
           left join ccg_profiles p on p.user_id = a.user_id
          where a.user_id = $1
          for update of a`,
        [account.user_id]
      );
      const current = locked.rows?.[0] ?? null;
      if (!accountIsUsable(current, now())) throw httpError(401, 'invalid_credentials');

      const session = await createSession(tx, String(account.user_id));
      await tx.query(
        `update ccg_auth_accounts set last_sign_in_at = $2, updated_at = $2 where user_id = $1`,
        [account.user_id, new Date(now())]
      );
      return Object.freeze({
        user_id: String(account.user_id),
        access_token: session.accessToken,
        expires_in: session.accessExpiresIn,
        refresh_token: session.refreshToken,
        refresh_expires_at: session.refreshExpiresAt,
      });
    });
  }

  async function refresh(refreshTokenValue) {
    const refreshToken = String(refreshTokenValue || '').trim();
    if (refreshToken.length < 32 || refreshToken.length > 512) throw httpError(401, 'invalid_refresh_token');
    const refreshHash = sha256(refreshToken);

    return database.transaction(async (tx) => {
      const result = await tx.query(
        `select s.session_id, s.user_id, s.expires_at, s.revoked_at,
                a.password_hash, a.banned_until, a.disabled_at, a.deleted_at,
                coalesce(p.banned, false) as profile_banned
           from ccg_auth_sessions s
           join ccg_auth_accounts a on a.user_id = s.user_id
           left join ccg_profiles p on p.user_id = s.user_id
          where s.refresh_token_sha256 = $1
          for update of s, a`,
        [refreshHash]
      );
      const current = result.rows?.[0] ?? null;
      const nowMs = now();
      if (
        !current || current.revoked_at || new Date(current.expires_at).getTime() <= nowMs ||
        !accountIsUsable(current, nowMs)
      ) {
        throw httpError(401, 'invalid_refresh_token');
      }

      const revokedAt = new Date(nowMs);
      await tx.query(
        `update ccg_auth_sessions set revoked_at = $2, last_used_at = $2 where session_id = $1`,
        [current.session_id, revokedAt]
      );
      const session = await createSession(tx, String(current.user_id), current.session_id);
      return Object.freeze({
        user_id: String(current.user_id),
        access_token: session.accessToken,
        expires_in: session.accessExpiresIn,
        refresh_token: session.refreshToken,
        refresh_expires_at: session.refreshExpiresAt,
      });
    });
  }

  async function logout(refreshTokenValue) {
    const refreshToken = String(refreshTokenValue || '').trim();
    if (!refreshToken) return Object.freeze({ revoked: false });
    const refreshHash = sha256(refreshToken);
    const result = await database.query(
      `update ccg_auth_sessions
          set revoked_at = coalesce(revoked_at, $2), last_used_at = $2
        where refresh_token_sha256 = $1 and revoked_at is null
        returning session_id`,
      [refreshHash, new Date(now())]
    );
    return Object.freeze({ revoked: Boolean(result.rowCount) });
  }

  async function verifyBearer(authorization) {
    if (!authorization?.startsWith('Bearer ')) throw httpError(401, 'missing_bearer_token');
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) throw httpError(401, 'missing_bearer_token');

    try {
      const key = await publicKeyPromise;
      const { payload } = await jwtVerify(token, key, { issuer, audience, algorithms: ['EdDSA'] });
      if (payload.token_use !== 'access' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
        throw new Error('Invalid access claims');
      }
      const active = await database.query(
        `select s.session_id
           from ccg_auth_sessions s
           join ccg_auth_accounts a on a.user_id = s.user_id
           left join ccg_profiles p on p.user_id = s.user_id
          where s.session_id = $1 and s.user_id = $2
            and s.revoked_at is null and s.expires_at > now()
            and a.deleted_at is null and a.disabled_at is null
            and (a.banned_until is null or a.banned_until <= now())
            and coalesce(p.banned, false) = false`,
        [payload.sid, payload.sub]
      );
      if (!active.rows?.[0]) throw new Error('Session is not active');
      return Object.freeze({ userId: payload.sub, sessionId: payload.sid, claims: payload });
    } catch {
      throw httpError(401, 'invalid_bearer_token');
    }
  }

  function jwks() {
    return Object.freeze({
      keys: [Object.freeze({ ...publicJwk, kid: keyId, use: 'sig', alg: 'EdDSA' })],
    });
  }

  return Object.freeze({ login, refresh, logout, verifyBearer, jwks });
}
