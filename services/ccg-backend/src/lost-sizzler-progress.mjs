const MAX_ACHIEVEMENT_METADATA_BYTES = 16 * 1024;
const MAX_COLLECTION_BYTES = 256 * 1024;
const ACHIEVEMENT_KEY = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function objectPayload(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, code);
  return value;
}

function jsonBytes(value, maxBytes, code) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw httpError(400, code);
  }
  if (typeof serialized !== 'string') throw httpError(400, code);
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) throw httpError(413, code);
  return serialized;
}

function normalizeAchievementRow(row, idempotent = false) {
  if (!row) return null;
  return Object.freeze({
    achievement_key: row.achievement_key,
    unlocked_at: row.unlocked_at,
    metadata: row.metadata || {},
    idempotent,
  });
}

function normalizeCollectionRow(row, idempotent = false) {
  if (!row) return null;
  return Object.freeze({
    revision: Number(row.revision),
    payload: row.collection_payload || {},
    updated_at: row.updated_at,
    idempotent,
  });
}

export function validateAchievementUnlock(body) {
  objectPayload(body, 'invalid_achievement_request');
  const achievementKey = String(body.achievement_key || '').trim();
  if (!ACHIEVEMENT_KEY.test(achievementKey)) throw httpError(400, 'invalid_achievement_key');

  const metadata = body.metadata === undefined ? {} : objectPayload(body.metadata, 'invalid_achievement_metadata');
  jsonBytes(metadata, MAX_ACHIEVEMENT_METADATA_BYTES, 'achievement_metadata_too_large');

  let unlockedAt = null;
  if (body.unlocked_at !== undefined && body.unlocked_at !== null && body.unlocked_at !== '') {
    const parsed = new Date(body.unlocked_at);
    if (!Number.isFinite(parsed.getTime())) throw httpError(400, 'invalid_achievement_unlocked_at');
    unlockedAt = parsed;
  }

  return Object.freeze({ achievementKey, metadata, unlockedAt });
}

export function validateCollectionWrite(body) {
  objectPayload(body, 'invalid_collection_request');
  const expectedRevision = body.expected_revision;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw httpError(400, 'invalid_collection_expected_revision');
  }
  const payload = objectPayload(body.payload, 'invalid_collection_payload');
  const serialized = jsonBytes(payload, MAX_COLLECTION_BYTES, 'collection_payload_too_large');
  return Object.freeze({ expectedRevision, payload, serialized });
}

export function createLostSizzlerProgressStore(database) {
  if (!database?.query || !database?.transaction) {
    throw new Error('Lost Sizzler progress requires a database boundary.');
  }

  async function ensureUser(query, userId) {
    await query(
      `insert into ccg_users (user_id)
       values ($1)
       on conflict (user_id) do nothing`,
      [userId]
    );
  }

  return Object.freeze({
    async listAchievements(userId) {
      const result = await database.query(
        `select achievement_key, unlocked_at, metadata
           from lost_sizzler_achievements
          where user_id = $1
          order by unlocked_at asc, achievement_key asc`,
        [userId]
      );
      return Object.freeze((result.rows || []).map((row) => normalizeAchievementRow(row)));
    },

    async unlockAchievement(userId, body) {
      const input = validateAchievementUnlock(body);
      return database.transaction(async (tx) => {
        await ensureUser(tx.query, userId);
        await tx.query('select user_id from ccg_users where user_id = $1 for update', [userId]);

        const existingResult = await tx.query(
          `select achievement_key, unlocked_at, metadata
             from lost_sizzler_achievements
            where user_id = $1 and achievement_key = $2`,
          [userId, input.achievementKey]
        );
        const existing = existingResult.rows?.[0] || null;
        const requestedAt = input.unlockedAt || new Date();

        if (existing) {
          const sameMetadata = JSON.stringify(existing.metadata || {}) === JSON.stringify(input.metadata || {});
          const existingAt = new Date(existing.unlocked_at);
          const earlierAt = requestedAt.getTime() < existingAt.getTime() ? requestedAt : existingAt;
          if (sameMetadata && earlierAt.getTime() === existingAt.getTime()) {
            return normalizeAchievementRow(existing, true);
          }
          const updated = await tx.query(
            `update lost_sizzler_achievements
                set unlocked_at = $3,
                    metadata = metadata || $4::jsonb
              where user_id = $1 and achievement_key = $2
              returning achievement_key, unlocked_at, metadata`,
            [userId, input.achievementKey, earlierAt, JSON.stringify(input.metadata)]
          );
          return normalizeAchievementRow(updated.rows[0]);
        }

        const created = await tx.query(
          `insert into lost_sizzler_achievements
            (user_id, achievement_key, unlocked_at, metadata)
           values ($1, $2, $3, $4::jsonb)
           returning achievement_key, unlocked_at, metadata`,
          [userId, input.achievementKey, requestedAt, JSON.stringify(input.metadata)]
        );
        return normalizeAchievementRow(created.rows[0]);
      });
    },

    async getCollection(userId) {
      const result = await database.query(
        `select revision, collection_payload, updated_at
           from lost_sizzler_collection_state
          where user_id = $1`,
        [userId]
      );
      return normalizeCollectionRow(result.rows?.[0] || null);
    },

    async putCollection(userId, body) {
      const input = validateCollectionWrite(body);
      return database.transaction(async (tx) => {
        await ensureUser(tx.query, userId);
        await tx.query('select user_id from ccg_users where user_id = $1 for update', [userId]);

        const currentResult = await tx.query(
          `select revision, collection_payload, updated_at,
                  collection_payload = $2::jsonb as same_payload
             from lost_sizzler_collection_state
            where user_id = $1`,
          [userId, input.serialized]
        );
        const current = currentResult.rows?.[0] || null;

        if (current?.same_payload === true) return normalizeCollectionRow(current, true);

        if (!current) {
          if (input.expectedRevision !== 0) throw httpError(409, 'collection_revision_conflict');
          const created = await tx.query(
            `insert into lost_sizzler_collection_state
              (user_id, revision, collection_payload, updated_at)
             values ($1, 1, $2::jsonb, now())
             returning revision, collection_payload, updated_at`,
            [userId, input.serialized]
          );
          return normalizeCollectionRow(created.rows[0]);
        }

        const currentRevision = Number(current.revision);
        if (!Number.isSafeInteger(currentRevision) || currentRevision < 1) {
          throw new Error('Invalid stored collection revision.');
        }
        if (input.expectedRevision !== currentRevision) throw httpError(409, 'collection_revision_conflict');

        const updated = await tx.query(
          `update lost_sizzler_collection_state
              set revision = $2,
                  collection_payload = $3::jsonb,
                  updated_at = now()
            where user_id = $1
            returning revision, collection_payload, updated_at`,
          [userId, currentRevision + 1, input.serialized]
        );
        return normalizeCollectionRow(updated.rows[0]);
      });
    },
  });
}
