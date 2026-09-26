import assert from 'node:assert/strict';

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return body === undefined ? '' : JSON.stringify(body);
    }
  };
}

function makeWindow({
  href,
  runtimeConfig = null,
  ccgSupabase = null
}) {
  const windowObject = {
    location: { href },
    setTimeout,
    clearTimeout
  };
  if (runtimeConfig) windowObject.ccgAuthRuntimeConfig = runtimeConfig;
  if (ccgSupabase) windowObject.ccgSupabase = ccgSupabase;
  return windowObject;
}

async function importAuthCore(label) {
  const url = new URL('../../../js/ccg-auth-core.js', import.meta.url);
  url.searchParams.set('contract', label);
  return import(url.href);
}

const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;

try {
  let unexpectedCcgFetches = 0;
  globalThis.fetch = async () => {
    unexpectedCcgFetches += 1;
    throw new Error('The default browser auth path must not contact the CCG backend.');
  };

  const supabaseCalls = [];
  const supabaseUser = {
    id: 'supabase-user-1',
    email: 'player@example.test',
    email_confirmed_at: '2026-09-06T12:00:00.000Z',
    user_metadata: {}
  };
  const supabaseSession = { user: supabaseUser, access_token: 'supabase-access-1' };
  const supabaseClient = {
    auth: {
      async signUp(credentials) {
        supabaseCalls.push(['signUp', credentials]);
        return { data: { user: supabaseUser, session: null }, error: null };
      },
      async signInWithPassword(credentials) {
        supabaseCalls.push(['signInWithPassword', credentials]);
        return { data: { user: supabaseUser, session: supabaseSession }, error: null };
      },
      async signOut() {
        supabaseCalls.push(['signOut']);
        return { error: null };
      },
      async resetPasswordForEmail(email, options) {
        supabaseCalls.push(['resetPasswordForEmail', email, options]);
        return { data: {}, error: null };
      },
      async updateUser(update) {
        supabaseCalls.push(['updateUser', update]);
        return { data: { user: supabaseUser }, error: null };
      },
      async getUser() {
        supabaseCalls.push(['getUser']);
        return { data: { user: supabaseUser }, error: null };
      },
      onAuthStateChange(callback) {
        supabaseCalls.push(['onAuthStateChange', callback]);
        return {
          data: {
            subscription: {
              unsubscribe() {
                supabaseCalls.push(['unsubscribe']);
              }
            }
          }
        };
      }
    },
    from(table) {
      assert.equal(table, 'profiles');
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: { id: supabaseUser.id }, error: null };
        }
      };
    }
  };

  const supabaseBridge = {
    async getClient() {
      return supabaseClient;
    },
    async getCurrentUserContext() {
      return { user: supabaseUser };
    }
  };

  globalThis.window = makeWindow({
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html',
    ccgSupabase: supabaseBridge
  });

  const defaultCore = await importAuthCore('default-supabase');

  const registration = await defaultCore.registerUser(
    'player@example.test',
    'supabase-registration-secret',
    {
      notifyNewGames: true,
      notifyNewsletter: false,
      choiceRecorded: true
    }
  );
  assert.equal(registration.error, null);
  assert.deepEqual(supabaseCalls[0], [
    'signUp',
    {
      email: 'player@example.test',
      password: 'supabase-registration-secret',
      options: {
        data: {
          notify_new_games: true,
          notify_newsletter: false,
          notification_preferences_presented: true
        }
      }
    }
  ], 'Default registration must preserve the existing Supabase notification-preference metadata.');

  const defaultLogin = await defaultCore.loginUser('player@example.test', 'supabase-password');
  assert.equal(defaultLogin.error, null);
  assert.equal(defaultLogin.data.user.id, supabaseUser.id);
  assert.deepEqual(supabaseCalls[1], [
    'signInWithPassword',
    { email: 'player@example.test', password: 'supabase-password' }
  ]);

  const defaultCurrent = await defaultCore.getCurrentUser();
  assert.equal(defaultCurrent.error, null);
  assert.equal(defaultCurrent.data.user.id, supabaseUser.id);
  assert.equal(unexpectedCcgFetches, 0, 'Supabase-default browser auth must make zero CCG backend requests.');

  // Production browser auth is intentionally Supabase-only. Even if a stale
  // runtime object asks for the retired CCG/Render pilot, ccg-auth-core must
  // continue using the existing Supabase authority and must not contact the
  // experimental backend.
  const stalePilotSupabaseCalls = [];
  const stalePilotSupabase = {
    auth: {
      async signInWithPassword(credentials) {
        stalePilotSupabaseCalls.push(['signInWithPassword', credentials]);
        return { data: { user: supabaseUser, session: supabaseSession }, error: null };
      },
      async getUser() {
        stalePilotSupabaseCalls.push(['getUser']);
        return { data: { user: supabaseUser }, error: null };
      },
      onAuthStateChange(callback) {
        stalePilotSupabaseCalls.push(['onAuthStateChange', callback]);
        return { data: { subscription: { unsubscribe() {} } } };
      }
    },
    from(table) {
      assert.equal(table, 'profiles');
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: { id: supabaseUser.id }, error: null }; }
      };
    }
  };

  let stalePilotBackendFetches = 0;
  globalThis.fetch = async () => {
    stalePilotBackendFetches += 1;
    throw new Error('Retired CCG browser pilot must never receive a production auth request.');
  };

  globalThis.window = makeWindow({
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html',
    runtimeConfig: {
      provider: 'ccg',
      ccgBaseUrl: 'https://auth.cheekycommodoregamer.co.uk'
    },
    ccgSupabase: {
      async getClient() {
        return stalePilotSupabase;
      },
      async getCurrentUserContext() {
        return { user: supabaseUser };
      }
    }
  });

  const stalePilotCore = await importAuthCore('stale-ccg-runtime-config');
  const stalePilotLogin = await stalePilotCore.loginUser('player@example.test', 'supabase-password');
  assert.equal(stalePilotLogin.error, null);
  assert.equal(stalePilotLogin.data.user.id, supabaseUser.id);
  assert.deepEqual(stalePilotSupabaseCalls[0], [
    'signInWithPassword',
    { email: 'player@example.test', password: 'supabase-password' }
  ]);
  assert.equal(
    stalePilotBackendFetches,
    0,
    'A stale CCG runtime config must not redirect production browser auth away from Supabase.'
  );

  console.log(
    'Browser auth core contract passed: Supabase remains the production browser authority and stale CCG/Render provider hints cannot redirect authentication away from it.'
  );
} finally {
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }

  if (originalFetch === undefined) {
    delete globalThis.fetch;
  } else {
    globalThis.fetch = originalFetch;
  }
}
