import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const DEFAULT_VERIFY_SECONDS = 60 * 60;
const DEFAULT_REGISTER_LIMIT = 5;
const DEFAULT_REGISTER_WINDOW_SECONDS = 60 * 60;

function authError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw authError(400, 'invalid_email');
  }
  return email;
}

function normalizeNewPassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128 || /^\s+$/.test(value)) {
    throw authError(400, 'invalid_password');
  }
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomVerificationToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function validateFingerprint(value) {
  return String(value || '').slice(0, 512);
}

export function createAuthRegistrationService({
  database,
  emailSender,
  verificationSeconds = DEFAULT_VERIFY_SECONDS,
  registerLimit = DEFAULT_REGISTER_LIMIT,
  registerWindowSeconds = DEFAULT_REGISTER_WINDOW_SECONDS,
  now = () => Date.now(),
  randomUuidImpl = crypto.randomUUID,
  randomTokenImpl = randomVerificationToken,
  bcryptCost = 12,
} = {}) {
  if (!database?.query || !database?.transaction) throw new Error('CCG registration requires a database.');
  if (!emailSender?.sendVerification) throw new Error('CCG registration requires an email sender.');
  if (!Number.isSafeInteger(verificationSeconds) || verificationSeconds < 300 || verificationSeconds > 24 * 60 * 60) {
    throw new Error('Invalid verification token lifetime.');
  }
  if (!Number.isSafeInteger(registerLimit) || registerLimit < 1 || registerLimit > 100) {
    throw new Error('Invalid registration request limit.');
  }
  if (!Number.isSafeInteger(registerWindowSeconds) || registerWindowSeconds < 60 || registerWindowSeconds > 24 * 60 * 60) {
    throw new Error('Invalid registration request window.');
  }
  if (!Number.isSafeInteger(bcryptCost) || bcryptCost < 10 || bcryptCost > 14) {
    throw new Error('Invalid registration bcrypt cost.');
  }

  async function consumeBudget(email, fingerprint) {
    const bucketKey = sha256(`register|${email}|${validateFingerprint(fingerprint)}`);
    return database.transaction(async (tx) => {
      const nowDate = new Date(now());
      await tx.query(
        `insert into ccg_auth_login_buckets (bucket_key, window_started_at, request_count, updated_at)
         values ($1, $2, 0, $2)
         on conflict (bucket_key) do nothing`,
        [bucketKey, nowDate]
      );
      const result = await tx.query(
        `select window_started_at, request_count
           from ccg_auth_login_buckets
          where bucket_key = $1
          for update`,
        [bucketKey]
      );
      const row = result.rows?.[0];
      if (!row) throw new Error('Registration budget row missing.');
      const windowMs = registerWindowSeconds * 1000;
      const started = new Date(row.window_started_at).getTime();
      const reset = !Number.isFinite(started) || nowDate.getTime() - started >= windowMs;
      const nextCount = reset ? 1 : Number(row.request_count) + 1;
      await tx.query(
        `update ccg_auth_login_buckets
            set window_started_at = $2, request_count = $3, updated_at = $2
          where bucket_key = $1`,
        [bucketKey, reset ? nowDate : row.window_started_at, nextCount]
      );
      return nextCount <= registerLimit;
    });
  }

  async function issueVerification(userId, email, fingerprint) {
    const rawToken = String(randomTokenImpl());
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(rawToken)) throw new Error('Registration token source returned an invalid token.');
    const tokenHash = sha256(rawToken);
    const createdAt = new Date(now());
    const expiresAt = new Date(createdAt.getTime() + verificationSeconds * 1000);
    const fingerprintHash = fingerprint ? sha256(validateFingerprint(fingerprint)) : null;

    await database.transaction(async (tx) => {
      await tx.query(
        `update ccg_auth_email_verification_tokens
            set used_at = coalesce(used_at, $2)
          where user_id = $1 and used_at is null`,
        [userId, createdAt]
      );
      await tx.query(
        `insert into ccg_auth_email_verification_tokens
          (user_id, token_sha256, created_at, expires_at, requested_from_fingerprint_sha256)
         values ($1, $2, $3, $4, $5)`,
        [userId, tokenHash, createdAt, expiresAt, fingerprintHash]
      );
    });

    await emailSender.sendVerification({ email, token: rawToken, expiresAt: expiresAt.toISOString() });
  }

  async function register({ email: emailValue, password: passwordValue, fingerprint = '' }) {
    const email = normalizeEmail(emailValue);
    const password = normalizeNewPassword(passwordValue);
    if (!(await consumeBudget(email, fingerprint))) throw authError(429, 'too_many_registration_attempts');

    const existing = await database.query(
      `select user_id, email_confirmed_at, source_provider, deleted_at
         from ccg_auth_accounts
        where lower(email) = $1 and deleted_at is null
        limit 1`,
      [email]
    );
    const existingAccount = existing.rows?.[0] || null;
    if (existingAccount) {
      if (!existingAccount.email_confirmed_at && String(existingAccount.source_provider) === 'ccg') {
        await issueVerification(String(existingAccount.user_id), email, fingerprint);
      }
      return Object.freeze({ accepted: true, verification_required: true });
    }

    const userId = String(randomUuidImpl());
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Registration UUID source returned an invalid UUID.');
    const passwordHash = await bcrypt.hash(password, bcryptCost);
    const createdAt = new Date(now());

    try {
      await database.transaction(async (tx) => {
        await tx.query(
          `insert into ccg_users (user_id, created_at, updated_at) values ($1, $2, $2)`,
          [userId, createdAt]
        );
        await tx.query(
          `insert into ccg_auth_accounts
            (user_id, email, password_hash, password_hash_algorithm, source_provider, created_at, updated_at)
           values ($1, $2, $3, 'bcrypt', 'ccg', $4, $4)`,
          [userId, email, passwordHash, createdAt]
        );
        await tx.query(
          `insert into ccg_auth_identities
            (user_id, provider, provider_subject, email, created_at, updated_at)
           values ($1, 'email', $1, $2, $3, $3)`,
          [userId, email, createdAt]
        );
      });
    } catch (error) {
      if (error?.code === '23505') {
        return Object.freeze({ accepted: true, verification_required: true });
      }
      throw error;
    }

    await issueVerification(userId, email, fingerprint);
    return Object.freeze({ accepted: true, verification_required: true });
  }

  async function confirmEmail(tokenValue) {
    const rawToken = String(tokenValue || '').trim();
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(rawToken)) throw authError(400, 'invalid_verification_token');
    const tokenHash = sha256(rawToken);

    return database.transaction(async (tx) => {
      const result = await tx.query(
        `select t.token_id, t.user_id, t.expires_at, t.used_at, a.email, a.deleted_at, a.disabled_at
           from ccg_auth_email_verification_tokens t
           join ccg_auth_accounts a on a.user_id = t.user_id
          where t.token_sha256 = $1
          for update of t, a`,
        [tokenHash]
      );
      const row = result.rows?.[0] || null;
      const nowDate = new Date(now());
      if (
        !row || row.used_at || row.deleted_at || row.disabled_at ||
        new Date(row.expires_at).getTime() <= nowDate.getTime()
      ) {
        throw authError(400, 'invalid_verification_token');
      }

      await tx.query(
        `update ccg_auth_email_verification_tokens set used_at = $2 where token_id = $1`,
        [row.token_id, nowDate]
      );
      await tx.query(
        `update ccg_auth_accounts
            set email_confirmed_at = coalesce(email_confirmed_at, $2), updated_at = $2
          where user_id = $1`,
        [row.user_id, nowDate]
      );
      await tx.query(
        `insert into ccg_profiles (user_id, email, created_at, last_seen, updated_at)
         values ($1, $2, $3, $3, $3)
         on conflict (user_id) do nothing`,
        [row.user_id, row.email, nowDate]
      );
      await tx.query(
        `update ccg_auth_email_verification_tokens
            set used_at = coalesce(used_at, $2)
          where user_id = $1 and used_at is null`,
        [row.user_id, nowDate]
      );

      return Object.freeze({ confirmed: true, user_id: String(row.user_id) });
    });
  }

  return Object.freeze({ register, confirmEmail });
}
