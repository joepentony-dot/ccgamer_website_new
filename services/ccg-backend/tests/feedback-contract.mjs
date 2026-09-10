import assert from 'node:assert/strict';
import {
  normalizeFeedbackPayload,
  normalizeTelemetryPayload,
  requestFingerprintValue,
  telemetryMetadata,
} from '../src/lost-sizzler-feedback.mjs';

const feedback = normalizeFeedbackPayload({
  type: 'suggestion',
  message: 'Please add another dungeon branch.',
  email: 'player@example.test',
  build: 'V10.41-build-that-is-longer-than-forty-characters-and-must-truncate',
  page_url: 'https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/',
});
assert.equal(feedback.feedbackType, 'suggestion');
assert.equal(feedback.contactEmail, 'player@example.test');
assert.equal(feedback.build.length, 40);

assert.throws(
  () => normalizeFeedbackPayload({ message: 'short' }),
  (error) => error?.statusCode === 400 && error?.message.includes('10 and 3000')
);
assert.throws(
  () => normalizeFeedbackPayload({ message: 'A valid length feedback message', email: 'not-an-email' }),
  (error) => error?.statusCode === 400 && error?.message.includes('valid email')
);

const metadata = telemetryMetadata({
  floor: 999,
  next_floor: 2.9,
  score: 15,
  kills: -2,
  level: 4,
  duration_ms: 1234,
  outcome: '  COMPLETED  ',
  ignored: 'must-not-survive',
}, 'run_ended');
assert.deepEqual(metadata, {
  floor: 100,
  next_floor: 2,
  score: 15,
  kills: 0,
  level: 4,
  duration_ms: 1234,
  outcome: 'completed',
});

const errorMetadata = telemetryMetadata({
  error_kind: ' TypeError ',
  error_message: '  bad   thing  ',
  error_fingerprint: 'abc DEF!_-/123',
  source: ' game-main.js ',
  line: 15.9,
  column: 3,
}, 'client_error');
assert.deepEqual(errorMetadata, {
  error_kind: 'typeerror',
  error_message: 'bad thing',
  error_fingerprint: 'abcDEF_-123',
  source: 'game-main.js',
  line: 15,
  column: 3,
});

const rating = normalizeTelemetryPayload({
  event_type: 'rating_submitted',
  rating: 5,
  device_type: 'DESKTOP',
  player_name: 'Player',
  metadata: { floor: 2 },
});
assert.equal(rating.eventType, 'rating_submitted');
assert.equal(rating.rating, 5);
assert.equal(rating.deviceType, 'desktop');
assert.deepEqual(rating.metadata, { floor: 2 });

assert.throws(
  () => normalizeTelemetryPayload({ event_type: 'rating_submitted', rating: 6 }),
  (error) => error?.statusCode === 400 && error?.message.includes('between 1 and 5')
);
assert.throws(
  () => normalizeTelemetryPayload({ event_type: 'client_error', metadata: {} }),
  (error) => error?.statusCode === 400 && error?.message.includes('fingerprint')
);
assert.throws(
  () => normalizeTelemetryPayload({ event_type: 'made_up_event' }),
  (error) => error?.statusCode === 400 && error?.message.includes('Unknown telemetry')
);

const first = requestFingerprintValue('203.0.113.9', 'Contract Agent');
const second = requestFingerprintValue('203.0.113.9', 'Contract Agent');
const changed = requestFingerprintValue('203.0.113.10', 'Contract Agent');
assert.match(first, /^[0-9a-f]{24}$/);
assert.equal(first, second);
assert.notEqual(first, changed);
assert.equal(first.includes('203.0.113.9'), false);

console.log('Lost Sizzler feedback contract passed: source-compatible validation, telemetry sanitization and one-way request fingerprints are deterministic.');
