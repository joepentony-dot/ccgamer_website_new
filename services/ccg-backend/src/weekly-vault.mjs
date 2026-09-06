import crypto from 'node:crypto';

const DEFAULT_LEADERBOARD_LIMIT = 5;
const DEFAULT_GHOST_POINTS = 900;
const DEFAULT_READ_LIMIT = 60;
const DEFAULT_READ_WINDOW_SECONDS = 300;
const DEFAULT_START_LIMIT = 10;
const DEFAULT_START_WINDOW_SECONDS = 3600;
const DEFAULT_FINISH_LIMIT = 20;
const DEFAULT_FINISH_WINDOW_SECONDS = 3600;
const RESULT_CLOCK_GRACE_MS = 60_000;
const GHOST_CLOCK_GRACE_MS = 15_000;

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function positiveInteger(value, fallback, label) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`Invalid ${label}`);
  return parsed;
}

function boundedInteger(value, min, max) {
  const parsed = Number(value);
  const integer = Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  return Math.max(min, Math.min(max, integer));
}

function normalizeUserId(value) {
  const userId = String(value || '').trim();
  if (!userId || userId.length > 128) throw httpError(401, 'authentication_required');
  return userId;
}

function normalizeAttemptId(value) {
  const attemptId = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(attemptId)) {
    throw httpError(400, 'invalid_attempt_id');
  }
  return attemptId;
}

function normalizePlayerName(profile) {
  return String(profile?.username || profile?.display_name || '').trim().slice(0, 64);
}

function normalizeLeaderboardRow(row) {
  return Object.freeze({
    player_name: String(row.player_name || '').slice(0, 64),
    score: boundedInteger(row.score, 0, 99_999_999),
    deepest_floor: boundedInteger(row.deepest_floor, 1, 5),
    duration_ms: boundedInteger(row.duration_ms, 0, 86_400_000),
    level: boundedInteger(row.level, 1, 99),
    completed: Boolean(row.completed),
  });
}

function normalizePersistedAttempt(row) {
  return Object.freeze({
    score: boundedInteger(row.score, 0, 99_999_999),
    deepestFloor: boundedInteger(row.deepest_floor, 1, 5),
    durationMs: boundedInteger(row.duration_ms, 0, 86_400_000),
    level: boundedInteger(row.level, 1, 99),
    completed: Boolean(row.completed),
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function weekStartUtc(nowValue = Date.now()) {
  const nowDate = nowValue instanceof Date ? new Date(nowValue.getTime()) : new Date(nowValue);
  if (!Number.isFinite(nowDate.getTime())) throw new Error('Invalid Weekly Vault clock.');
  const day = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}

export function seedForWeek(weekStart) {
  const week = String(weekStart || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new Error('Invalid Weekly Vault week.');
  return `CCQ-WEEKLY-${week.replaceAll('-', '')}`;
}

export function sanitizeGhostPath(value, maxPoints = DEFAULT_GHOST_POINTS) {
  if (!Array.isArray(value)) return [];
  const limit = positiveInteger(maxPoints, DEFAULT_GHOST_POINTS, 'Weekly Vault ghost-point limit');
  const output = [];
  for (const raw of value.slice(0, limit)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const point = Object.freeze({
      f: boundedInteger(raw.f, 1, 5),
      x: boundedInteger(raw.x, 0, 512),
      y: boundedInteger(raw.y, 0, 512),
      t: boundedInteger(raw.t, 0, 86_400_000),
    });
    if (output.length && point.t < output[output.length - 1].t) continue;
    output.push(point);
  }
  return output;
}

export function validateWeeklyResult(result, startedAt, nowMs = Date.now()) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw httpError(400, 'invalid_weekly_result');
  const score = boundedInteger(result.score, 0, 99_999_999);
  const deepestFloor = boundedInteger(result.deepestFloor, 1, 5);
  const durationMs = boundedInteger(result.durationMs, 0, 86_400_000);
  const level = boundedInteger(result.level, 1, 99);
  const completed = Boolean(result.completed);
  const path = sanitizeGhostPath(result.ghostPath);
  const kills = boundedInteger(result.kills, 0, 99_999);
  const secrets = boundedInteger(result.secrets, 0, 9_999);

  const startedMs = new Date(startedAt).getTime();
  if (completed && deepestFloor !== 5) throw httpError(422, 'weekly_completed_floor_mismatch');
  if (Number.isFinite(startedMs) && durationMs > Math.max(0, Number(nowMs) - startedMs) + RESULT_CLOCK_GRACE_MS) {
    throw httpError(422, 'weekly_duration_integrity_failed');
  }
  if (path.some((point) => point.f > deepestFloor)) throw httpError(422, 'weekly_ghost_floor_integrity_failed');
  if (path.length && path[path.length - 1].t > durationMs + GHOST_CLOCK_GRACE_MS) {
    throw httpError(422, 'weekly_ghost_duration_integrity_failed');
  }

  return Object.freeze({
    score,
    deepestFloor,
    durationMs,
    level,
    completed,
    path,
    stats: Object.freeze({ kills, secrets, ghostPath: path }),
  });
}

export function createWeeklyVaultService({
  database,
  now = () => Date.now(),
  leaderboardLimit = DEFAULT_LEADERBOARD_LIMIT,
  readLimit = DEFAULT_READ_LIMIT,
  readWindowSeconds = DEFAULT_READ_WINDOW_SECONDS,
  startLimit = DEFAULT_START_LIMIT,
  startWindowSeconds = DEFAULT_START_WINDOW_SECONDS,
  finishLimit = DEFAULT_FINISH_LIMIT,
  finishWindowSeconds = DEFAULT_FINISH_WINDOW_SECONDS,
} = {}) {
  if (!database?.query || !database?.transaction) throw new Error('CCG Weekly Vault requires a database boundary.');
  if (typeof now !== 'function') throw new Error('CCG Weekly Vault requires a clock function.');

  const maxLeaders = positiveInteger(leaderboardLimit, DEFAULT_LEADERBOARD_LIMIT, 'Weekly Vault leaderboard limit');
  const limits = Object.freeze({
    read: Object.freeze({ limit: positiveInteger(readLimit, DEFAULT_READ_LIMIT, 'Weekly Vault read limit'), window: positiveInteger(readWindowSeconds, DEFAULT_READ_WINDOW_SECONDS, 'Weekly Vault read window') }),
    start: Object.freeze({ limit: positiveInteger(startLimit, DEFAULT_START_LIMIT, 'Weekly Vault start limit'), window: positiveInteger(startWindowSeconds, DEFAULT_START_WINDOW_SECONDS, 'Weekly Vault start window') }),
    finish: Object.freeze({ limit: positiveInteger(finishLimit, DEFAULT_FINISH_LIMIT, 'Weekly Vault finish limit'), window: positiveInteger(finishWindowSeconds, DEFAULT_FINISH_WINDOW_SECONDS, 'Weekly Vault finish window') }),
  });

  async function consumeBudget(scope, fingerprint) {
    const policy = limits[scope];
    if (!policy) throw new Error(`Unknown Weekly Vault budget scope: ${scope}`);
    const identity = String(fingerprint || 'unknown').slice(0, 512);
    const bucketKey = `weekly:${scope}:${sha256(`${scope}|${identity}`)}`;
    const nowDate = new Date(now());
    if (!Number.isFinite(nowDate.getTime())) throw new Error('Invalid Weekly Vault clock.');

    return database.transaction(async (tx) => {
      await tx.query(
        `insert into lost_sizzler_request_buckets
          (bucket_key, window_started_at, request_count, updated_at)
         values ($1, $2, 0, $2)
         on conflict (bucket_key) do nothing`,
        [bucketKey, nowDate]
      );
      const currentResult = await tx.query(
        `select window_started_at, request_count
           from lost_sizzler_request_buckets
          where bucket_key = $1
          for update`,
        [bucketKey]
      );
      const current = currentResult.rows?.[0];
      if (!current) throw new Error('Weekly Vault request budget row disappeared.');

      const startedMs = new Date(current.window_started_at).getTime();
      const windowMs = policy.window * 1000;
      if (!Number.isFinite(startedMs) || nowDate.getTime() - startedMs >= windowMs) {
        await tx.query(
          `update lost_sizzler_request_buckets
              set window_started_at = $2, request_count = 1, updated_at = $2
            where bucket_key = $1`,
          [bucketKey, nowDate]
        );
        return Object.freeze({ allowed: true, retryAfterSeconds: policy.window });
      }

      const nextCount = Number(current.request_count) + 1;
      await tx.query(
        `update lost_sizzler_request_buckets
            set request_count = $2, updated_at = $3
          where bucket_key = $1`,
        [bucketKey, nextCount, nowDate]
      );
      const retryAfterSeconds = Math.max(1, Math.ceil((startedMs + windowMs - nowDate.getTime()) / 1000));
      return Object.freeze({ allowed: nextCount <= policy.limit, retryAfterSeconds });
    });
  }

  async function enforceBudget(scope, fingerprint) {
    const budget = await consumeBudget(scope, fingerprint);
    if (budget.allowed) return;
    const error = httpError(429, 'weekly_rate_limited');
    error.retryAfterSeconds = budget.retryAfterSeconds;
    throw error;
  }

  async function profileFor(userId, query = database.query.bind(database)) {
    const result = await query(
      `select username, display_name, banned
         from ccg_profiles
        where user_id = $1`,
      [userId]
    );
    return result.rows?.[0] ?? null;
  }

  async function requireUsableProfile(userId, query = database.query.bind(database)) {
    const profile = await profileFor(userId, query);
    if (!profile || profile.banned) throw httpError(403, 'weekly_account_unavailable');
    const playerName = normalizePlayerName(profile);
    if (!playerName) throw httpError(409, 'weekly_profile_name_required');
    return Object.freeze({ profile, playerName });
  }

  async function leadersFor(week) {
    const result = await database.query(
      `select player_name, score, deepest_floor, duration_ms, level, completed
         from ccq_weekly_leaderboard
        where week_start = $1
        order by score desc, deepest_floor desc, duration_ms asc
        limit $2`,
      [week, maxLeaders]
    );
    return (result.rows || []).map(normalizeLeaderboardRow);
  }

  async function ghostFor(week, excludeUserId = null) {
    const params = excludeUserId ? [week, excludeUserId] : [week];
    const exclusion = excludeUserId ? 'and user_id <> $2' : '';
    const result = await database.query(
      `select user_id, player_name, score, deepest_floor, stats, ghost_path
         from ccq_weekly_attempts
        where week_start = $1
          and status = 'finished'
          ${exclusion}
        order by score desc nulls last, deepest_floor desc nulls last, duration_ms asc nulls last
        limit 20`,
      params
    );
    for (const row of result.rows || []) {
      const path = sanitizeGhostPath(
        Array.isArray(row.ghost_path) && row.ghost_path.length ? row.ghost_path : row.stats?.ghostPath
      );
      if (path.length < 2) continue;
      return Object.freeze({
        playerName: String(row.player_name || 'Weekly Player').slice(0, 64),
        score: boundedInteger(row.score, 0, 99_999_999),
        deepestFloor: boundedInteger(row.deepest_floor, 1, 5),
        path,
      });
    }
    return null;
  }

  async function upsertLeaderboard(tx, attempt, persisted) {
    await tx.query(
      `insert into ccq_weekly_leaderboard
        (attempt_id, week_start, player_name, score, deepest_floor, duration_ms, level, completed, recorded_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (attempt_id) do update
         set week_start = excluded.week_start,
             player_name = excluded.player_name,
             score = excluded.score,
             deepest_floor = excluded.deepest_floor,
             duration_ms = excluded.duration_ms,
             level = excluded.level,
             completed = excluded.completed,
             recorded_at = now()`,
      [
        attempt.id,
        attempt.week_start,
        attempt.player_name,
        persisted.score,
        persisted.deepestFloor,
        persisted.durationMs,
        persisted.level,
        persisted.completed,
      ]
    );
  }

  async function status({ userId = null, fingerprint = '' } = {}) {
    await enforceBudget('read', fingerprint);
    const weekStart = weekStartUtc(now());
    const seed = seedForWeek(weekStart);
    const normalizedUserId = userId ? normalizeUserId(userId) : null;
    const [leaderboard, ghostReplay] = await Promise.all([
      leadersFor(weekStart),
      ghostFor(weekStart, normalizedUserId),
    ]);

    if (!normalizedUserId) {
      return Object.freeze({ ok: true, ready: true, signedIn: false, locked: false, weekStart, seed, leaderboard, ghostReplay });
    }

    const [profile, attemptResult] = await Promise.all([
      profileFor(normalizedUserId),
      database.query(
        `select id, status, started_at, finished_at, score, deepest_floor
           from ccq_weekly_attempts
          where week_start = $1 and user_id = $2`,
        [weekStart, normalizedUserId]
      ),
    ]);
    const playerName = normalizePlayerName(profile);
    const attempt = attemptResult.rows?.[0] ?? null;
    return Object.freeze({
      ok: true,
      ready: true,
      signedIn: Boolean(playerName && profile && !profile.banned),
      locked: Boolean(attempt),
      weekStart,
      seed,
      playerName,
      attempt,
      leaderboard,
      ghostReplay,
    });
  }

  async function ghost({ userId, fingerprint = '' } = {}) {
    await enforceBudget('read', fingerprint);
    const normalizedUserId = normalizeUserId(userId);
    await requireUsableProfile(normalizedUserId);
    const weekStart = weekStartUtc(now());
    const ghostReplay = await ghostFor(weekStart, normalizedUserId);
    return Object.freeze({ ok: true, weekStart, ghost: ghostReplay, ghostReplay });
  }

  async function start({ userId, fingerprint = '' } = {}) {
    await enforceBudget('start', fingerprint);
    const normalizedUserId = normalizeUserId(userId);
    const weekStart = weekStartUtc(now());
    const seed = seedForWeek(weekStart);

    const attempt = await database.transaction(async (tx) => {
      const { playerName } = await requireUsableProfile(normalizedUserId, tx.query.bind(tx));
      const inserted = await tx.query(
        `insert into ccq_weekly_attempts
          (week_start, user_id, player_name, seed)
         values ($1, $2, $3, $4)
         on conflict (week_start, user_id) do nothing
         returning id, status, started_at`,
        [weekStart, normalizedUserId, playerName, seed]
      );
      const row = inserted.rows?.[0] ?? null;
      if (!row) throw httpError(409, 'weekly_attempt_already_used');
      return Object.freeze({ ...row, playerName });
    });

    const [leaderboard, ghostReplay] = await Promise.all([
      leadersFor(weekStart),
      ghostFor(weekStart, normalizedUserId),
    ]);
    return Object.freeze({
      ok: true,
      signedIn: true,
      locked: true,
      weekStart,
      playerName: attempt.playerName,
      seed,
      attempt: Object.freeze({ id: attempt.id, status: attempt.status, started_at: attempt.started_at }),
      leaderboard,
      ghostReplay,
    });
  }

  async function finish({ userId, attemptId, result, fingerprint = '' } = {}) {
    await enforceBudget('finish', fingerprint);
    const normalizedUserId = normalizeUserId(userId);
    const normalizedAttemptId = normalizeAttemptId(attemptId);
    await requireUsableProfile(normalizedUserId);

    const outcome = await database.transaction(async (tx) => {
      const attemptResult = await tx.query(
        `select id, user_id, player_name, week_start, status, started_at, finished_at,
                score, deepest_floor, duration_ms, level, completed, stats, ghost_path
           from ccq_weekly_attempts
          where id = $1 and user_id = $2
          for update`,
        [normalizedAttemptId, normalizedUserId]
      );
      const attempt = attemptResult.rows?.[0] ?? null;
      if (!attempt) throw httpError(404, 'weekly_attempt_not_found');

      if (attempt.status === 'finished') {
        const persisted = normalizePersistedAttempt(attempt);
        await upsertLeaderboard(tx, attempt, persisted);
        return Object.freeze({ weekStart: String(attempt.week_start), idempotent: true });
      }
      if (attempt.status !== 'started') throw httpError(409, 'weekly_attempt_invalid_state');

      const validated = validateWeeklyResult(result, attempt.started_at, now());
      const changedAt = new Date(now());
      const updated = await tx.query(
        `update ccq_weekly_attempts
            set status = 'finished',
                finished_at = $3,
                score = $4,
                deepest_floor = $5,
                duration_ms = $6,
                level = $7,
                completed = $8,
                stats = $9::jsonb,
                ghost_path = $10::jsonb
          where id = $1 and user_id = $2 and status = 'started'
          returning id, user_id, player_name, week_start, status, started_at, finished_at,
                    score, deepest_floor, duration_ms, level, completed, stats, ghost_path`,
        [
          normalizedAttemptId,
          normalizedUserId,
          changedAt,
          validated.score,
          validated.deepestFloor,
          validated.durationMs,
          validated.level,
          validated.completed,
          JSON.stringify(validated.stats),
          JSON.stringify(validated.path),
        ]
      );
      const stored = updated.rows?.[0] ?? null;
      if (!stored) throw httpError(409, 'weekly_attempt_finalization_conflict');
      await upsertLeaderboard(tx, stored, validated);
      return Object.freeze({ weekStart: String(stored.week_start), idempotent: false });
    });

    const [leaderboard, ghostReplay] = await Promise.all([
      leadersFor(outcome.weekStart),
      ghostFor(outcome.weekStart, normalizedUserId),
    ]);
    return Object.freeze({
      ok: true,
      locked: true,
      idempotent: outcome.idempotent,
      weekStart: outcome.weekStart,
      leaderboard,
      ghostReplay,
    });
  }

  return Object.freeze({ status, ghost, start, finish });
}
