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

const supabaseLogin = await defaultProvider.signIn({ email: 'player@example.test', password: 'secret' });
assert.equal(supabaseLogin.ok, true);
assert.equal(supabaseLogin.provider, 'supabase');
assert.equal(supabaseLogin.user_id, 'supabase-user-1');
assert.equal(defaultProvider.getAccessToken(), 'supabase-access-1');
assert.equal(defaultProvider.getUserId(), 'supabase-user-1');
assert.equal(supabaseActivations, 1);
assert.deepEqual(supabaseCalls[0], ['signInWithPassword', { email: 'player@example.test', password: 'secret' }]);

const supabaseMe = await defaultProvider.currentUser();
assert.equal(supabaseMe.ok, true);
assert.equal(supabaseMe.provider, 'supabase');
assert.equal(supabaseMe.user_id, 'supabase-user-1');

const supabaseRefresh = await defaultProvider.refresh();
assert.equal(supabaseRefresh.ok, true);
assert.equal(supabaseRefresh.provider, 'supabase');

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
assert.equal(fetchCalls.length, 1);
assert.equal(fetchCalls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
assert.equal(fetchCalls[0].options.credentials, 'include');

ccgQueue.push(response(200, {
  user_id: 'ccg-user-1',
  profile: { username: 'Player One' },
}));
const ccgMe = await ccgProvider.currentUser();
assert.equal(ccgMe.ok, true);
assert.equal(ccgMe.provider, 'ccg');
assert.equal(ccgMe.user_id, 'ccg-user-1');
assert.deepEqual(ccgMe.profile, { username: 'Player One' });
assert.equal(fetchCalls[1].options.headers.authorization, 'Bearer ccg-access-1');

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
assert.equal(fetchCalls[2].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/refresh');
assert.equal(fetchCalls[2].options.credentials, 'include');

ccgQueue.push(response(200, { revoked: true }));
const ccgLogout = await ccgProvider.signOut();
assert.equal(ccgLogout.ok, true);
assert.equal(ccgLogout.provider, 'ccg');
assert.equal(ccgProvider.getAccessToken(), null);
assert.equal(ccgProvider.getUserId(), null);
assert.equal(fetchCalls[3].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/logout');

assert.equal(supabaseActivations, 4, 'Only explicit Supabase auth operations may activate the Supabase bridge.');
assert.equal(fetchCalls.length, 4, 'Only explicit CCG auth operations may contact the CCG backend.');

console.log('CCG auth provider contract passed: Supabase stays the passive default, CCG auth requires explicit selection, both providers normalize login/session identity, and neither provider performs network work during construction.');
