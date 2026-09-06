import assert from 'node:assert/strict';
import { createCcgAuthClient } from '../client/ccg-auth-client.mjs';
import { createCcgAuthProvider } from '../client/ccg-auth-provider.mjs';

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === undefined ? '' : JSON.stringify(body);
    },
  };
}

const calls = [];
const queue = [];
const fetchImpl = async (url, options) => {
  calls.push({ url: String(url), options: structuredClone(options) });
  if (!queue.length) throw new Error(`Unexpected auth request: ${url}`);
  return queue.shift();
};

const provider = createCcgAuthProvider({
  provider: 'ccg',
  ccgBaseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  supabaseBridge: {
    async getClient() {
      throw new Error('Explicit CCG registration must not activate Supabase.');
    },
  },
});

queue.push(response(202, { accepted: true, verification_required: true }));
const absentChoice = await provider.signUp({
  email: 'absent@example.test',
  password: 'registration-password',
  options: { data: { notify_new_games: true, notify_newsletter: true } },
});
assert.equal(absentChoice.ok, true);
assert.deepEqual(JSON.parse(calls[0].options.body), {
  email: 'absent@example.test',
  password: 'registration-password',
}, 'Notification values must not be persisted unless the registration UI recorded that the choice was presented.');

queue.push(response(202, { accepted: true, verification_required: true }));
const supabaseStyleChoice = await provider.signUp({
  email: 'metadata@example.test',
  password: 'registration-password',
  options: {
    data: {
      notify_new_games: true,
      notify_newsletter: false,
      notification_preferences_presented: true,
      unrelated_metadata: 'must-not-cross-provider-boundary',
    },
  },
});
assert.equal(supabaseStyleChoice.ok, true);
assert.deepEqual(JSON.parse(calls[1].options.body), {
  email: 'metadata@example.test',
  password: 'registration-password',
  notification_preferences: {
    notify_new_games: true,
    notify_newsletter: false,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  },
}, 'Only recognized registration preference fields may cross into the CCG account endpoint.');

queue.push(response(202, { accepted: true, verification_required: true }));
const browserStyleChoice = await provider.signUp({
  email: 'browser@example.test',
  password: 'registration-password',
  notificationPreferences: {
    notifyNewGames: false,
    notifyNewsletter: true,
    choiceRecorded: true,
  },
});
assert.equal(browserStyleChoice.ok, true);
assert.deepEqual(JSON.parse(calls[2].options.body), {
  email: 'browser@example.test',
  password: 'registration-password',
  notification_preferences: {
    notify_new_games: false,
    notify_newsletter: true,
    notify_new_games_choice_recorded: true,
    notify_newsletter_choice_recorded: true,
  },
});

queue.push(response(202, { accepted: true, verification_required: true }));
const unrecordedBrowserChoice = await provider.signUp({
  email: 'unrecorded@example.test',
  password: 'registration-password',
  notificationPreferences: {
    notifyNewGames: true,
    notifyNewsletter: true,
    choiceRecorded: false,
  },
});
assert.equal(unrecordedBrowserChoice.ok, true);
assert.deepEqual(JSON.parse(calls[3].options.body), {
  email: 'unrecorded@example.test',
  password: 'registration-password',
});

const directClient = createCcgAuthClient({
  baseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
});
const callsBeforeInvalid = calls.length;
const invalidPreferences = await directClient.register({
  email: 'invalid@example.test',
  password: 'registration-password',
  notification_preferences: {
    notify_new_games: true,
    notify_newsletter: false,
    notify_new_games_choice_recorded: true,
  },
});
assert.equal(invalidPreferences.ok, false);
assert.equal(invalidPreferences.kind, 'invalid_request');
assert.equal(invalidPreferences.error, 'invalid_notification_preferences');
assert.equal(calls.length, callsBeforeInvalid, 'Malformed preference data must fail before any network request.');

const unrecordedWirePreferences = await directClient.register({
  email: 'invalid-recorded@example.test',
  password: 'registration-password',
  notification_preferences: {
    notify_new_games: true,
    notify_newsletter: false,
    notify_new_games_choice_recorded: false,
    notify_newsletter_choice_recorded: false,
  },
});
assert.equal(unrecordedWirePreferences.ok, false);
assert.equal(unrecordedWirePreferences.kind, 'invalid_request');
assert.equal(unrecordedWirePreferences.error, 'invalid_notification_preferences');
assert.equal(calls.length, callsBeforeInvalid, 'Unrecorded choices must never create a registration preference request.');

console.log('CCG registration preference contract passed: provider metadata is allowlisted, choices cross the boundary only when recorded, and malformed/unrecorded wire preferences fail before network access.');
