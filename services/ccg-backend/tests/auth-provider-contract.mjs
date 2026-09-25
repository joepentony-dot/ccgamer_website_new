import assert from 'node:assert/strict';
import { createCcgAuthProvider, normalizeCcgAuthProvider } from '../client/ccg-auth-provider.mjs';

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === undefined ? '' : JSON.stringify(body);
    },
  };
}

assert.equal(normalizeCcgAuthProvider(), 'supabase');
assert.equal(normalizeCcgAuthProvider(' SUPABASE '), 'supabase');
assert.equal(normalizeCcgAuthProvider('ccg'), 'ccg');
assert.throws(() => normalizeCcgAuthProvider('automatic'), /unsupported_auth_provider/);

let supabaseActivations = 0;
const supabaseCalls = [];
const supabaseSession = {
  access_token: 'supabase-access-1',
  user: { id: 'supabase-user-1', email: 'player@example.test' },
};
const supabaseBridge = {
  async getClient() {
    supabaseActivations += 1;
    return {
      auth: {
        async signUp(credentials) {
          supabaseCalls.push(['signUp', credentials]);
          return { data: { session: supabaseSession, user: supabaseSession.user }, error: null };
        },
        async signInWithPassword(credentials) {
          supabaseCalls.push(['signInWithPassword', credentials]);
          return { data: { session: supabaseSession, user: supabaseSession.user }, error: null };
        },
        async refreshSession() {
          supabaseCalls.push(['refreshSession']);
          return { data: { session: supabaseSession, user: supabaseSession.user }, error: null };
        },
        async getUser() {
          supabaseCalls.push(['getUser']);
          return { data: { user: supabaseSession.user }, error: null };
        },
        async resetPasswordForEmail(email, options) {
          supabaseCalls.push(['resetPasswordForEmail', email, options]);
          return { data: {}, error: null };
        },
        async updateUser(update) {
          supabaseCalls.push(['updateUser', update]);
          return { data: { user: supabaseSession.user }, error: null };
        },
        async signOut() {
          supabaseCalls.push(['signOut']);
          return { error: null };
        },
      },
    };
  },
};

const defaultProvider = createCcgAuthProvider({ supabaseBridge });
assert.equal(defaultProvider.provider, 'supabase');
assert.equal(defaultProvider.isSupabase, true);
assert.equal(defaultProvider.isCcg, false);
assert.equal(supabaseActivations, 0, 'Constructing the default provider must not activate Supabase.');
assert.equal(defaultProvider.getAccessToken(), null);
assert.equal(defaultProvider.getUserId(), null);

const supabaseRegistration = await defaultProvider.signUp({
  email: 'player@example.test',
  password: 'registration-secret',
  options: { data: { notify_new_games: true } },
});
assert.equal(supabaseRegistration.ok, true);
assert.equal(supabaseRegistration.provider, 'supabase');
assert.equal(supabaseRegistration.user_id, 'supabase-user-1');
assert.equal(supabaseRegistration.accepted, true);
assert.equal(supabaseRegistration.verification_required, false);
assert.deepEqual(supabaseCalls[0], ['signUp', {
  email: 'player@example.test',
  password: 'registration-secret',
  options: { data: { notify_new_games: true } },
}]);

const supabaseLogin = await defaultProvider.signIn({ email: 'player@example.test', password: 'secret' });
assert.equal(supabaseLogin.ok, true);
assert.equal(supabaseLogin.provider, 'supabase');
assert.equal(supabaseLogin.user_id, 'supabase-user-1');
assert.equal(defaultProvider.getAccessToken(), 'supabase-access-1');
assert.equal(defaultProvider.getUserId(), 'supabase-user-1');
assert.equal(supabaseActivations, 2);
assert.deepEqual(supabaseCalls[1], ['signInWithPassword', { email: 'player@example.test', password: 'secret' }]);

const supabaseMe = await defaultProvider.currentUser();
assert.equal(supabaseMe.ok, true);
assert.equal(supabaseMe.provider, 'supabase');
assert.equal(supabaseMe.user_id, 'supabase-user-1');

const supabaseRefresh = await defaultProvider.refresh();
assert.equal(supabaseRefresh.ok, true);
assert.equal(supabaseRefresh.provider, 'supabase');

const supabaseRecovery = await defaultProvider.requestPasswordReset({
  email: 'player@example.test',
  redirectTo: 'https://www.cheekycommodoregamer.co.uk/auth/reset.html',
});
assert.equal(supabaseRecovery.ok, true);
assert.equal(supabaseRecovery.provider, 'supabase');
assert.deepEqual(supabaseCalls[4], [
  'resetPasswordForEmail',
  'player@example.test',
  { redirectTo: 'https://www.cheekycommodoregamer.co.uk/auth/reset.html' },
]);

const supabaseReset = await defaultProvider.resetPassword({
  token: 'ignored-by-supabase-session-flow',
  newPassword: 'replacement-password',
});
assert.equal(supabaseReset.ok, true);
assert.equal(supabaseReset.provider, 'supabase');
assert.equal(supabaseReset.reset, true);
assert.deepEqual(supabaseCalls[5], ['updateUser', { password: 'replacement-password' }]);

const supabaseLogout = await defaultProvider.signOut();
assert.equal(supabaseLogout.ok, true);
assert.equal(supabaseLogout.provider, 'supabase');
assert.equal(defaultProvider.getAccessToken(), null);
assert.equal(defaultProvider.getUserId(), null);

const fetchCalls = [];
const ccgQueue = [];
const fetchImpl = async (url, options) => {
  fetchCalls.push({ url, options: structuredClone(options) });
  if (!ccgQueue.length) throw new Error('Unexpected CCG backend request');
  return ccgQueue.shift();
};

const ccgProvider = createCcgAuthProvider({
  provider: 'ccg',
  ccgBaseUrl: 'https://auth.cheekycommodoregamer.co.uk',
  fetchImpl,
  supabaseBridge: {
    async getClient() {
      throw new Error('Explicit CCG provider must never activate Supabase.');
    },
  },
});

assert.equal(ccgProvider.provider, 'ccg');
assert.equal(ccgProvider.isCcg, true);
assert.equal(ccgProvider.isSupabase, false);
assert.equal(fetchCalls.length, 0, 'Constructing the explicit CCG provider must perform zero requests.');
assert.ok(ccgProvider.getCcgClient(), 'Explicit CCG mode should expose its passive native CCG client for staged provider verification.');

ccgQueue.push(response(202, {
  accepted: true,
  verification_required: true,
}));
const ccgRegistration = await ccgProvider.signUp({
  email: 'player@example.test',
  password: 'registration-secret',
  options: { data: { notify_new_games: true } },
});
assert.equal(ccgRegistration.ok, true);
assert.equal(ccgRegistration.provider, 'ccg');
assert.equal(ccgRegistration.accepted, true);
assert.equal(ccgRegistration.verification_required, true);
assert.equal(fetchCalls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/register');
assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
  email: 'player@example.test',
  password: 'registration-secret',
}, 'Provider-only registration metadata must not leak into the CCG account endpoint.');

ccgQueue.push(response(200, {
  user_id: 'ccg-user-1',
  access_token: 'ccg-access-1',
  expires_in: 900,
  refresh_expires_at: '2030-01-01T00:00:00.000Z',
}));
const ccgLogin = await ccgProvider.signIn({
  email: 'player@example.test',
  password: 'existing-migrated-password',
});
assert.equal(ccgLogin.ok, true);
assert.equal(ccgLogin.provider, 'ccg');
assert.equal(ccgLogin.user_id, 'ccg-user-1');
assert.equal(ccgProvider.getAccessToken(), 'ccg-access-1');
assert.equal(ccgProvider.getUserId(), 'ccg-user-1');
assert.equal(fetchCalls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(fetchCalls[1].options.credentials, 'include');

ccgQueue.push(response(200, {
  user_id: 'ccg-user-1',
  profile: { username: 'Player One' },
}));
const ccgMe = await ccgProvider.currentUser();
assert.equal(ccgMe.ok, true);
assert.equal(ccgMe.provider, 'ccg');
assert.equal(ccgMe.user_id, 'ccg-user-1');
assert.deepEqual(ccgMe.profile, { username: 'Player One' });
assert.equal(fetchCalls[2].options.headers.authorization, 'Bearer ccg-access-1');

ccgQueue.push(response(200, {
  user_id: 'ccg-user-1',
  access_token: 'ccg-access-2',
  expires_in: 900,
  refresh_expires_at: '2030-01-01T01:00:00.000Z',
}));
const ccgRefresh = await ccgProvider.refresh();
assert.equal(ccgRefresh.ok, true);
assert.equal(ccgRefresh.provider, 'ccg');
assert.equal(ccgProvider.getAccessToken(), 'ccg-access-2');
assert.equal(fetchCalls[3].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/refresh');
assert.equal(fetchCalls[3].options.credentials, 'include');

ccgQueue.push(response(202, { accepted: true }));
const ccgRecovery = await ccgProvider.requestPasswordReset({
  email: 'player@example.test',
  redirectTo: 'https://www.cheekycommodoregamer.co.uk/auth/reset.html',
});
assert.equal(ccgRecovery.ok, true);
assert.equal(ccgRecovery.provider, 'ccg');
assert.equal(ccgRecovery.accepted, true);
assert.equal(fetchCalls[4].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/recover');
assert.deepEqual(JSON.parse(fetchCalls[4].options.body), { email: 'player@example.test' });

const recoveryToken = 'a'.repeat(48);
ccgQueue.push(response(200, { reset: true }));
const ccgReset = await ccgProvider.resetPassword({
  token: recoveryToken,
  newPassword: 'replacement-password',
});
assert.equal(ccgReset.ok, true);
assert.equal(ccgReset.provider, 'ccg');
assert.equal(ccgReset.reset, true);
assert.equal(fetchCalls[5].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/reset-password');
assert.deepEqual(JSON.parse(fetchCalls[5].options.body), {
  token: recoveryToken,
  new_password: 'replacement-password',
});
assert.equal(ccgProvider.getAccessToken(), null, 'Password reset must discard the prior in-memory CCG access token.');
assert.equal(ccgProvider.getUserId(), null);

ccgQueue.push(response(200, { revoked: true }));
const ccgLogout = await ccgProvider.signOut();
assert.equal(ccgLogout.ok, true);
assert.equal(ccgLogout.provider, 'ccg');
assert.equal(ccgProvider.getAccessToken(), null);
assert.equal(ccgProvider.getUserId(), null);
assert.equal(fetchCalls[6].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/logout');

assert.equal(supabaseActivations, 7, 'Only explicit Supabase account/auth operations may activate the Supabase bridge.');
assert.equal(fetchCalls.length, 7, 'Only explicit CCG account/auth operations may contact the CCG backend.');

console.log('CCG auth provider contract passed: Supabase stays the passive default, CCG auth requires explicit selection, registration/login/session/recovery operations normalize across providers, and neither provider performs network work during construction.');
