import crypto from 'node:crypto';

export const MAX_SAVE_BYTES = 512 * 1024;
export const MAX_REQUEST_BYTES = MAX_SAVE_BYTES + 64 * 1024;

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function canonicalize(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw httpError(400, 'invalid_save_payload');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  throw httpError(400, 'invalid_save_payload');
}

export function canonicalSaveJson(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw httpError(400, 'invalid_save_payload');
  }
  return canonicalize(payload);
}

export function hashSavePayload(payload) {
  const canonical = canonicalSaveJson(payload);
  const bytes = Buffer.from(canonical, 'utf8');
  if (bytes.length > MAX_SAVE_BYTES) throw httpError(413, 'save_payload_too_large');
  return Object.freeze({
    canonical,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}

export function validateCloudSaveWrite(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'invalid_request');
  const expectedRevision = body.expected_revision;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw httpError(400, 'invalid_expected_revision');
  }
  if (!/^[0-9a-f]{64}$/.test(body.payload_sha256 ?? '')) {
    throw httpError(400, 'invalid_payload_sha256');
  }
  const payloadProof = hashSavePayload(body.payload);
  if (payloadProof.sha256 !== body.payload_sha256) throw httpError(400, 'payload_sha256_mismatch');
  return Object.freeze({
    expectedRevision,
    payload: body.payload,
    payloadSha256: payloadProof.sha256,
    payloadBytes: payloadProof.bytes,
  });
}

export function decideSaveWrite(current, input) {
  if (current && current.payload_sha256 === input.payloadSha256) {
    return Object.freeze({ kind: 'idempotent', revision: Number(current.revision) });
  }
  if (!current) {
    if (input.expectedRevision !== 0) throw httpError(409, 'save_revision_conflict');
    return Object.freeze({ kind: 'create', revision: 1 });
  }
  const currentRevision = Number(current.revision);
  if (!Number.isSafeInteger(currentRevision) || currentRevision < 1) throw new Error('Invalid stored save revision');
  if (input.expectedRevision !== currentRevision) throw httpError(409, 'save_revision_conflict');
  return Object.freeze({ kind: 'update', revision: currentRevision + 1 });
}

export async function readJsonBody(request) {
  const contentType = String(request.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) throw httpError(415, 'content_type_must_be_json');

  const declaredLength = Number(request.headers['content-length'] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw httpError(413, 'request_too_large');
  }

  const chunks = [];
  let received = 0;
  for await (const chunk of request) {
    received += chunk.length;
    if (received > MAX_REQUEST_BYTES) throw httpError(413, 'request_too_large');
    chunks.push(chunk);
  }
  if (received === 0) throw httpError(400, 'empty_request_body');

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'invalid_json');
  }
}

function normalizeSaveRow(row, idempotent = false) {
  if (!row) return null;
  return Object.freeze({
    revision: Number(row.revision),
    payload: row.save_payload,
    payload_sha256: row.payload_sha256,
    saved_at: row.saved_at,
    updated_at: row.updated_at,
    idempotent,
  });
}

export function createCloudSaveStore(database) {
  return Object.freeze({
    async get(userId) {
      const result = await database.query(
        `select revision, save_payload, payload_sha256, saved_at, updated_at
           from lost_sizzler_cloud_saves
          where user_id = $1`,
        [userId]
      );
      return normalizeSaveRow(result.rows?.[0] ?? null);
    },

    async put(userId, body) {
      const input = validateCloudSaveWrite(body);
      return database.transaction(async (tx) => {
        await tx.query(
          `insert into ccg_users (user_id)
           values ($1)
           on conflict (user_id) do update set updated_at = now()`,
          [userId]
        );
        await tx.query('select user_id from ccg_users where user_id = $1 for update', [userId]);

        const currentResult = await tx.query(
          `select revision, save_payload, payload_sha256, saved_at, updated_at
             from lost_sizzler_cloud_saves
            where user_id = $1`,
          [userId]
        );
        const current = currentResult.rows?.[0] ?? null;
        const decision = decideSaveWrite(current, input);

        if (decision.kind === 'idempotent') return normalizeSaveRow(current, true);

        if (decision.kind === 'create') {
          const created = await tx.query(
            `insert into lost_sizzler_cloud_saves
              (user_id, revision, save_payload, payload_sha256, saved_at, updated_at)
             values ($1, 1, $2::jsonb, $3, now(), now())
             returning revision, save_payload, payload_sha256, saved_at, updated_at`,
            [userId, JSON.stringify(input.payload), input.payloadSha256]
          );
          return normalizeSaveRow(created.rows[0]);
        }

        const updated = await tx.query(
          `update lost_sizzler_cloud_saves
              set revision = $2,
                  save_payload = $3::jsonb,
                  payload_sha256 = $4,
                  saved_at = now(),
                  updated_at = now()
            where user_id = $1
            returning revision, save_payload, payload_sha256, saved_at, updated_at`,
          [userId, decision.revision, JSON.stringify(input.payload), input.payloadSha256]
        );
        return normalizeSaveRow(updated.rows[0]);
      });
    },
  });
}
