import crypto from 'node:crypto';

export const MAX_SAVE_BYTES = 512 * 1024;
export const MAX_REQUEST_BYTES = MAX_SAVE_BYTES + 64 * 1024;
const DEFAULT_SCHEMA_NAME = 'ccg-lost-sizzler-solo-save';
const DEFAULT_SCHEMA_VERSION = 2;
const DEFAULT_GAME_VERSION = 'V10.41';

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

function readEnvelopeMetadata(payload, body) {
  const schemaName = String(payload?.schema || DEFAULT_SCHEMA_NAME).slice(0, 80);
  const rawSchemaVersion = Number(payload?.schemaVersion ?? DEFAULT_SCHEMA_VERSION);
  const schemaVersion = Number.isSafeInteger(rawSchemaVersion) && rawSchemaVersion > 0
    ? rawSchemaVersion
    : DEFAULT_SCHEMA_VERSION;
  const gameVersion = String(payload?.gameVersion || DEFAULT_GAME_VERSION).slice(0, 80);
  const saveChecksum = typeof payload?.checksum === 'string' ? payload.checksum.slice(0, 128) : null;
  const savedAtMs = Number(payload?.savedAt || 0);
  const explicitClientRevision = Number(body?.client_revision_ms);
  const clientRevisionMs = Number.isSafeInteger(explicitClientRevision) && explicitClientRevision >= 0
    ? explicitClientRevision
    : (Number.isSafeInteger(savedAtMs) && savedAtMs >= 0 ? savedAtMs : 0);
  const saveSavedAt = Number.isSafeInteger(savedAtMs) && savedAtMs > 0 ? new Date(savedAtMs) : null;

  return Object.freeze({
    schemaName,
    schemaVersion,
    gameVersion,
    saveChecksum,
    saveSavedAt,
    clientRevisionMs,
  });
}

export function validateCloudSaveWrite(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'invalid_request');
  const expectedRevision = body.expected_revision;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw httpError(400, 'invalid_expected_revision');
  }
  if (body.client_revision_ms !== undefined && (!Number.isSafeInteger(body.client_revision_ms) || body.client_revision_ms < 0)) {
    throw httpError(400, 'invalid_client_revision_ms');
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
    metadata: readEnvelopeMetadata(body.payload, body),
  });
}

export function decideSaveWrite(current, input) {
  if (current && current.payload_sha256 === input.payloadSha256 && current.deleted_at == null) {
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
    payload: row.save_envelope,
    payload_sha256: row.payload_sha256,
    schema_name: row.schema_name,
    schema_version: Number(row.schema_version),
    game_version: row.game_version,
    save_checksum: row.save_checksum,
    save_saved_at: row.save_saved_at,
    client_revision_ms: Number(row.client_revision_ms || 0),
    deleted_at: row.deleted_at,
    updated_at: row.updated_at,
    idempotent,
  });
}

const RETURNING_FIELDS = `revision, schema_name, schema_version, game_version,
  save_envelope, save_checksum, payload_sha256, save_saved_at,
  client_revision_ms, deleted_at, updated_at`;

export function createCloudSaveStore(database) {
  return Object.freeze({
    async get(userId) {
      const result = await database.query(
        `select ${RETURNING_FIELDS}
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
           on conflict (user_id) do nothing`,
          [userId]
        );
        await tx.query('select user_id from ccg_users where user_id = $1 for update', [userId]);

        const currentResult = await tx.query(
          `select ${RETURNING_FIELDS}
             from lost_sizzler_cloud_saves
            where user_id = $1`,
          [userId]
        );
        const current = currentResult.rows?.[0] ?? null;
        const decision = decideSaveWrite(current, input);

        if (decision.kind === 'idempotent') return normalizeSaveRow(current, true);

        const metadata = input.metadata;
        if (decision.kind === 'create') {
          const created = await tx.query(
            `insert into lost_sizzler_cloud_saves
              (user_id, revision, schema_name, schema_version, game_version,
               save_envelope, save_checksum, payload_sha256, save_saved_at,
               client_revision_ms, deleted_at, updated_at)
             values ($1, 1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, null, now())
             returning ${RETURNING_FIELDS}`,
            [
              userId,
              metadata.schemaName,
              metadata.schemaVersion,
              metadata.gameVersion,
              JSON.stringify(input.payload),
              metadata.saveChecksum,
              input.payloadSha256,
              metadata.saveSavedAt,
              metadata.clientRevisionMs,
            ]
          );
          return normalizeSaveRow(created.rows[0]);
        }

        const updated = await tx.query(
          `update lost_sizzler_cloud_saves
              set revision = $2,
                  schema_name = $3,
                  schema_version = $4,
                  game_version = $5,
                  save_envelope = $6::jsonb,
                  save_checksum = $7,
                  payload_sha256 = $8,
                  save_saved_at = $9,
                  client_revision_ms = $10,
                  deleted_at = null,
                  updated_at = now()
            where user_id = $1
            returning ${RETURNING_FIELDS}`,
          [
            userId,
            decision.revision,
            metadata.schemaName,
            metadata.schemaVersion,
            metadata.gameVersion,
            JSON.stringify(input.payload),
            metadata.saveChecksum,
            input.payloadSha256,
            metadata.saveSavedAt,
            metadata.clientRevisionMs,
          ]
        );
        return normalizeSaveRow(updated.rows[0]);
      });
    },
  });
}
