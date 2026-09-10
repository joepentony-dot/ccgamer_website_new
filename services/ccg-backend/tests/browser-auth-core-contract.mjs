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

  const ccgCalls = [];
  const ccgQueue = [];
  globalThis.fetch = async (url, options) => {
    ccgCalls.push({ url: String(url), options: structuredClone(options) });
    if (!ccgQueue.length) throw new Error(`Unexpected CCG browser-auth request: ${url}`);
    return ccgQueue.shift();
  };

  globalThis.window = makeWindow({
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html',
    runtimeConfig: {
      provider: 'ccg',
      ccgBaseUrl: 'https://auth.cheekycommodoregamer.co.uk'
    },
    ccgSupabase: {
      async getClient() {
        throw new Error('Explicit CCG browser auth must not activate Supabase.');
      }
    }
  });

  const ccgCore = await importAuthCore('explicit-ccg');

  const lockedRegistration = await ccgCore.registerUser(
    'new-player@example.test',
    'new-player-password',
    {
      notifyNewGames: true,
      notifyNewsletter: true,
      choiceRecorded: true
    }
  );
  assert.equal(lockedRegistration.data, null);
  assert.equal(lockedRegistration.error?.detail, 'ccg_registration_pilot_locked');
  assert.equal(ccgCalls.length, 0, 'CCG pilot registration must remain blocked before any backend request.');

  const authEvents = [];
  const ccgSubscription = ccgCore.onAuthStateChange((event, session) => {
    authEvents.push([event, session?.user?.id ?? null]);
  });

  ccgQueue.push(response(200, {
    user_id: 'ccg-user-1',
    access_token: 'ccg-access-1',
    expires_in: 900,
    refresh_expires_at: '2026-09-07T00:00:00.000Z'
  }));
  const ccgLogin = await ccgCore.loginUser('player@example.test', 'migrated-account-password');
  assert.equal(ccgLogin.error, null);
  assert.equal(ccgLogin.data.user.id, 'ccg-user-1');
  assert.equal(ccgLogin.data.user.email, 'player@example.test');
  assert.equal(ccgCalls[0].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/login');
  assert.equal(ccgCalls[0].options.credentials, 'include');
  assert.deepEqual(authEvents[0], ['SIGNED_IN', 'ccg-user-1']);

  ccgQueue.push(response(200, {
    user_id: 'ccg-user-1',
    email: 'player@example.test',
    email_confirmed_at: '2026-09-06T12:00:00.000Z',
    profile: { username: 'Player One' }
  }));
  const ccgCurrent = await ccgCore.getCurrentUser();
  assert.equal(ccgCurrent.error, null);
  assert.equal(ccgCurrent.data.user.id, 'ccg-user-1');
  assert.equal(ccgCurrent.data.user.email, 'player@example.test');
  assert.deepEqual(ccgCurrent.data.profile, { username: 'Player One' });
  assert.equal(ccgCalls[1].url, 'https://auth.cheekycommodoregamer.co.uk/v1/me');
  assert.equal(ccgCalls[1].options.headers.authorization, 'Bearer ccg-access-1');

  ccgQueue.push(response(202, { accepted: true }));
  const recoveryRequest = await ccgCore.sendPasswordReset(
    'player@example.test',
    'https://www.cheekycommodoregamer.co.uk/auth/reset.html'
  );
  assert.equal(recoveryRequest.error, null);
  assert.equal(recoveryRequest.data.accepted, true);
  assert.equal(ccgCalls[2].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/recover');
  assert.deepEqual(JSON.parse(ccgCalls[2].options.body), { email: 'player@example.test' });

  const recoveryToken = 'r'.repeat(48);
  globalThis.window.location.href =
    `https://www.cheekycommodoregamer.co.uk/auth/reset.html?token=${recoveryToken}`;
  ccgQueue.push(response(200, { reset: true }));
  const passwordReset = await ccgCore.updatePassword('replacement-password-123');
  assert.equal(passwordReset.error, null);
  assert.equal(passwordReset.data.reset, true);
  assert.equal(ccgCalls[3].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/reset-password');
  assert.deepEqual(JSON.parse(ccgCalls[3].options.body), {
    token: recoveryToken,
    new_password: 'replacement-password-123'
  });
  assert.deepEqual(authEvents.at(-1), ['SIGNED_OUT', null]);

  ccgQueue.push(response(200, { revoked: true }));
  const logout = await ccgCore.logoutUser();
  assert.equal(logout.error, null);
  assert.equal(ccgCalls[4].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/logout');
  assert.deepEqual(authEvents.at(-1), ['SIGNED_OUT', null]);
  ccgSubscription.unsubscribe();

  globalThis.window = makeWindow({
    href: 'https://www.cheekycommodoregamer.co.uk/auth/login.html',
    runtimeConfig: {
      provider: 'ccg',
      ccgBaseUrl: 'https://auth.cheekycommodoregamer.co.uk'
    },
    ccgSupabase: {
      async getClient() {
        throw new Error('Fresh-page CCG session hydration must not activate Supabase.');
      }
    }
  });

  const freshCore = await importAuthCore('fresh-page-ccg');
  ccgQueue.push(response(200, {
    user_id: 'ccg-user-1',
    access_token: 'ccg-access-2',
    expires_in: 900,
    refresh_expires_at: '2026-09-07T01:00:00.000Z'
  }));
  ccgQueue.push(response(200, {
    user_id: 'ccg-user-1',
    email: 'player@example.test',
    email_confirmed_at: '2026-09-06T12:00:00.000Z',
    profile: { username: 'Player One' }
  }));

  const hydrated = await freshCore.getCurrentUser();
  assert.equal(hydrated.error, null);
  assert.equal(hydrated.data.user.id, 'ccg-user-1');
  assert.equal(ccgCalls[5].url, 'https://auth.cheekycommodoregamer.co.uk/v1/auth/refresh');
  assert.equal(ccgCalls[5].options.credentials, 'include');
  assert.equal(ccgCalls[6].url, 'https://auth.cheekycommodoregamer.co.uk/v1/me');
  assert.equal(ccgCalls[6].options.headers.authorization, 'Bearer ccg-access-2');

  globalThis.window = makeWindow({
    href: 'http://localhost:8080/auth/login.html?ccgAuthProvider=ccg&ccgAuthBaseUrl=http%3A%2F%2Flocalhost%3A8787'
  });
  const localPilotCore = await importAuthCore('localhost-query-pilot');
  const localLockedRegistration = await localPilotCore.registerUser(
    'local-player@example.test',
    'local-player-password',
    { choiceRecorded: true }
  );
  assert.equal(localLockedRegistration.error?.detail, 'ccg_registration_pilot_locked');
  assert.equal(
    ccgCalls.length,
    7,
    'Localhost query activation must select the CCG pilot without performing a request until an enabled operation is called.'
  );

  console.log(
    'Browser auth core contract passed: Supabase remains the unchanged default, CCG auth requires explicit selection, existing-account login/session hydration/recovery/logout work through the CCG provider, and CCG registration stays locked.'
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
