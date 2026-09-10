import crypto from 'node:crypto';

const TELEMETRY_EVENTS = new Set([
  'start_click',
  'run_started',
  'run_started_detail',
  'floor_reached',
  'floor_cleared',
  'run_ended',
  'mobile_pc_notice_accept',
  'rating_submitted',
  'rating_dismissed',
  'client_error',
]);
const DEVICE_TYPES = new Set(['desktop', 'mobile', 'tablet', 'unknown']);
const TELEMETRY_LIMIT = 120;
const TELEMETRY_WINDOW_SECONDS = 300;
const CLIENT_ERROR_LIMIT = 12;
const CLIENT_ERROR_WINDOW_SECONDS = 3600;
const RATING_STATUS_LIMIT = 60;
const RATING_STATUS_WINDOW_SECONDS = 300;
const FEEDBACK_LIMIT = 8;
const FEEDBACK_WINDOW_SECONDS = 3600;
const TELEMETRY_RETENTION_DAYS = 90;
const TELEMETRY_PRUNE_CHANCE = 0.02;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_DESTINATION = 'info@cheekycommodoregamer.co.uk';

function httpError(statusCode, code, message = code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function text(value) {
  return String(value ?? '').trim();
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function boundedInteger(value, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function boundedText(value, max) {
  return text(value).replace(/\s+/g, ' ').slice(0, max);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeNow(now) {
  const value = now();
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid feedback service clock.');
  return date;
}

export function telemetryMetadata(value, eventType) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const metadata = {};
  const floor = boundedInteger(value.floor, 1, 100);
  const nextFloor = boundedInteger(value.next_floor, 1, 100);
  const score = boundedInteger(value.score, 0, 2_000_000_000);
  const kills = boundedInteger(value.kills, 0, 10_000_000);
  const level = boundedInteger(value.level, 1, 10_000);
  const durationMs = boundedInteger(value.duration_ms, 0, 604_800_000);
  const outcome = boundedText(value.outcome, 24).toLowerCase();

  if (floor !== null) metadata.floor = floor;
  if (nextFloor !== null) metadata.next_floor = nextFloor;
  if (score !== null) metadata.score = score;
  if (kills !== null) metadata.kills = kills;
  if (level !== null) metadata.level = level;
  if (durationMs !== null) metadata.duration_ms = durationMs;
  if (outcome) metadata.outcome = outcome;

  if (eventType === 'client_error') {
    const errorKind = boundedText(value.error_kind, 24).toLowerCase();
    const errorMessage = boundedText(value.error_message, 180);
    const errorFingerprint = boundedText(value.error_fingerprint, 64).replace(/[^a-zA-Z0-9_-]/g, '');
    const errorSource = boundedText(value.source, 120);
    const line = boundedInteger(value.line, 0, 10_000_000);
    const column = boundedInteger(value.column, 0, 10_000_000);
    if (errorKind) metadata.error_kind = errorKind;
    if (errorMessage) metadata.error_message = errorMessage;
    if (errorFingerprint) metadata.error_fingerprint = errorFingerprint;
    if (errorSource) metadata.source = errorSource;
    if (line !== null) metadata.line = line;
    if (column !== null) metadata.column = column;
  }

  return Object.keys(metadata).length ? Object.freeze(metadata) : null;
}

export function normalizeTelemetryPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw httpError(400, 'invalid_request', 'Invalid telemetry request');
  }

  const eventType = text(payload.event_type).toLowerCase();
  if (!TELEMETRY_EVENTS.has(eventType)) {
    throw httpError(400, 'unknown_telemetry_event', 'Unknown telemetry event');
  }

  const rawDevice = text(payload.device_type).toLowerCase();
  const deviceType = DEVICE_TYPES.has(rawDevice) ? rawDevice : 'unknown';
  const playerName = text(payload.player_name).slice(0, 40);
  const playMode = text(payload.play_mode).slice(0, 40);
  const sessionToken = text(payload.session_token).slice(0, 100);
  const build = text(payload.build).slice(0, 40);
  const pageUrl = text(payload.page_url).slice(0, 500);
  const ratingValue = Number(payload.rating);
  const rating = Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5
    ? ratingValue
    : null;
  const metadata = telemetryMetadata(payload.metadata, eventType);

  if (eventType === 'rating_submitted' && rating === null) {
    throw httpError(400, 'invalid_rating', 'Rating must be between 1 and 5');
  }
  if (eventType === 'client_error' && !metadata?.error_fingerprint) {
    throw httpError(400, 'client_error_fingerprint_required', 'Client error fingerprint required');
  }

  return Object.freeze({
    eventType,
    playerName: playerName || null,
    playMode: playMode || null,
    sessionToken: sessionToken || null,
    deviceType,
    rating: eventType === 'rating_submitted' ? rating : null,
    build: build || null,
    pageUrl: pageUrl || null,
    metadata,
  });
}

export function normalizeFeedbackPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw httpError(400, 'invalid_request', 'Invalid feedback request');
  }

  const feedbackType = text(payload.type).toLowerCase() === 'suggestion' ? 'suggestion' : 'bug';
  const message = text(payload.message);
  const contactEmail = text(payload.email);
  const honeypot = text(payload.website);
  const build = text(payload.build).slice(0, 40);
  const pageUrl = text(payload.page_url).slice(0, 500);

  if (message.length < 10 || message.length > 3000) {
    throw httpError(400, 'invalid_feedback_length', 'Feedback must be between 10 and 3000 characters');
  }
  if (contactEmail.length > 180 || !validEmail(contactEmail)) {
    throw httpError(400, 'invalid_feedback_email', 'Please enter a valid email address');
  }

  return Object.freeze({
    feedbackType,
    message,
    contactEmail: contactEmail || null,
    honeypot,
    build: build || null,
    pageUrl: pageUrl || null,
  });
}

function normalizeEmailConfiguration(email = {}) {
  const resendApiKey = text(email.resendApiKey);
  const from = text(email.from);
  const replyTo = text(email.replyTo);
  const destination = text(email.destination) || DEFAULT_DESTINATION;
  return Object.freeze({
    resendApiKey,
    from: validEmail(from.match(/<([^<>]+)>/)?.[1] || from) ? from : '',
    replyTo: validEmail(replyTo) ? replyTo : '',
    destination: validEmail(destination) ? destination : DEFAULT_DESTINATION,
  });
}

function emailPayload(feedback, rowId, email) {
  const subject = `[The Lost Sizzler] ${feedback.feedbackType === 'bug' ? 'Bug report' : 'Game suggestion'}`;
  const safeMessage = escapeHtml(feedback.message).replace(/\n/g, '<br>');
  const body = {
    from: email.from,
    to: [email.destination],
    subject,
    html: `<h2>${escapeHtml(subject)}</h2><p>${safeMessage}</p><hr><p><strong>Build:</strong> ${escapeHtml(feedback.build || 'unknown')}</p><p><strong>Page:</strong> ${escapeHtml(feedback.pageUrl || 'unknown')}</p><p><strong>Contact email:</strong> ${escapeHtml(feedback.contactEmail || 'not supplied')}</p><p><strong>Feedback ID:</strong> ${rowId}</p>`,
    text: `${subject}\n\n${feedback.message}\n\nBuild: ${feedback.build || 'unknown'}\nPage: ${feedback.pageUrl || 'unknown'}\nContact email: ${feedback.contactEmail || 'not supplied'}\nFeedback ID: ${rowId}`,
  };
  const replyTo = feedback.contactEmail || email.replyTo;
  if (replyTo && validEmail(replyTo)) body.reply_to = replyTo;
  return body;
}

export function createLostSizzlerFeedbackService({
  database,
  now = () => Date.now(),
  random = Math.random,
  fetchImpl = globalThis.fetch,
  email = {},
} = {}) {
  if (!database?.query || !database?.transaction) {
    throw new Error('Lost Sizzler feedback requires a database boundary.');
  }
  if (typeof now !== 'function') throw new Error('Lost Sizzler feedback requires a clock function.');
  if (typeof random !== 'function') throw new Error('Lost Sizzler feedback requires a random function.');
  const emailConfig = normalizeEmailConfiguration(email);

  async function consumeBudget(bucketKey, limit, windowSeconds) {
    const key = text(bucketKey).slice(0, 160);
    if (!key) throw new Error('Lost Sizzler request budget key is required.');
    const changedAt = safeNow(now);

    return database.transaction(async (tx) => {
      await tx.query(
        `insert into lost_sizzler_request_buckets
          (bucket_key, window_started_at, request_count, updated_at)
         values ($1, $2, 0, $2)
         on conflict (bucket_key) do nothing`,
        [key, changedAt]
      );
      const currentResult = await tx.query(
        `select window_started_at, request_count
           from lost_sizzler_request_buckets
          where bucket_key = $1
          for update`,
        [key]
      );
      const current = currentResult.rows?.[0];
      if (!current) throw new Error('Lost Sizzler request budget row disappeared.');

      const startedMs = new Date(current.window_started_at).getTime();
      const windowMs = windowSeconds * 1000;
      if (!Number.isFinite(startedMs) || changedAt.getTime() - startedMs >= windowMs) {
        await tx.query(
          `update lost_sizzler_request_buckets
              set window_started_at = $2, request_count = 1, updated_at = $2
            where bucket_key = $1`,
          [key, changedAt]
        );
        return Object.freeze({ allowed: true, retryAfterSeconds: windowSeconds });
      }

      const nextCount = Number(current.request_count) + 1;
      await tx.query(
        `update lost_sizzler_request_buckets
            set request_count = $2, updated_at = $3
          where bucket_key = $1`,
        [key, nextCount, changedAt]
      );
      return Object.freeze({
        allowed: nextCount <= limit,
        retryAfterSeconds: Math.max(
          1,
          Math.min(windowSeconds, Math.ceil((startedMs + windowMs - changedAt.getTime()) / 1000))
        ),
      });
    });
  }

  async function enforceBudget(bucketKey, limit, windowSeconds) {
    let budget;
    try {
      budget = await consumeBudget(bucketKey, limit, windowSeconds);
    } catch {
      throw httpError(503, 'service_temporarily_unavailable', 'Service temporarily unavailable');
    }
    if (budget.allowed) return;
    const error = httpError(429, 'too_many_requests', 'Too many requests. Please try again shortly.');
    error.retryAfterSeconds = budget.retryAfterSeconds;
    throw error;
  }

  async function maybePruneTelemetry() {
    if (random() >= TELEMETRY_PRUNE_CHANCE) return;
    let budget;
    try {
      budget = await consumeBudget('maintenance:telemetry-prune', 1, 86_400);
    } catch {
      return;
    }
    if (!budget.allowed) return;
    try {
      await database.query(
        `delete from game_play_events
          where created_at < $1`,
        [new Date(safeNow(now).getTime() - TELEMETRY_RETENTION_DAYS * 86_400_000)]
      );
    } catch {
      // Retention maintenance is best-effort and must not fail an accepted event.
    }
  }

  async function ratingStatus({ authUserId = null, fingerprint = 'unknown' } = {}) {
    await enforceBudget(`rating-status:${fingerprint}`, RATING_STATUS_LIMIT, RATING_STATUS_WINDOW_SECONDS);
    const userId = text(authUserId);
    if (!userId) {
      return Object.freeze({ success: true, authenticated: false, rated: false });
    }

    let existing;
    try {
      existing = await database.query(
        `select id
           from game_play_events
          where game_slug = 'the-lost-sizzler'
            and event_type = 'rating_submitted'
            and auth_user_id = $1
          limit 1`,
        [userId]
      );
    } catch {
      throw httpError(500, 'rating_status_failed', 'Rating status could not be checked');
    }
    return Object.freeze({
      success: true,
      authenticated: true,
      rated: Boolean(existing.rows?.[0]?.id),
    });
  }

  async function recordTelemetry({
    payload,
    authUserId = null,
    fingerprint = 'unknown',
    userAgent = '',
  } = {}) {
    const normalized = normalizeTelemetryPayload(payload);
    const errorEvent = normalized.eventType === 'client_error';
    await enforceBudget(
      `telemetry:${errorEvent ? 'error' : 'game'}:${fingerprint}`,
      errorEvent ? CLIENT_ERROR_LIMIT : TELEMETRY_LIMIT,
      errorEvent ? CLIENT_ERROR_WINDOW_SECONDS : TELEMETRY_WINDOW_SECONDS
    );

    let inserted;
    try {
      inserted = await database.query(
        `insert into game_play_events
          (game_slug, event_type, player_name, play_mode, device_type, rating,
           session_token, auth_user_id, build, page_url, user_agent, metadata)
         values ('the-lost-sizzler', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
         returning id`,
        [
          normalized.eventType,
          normalized.playerName,
          normalized.playMode,
          normalized.deviceType,
          normalized.rating,
          normalized.sessionToken,
          text(authUserId) || null,
          normalized.build,
          normalized.pageUrl,
          text(userAgent).slice(0, 500) || null,
          normalized.metadata ? JSON.stringify(normalized.metadata) : null,
        ]
      );
    } catch {
      throw httpError(500, 'play_event_not_saved', 'Play event could not be saved');
    }
    const id = inserted.rows?.[0]?.id;
    if (!id) throw httpError(500, 'play_event_not_saved', 'Play event could not be saved');

    await maybePruneTelemetry();
    return Object.freeze({ success: true, id });
  }

  async function deliverFeedbackEmail(feedback, rowId) {
    if (!emailConfig.resendApiKey || !emailConfig.from || typeof fetchImpl !== 'function') {
      return Object.freeze({
        status: 'failed',
        error: 'RESEND_API_KEY or EMAIL_FROM missing',
      });
    }

    try {
      const response = await fetchImpl(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailConfig.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload(feedback, rowId, emailConfig)),
      });
      if (!response?.ok) {
        const detail = typeof response?.text === 'function' ? (await response.text()).slice(0, 300) : '';
        throw new Error(`Resend ${response?.status ?? 0}: ${detail}`);
      }
      return Object.freeze({ status: 'sent', error: null });
    } catch (error) {
      return Object.freeze({
        status: 'failed',
        error: String(error?.message || error).slice(0, 1000),
      });
    }
  }

  async function submitFeedback({
    payload,
    fingerprint = 'unknown',
    userAgent = '',
  } = {}) {
    const rawPayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    if (text(rawPayload.website)) return Object.freeze({ success: true });

    const normalized = normalizeFeedbackPayload(rawPayload);
    await enforceBudget(`feedback:${fingerprint}`, FEEDBACK_LIMIT, FEEDBACK_WINDOW_SECONDS);

    let inserted;
    try {
      inserted = await database.query(
        `insert into game_feedback
          (game_slug, feedback_type, message, contact_email, page_url, build, user_agent, email_status)
         values ('the-lost-sizzler', $1, $2, $3, $4, $5, $6, 'pending')
         returning id`,
        [
          normalized.feedbackType,
          normalized.message,
          normalized.contactEmail,
          normalized.pageUrl,
          normalized.build,
          text(userAgent).slice(0, 500) || null,
        ]
      );
    } catch {
      throw httpError(500, 'feedback_not_saved', 'Feedback could not be saved');
    }
    const id = inserted.rows?.[0]?.id;
    if (!id) throw httpError(500, 'feedback_not_saved', 'Feedback could not be saved');

    const delivery = await deliverFeedbackEmail(normalized, id);
    try {
      await database.query(
        `update game_feedback
            set email_status = $2, email_error = $3
          where id = $1`,
        [id, delivery.status, delivery.error]
      );
    } catch {
      // Source-compatible behavior: accepted feedback is not discarded if only the
      // follow-up email-status bookkeeping fails.
    }

    return Object.freeze({ success: true, id, email_status: delivery.status });
  }

  return Object.freeze({
    ratingStatus,
    recordTelemetry,
    submitFeedback,
  });
}

export function requestFingerprintValue(remoteAddress, userAgent) {
  const remote = text(remoteAddress) || 'unknown';
  const agent = text(userAgent).slice(0, 180) || 'unknown';
  return crypto.createHash('sha256').update(`${remote}|${agent}`).digest('hex').slice(0, 24);
}
