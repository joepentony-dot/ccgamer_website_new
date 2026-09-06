import { createCcgOnlineClient } from './ccg-online-client.mjs';
import { createLostSizzlerRealtimeSupabaseAdapter } from './lost-sizzler-realtime-supabase-adapter.mjs';

const WEEKLY_FUNCTION = 'ccq-weekly-challenge';

function resultError(result, fallback = 'ccg_online_request_failed') {
  const code = String(result?.error || result?.kind || fallback);
  const error = new Error(code);
  error.code = code;
  error.status = Number(result?.status) || 0;
  error.kind = String(result?.kind || 'remote_error');
  if (Number.isSafeInteger(result?.retry_after_seconds)) error.retry_after_seconds = result.retry_after_seconds;
  if (Number.isSafeInteger(result?.retry_after)) error.retry_after = result.retry_after;
  return error;
}

function supabaseResult(result, mapData = value => value) {
  if (!result?.ok) return Object.freeze({ data: null, error: resultError(result) });
  return Object.freeze({ data: mapData(result), error: null });
}

function normalizeProfile(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : null;
}

function roleFor(profile) {
  return String(profile?.role || 'member').trim() || 'member';
}

function userFrom(auth, profile) {
  const id = String(auth.getUserId() || '').trim();
  if (!id) return null;
  const safeProfile = normalizeProfile(profile);
  const displayName = String(safeProfile?.display_name || safeProfile?.username || '').trim();
  return Object.freeze({
    id,
    user_metadata: Object.freeze({
      ...(safeProfile || {}),
      ...(displayName ? { display_name: displayName } : {}),
    }),
    app_metadata: Object.freeze({ role: roleFor(safeProfile) }),
  });
}

function permissionsFor(user, profile) {
  const authenticated = Boolean(user);
  const role = roleFor(profile);
  return Object.freeze({
    canRate: authenticated,
    canComment: authenticated,
    canModerate: authenticated && ['admin', 'editor', 'mod'].includes(role),
  });
}

/**
 * Present the narrow Supabase-shaped surface currently consumed by Lost
 * Sizzler while routing the actual work to the CCG-owned backend.
 *
 * Construction is deliberately passive: it performs no fetch, refresh or
 * WebSocket connection and it does not mutate window.ccgSupabase. A pilot or
 * packaged build must explicitly install the returned bridge.
 */
export function createLostSizzlerSupabaseCompat({
  baseUrl,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  WebSocketImpl = globalThis.WebSocket,
  realtimeOptions = {},
  onlineFactory = createCcgOnlineClient,
  realtimeAdapterFactory = createLostSizzlerRealtimeSupabaseAdapter,
} = {}) {
  if (typeof onlineFactory !== 'function') throw new Error('onlineFactory must be a function');
  if (typeof realtimeAdapterFactory !== 'function') throw new Error('realtimeAdapterFactory must be a function');

  const online = onlineFactory({
    baseUrl,
    fetchImpl,
    cryptoImpl,
    WebSocketImpl,
    realtimeOptions,
  });
  const realtime = realtimeAdapterFactory({
    baseUrl,
    WebSocketImpl,
    timeoutMs: realtimeOptions?.timeoutMs,
  });

  let profile = null;
  let hydrationPromise = null;
  let expiresAt = 0;

  function session() {
    const accessToken = online.auth.getAccessToken();
    const user = userFrom(online.auth, profile);
    if (!accessToken || !user) return null;
    return Object.freeze({
      access_token: accessToken,
      token_type: 'bearer',
      expires_at: expiresAt || null,
      user,
    });
  }

  async function hydrateProfile() {
    if (!online.auth.getAccessToken()) {
      profile = null;
      return null;
    }
    const result = await online.auth.me();
    if (!result?.ok) {
      if (['unauthorized', 'unauthenticated'].includes(result?.kind)) profile = null;
      return null;
    }
    profile = normalizeProfile(result.profile);
    return profile;
  }

  async function hydrate({ force = false } = {}) {
    if (!force && online.auth.getAccessToken() && online.auth.getUserId()) {
      if (profile === null) await hydrateProfile();
      return session();
    }
    if (hydrationPromise) return hydrationPromise;

    hydrationPromise = (async () => {
      const refreshed = await online.auth.refresh();
      if (!refreshed?.ok) {
        if (['unauthorized', 'unauthenticated'].includes(refreshed?.kind)) {
          online.auth.clearLocalSession();
          profile = null;
          expiresAt = 0;
          return null;
        }
        throw resultError(refreshed, 'auth_refresh_failed');
      }
      expiresAt = Math.floor(Date.now() / 1000) + Math.max(1, Number(refreshed.expires_in) || 1);
      await hydrateProfile();
      return session();
    })().finally(() => {
      hydrationPromise = null;
    });

    return hydrationPromise;
  }

  async function invokeWeekly(body = {}) {
    const action = String(body?.action || '').trim();
    let result;
    if (action === 'status') result = await online.lostSizzler.weeklyVault.status();
    else if (action === 'ghost') result = await online.lostSizzler.weeklyVault.ghost();
    else if (action === 'start') result = await online.lostSizzler.weeklyVault.start();
    else if (action === 'finish') result = await online.lostSizzler.weeklyVault.finish({
      attemptId: body?.attemptId,
      result: body?.result,
    });
    else {
      return Object.freeze({
        data: null,
        error: resultError({ ok: false, kind: 'invalid_request', error: 'unsupported_weekly_action' }),
      });
    }
    return supabaseResult(result, value => ({ ...value }));
  }

  const auth = Object.freeze({
    async getSession() {
      return Object.freeze({ data: Object.freeze({ session: session() }), error: null });
    },

    async getUser() {
      try {
        const current = session() || await hydrate();
        return Object.freeze({
          data: Object.freeze({ user: current?.user || null }),
          error: null,
        });
      } catch (error) {
        return Object.freeze({ data: Object.freeze({ user: null }), error });
      }
    },

    async signInWithPassword(credentials = {}) {
      const result = await online.auth.login(credentials);
      if (!result?.ok) return Object.freeze({ data: null, error: resultError(result, 'login_failed') });
      expiresAt = Math.floor(Date.now() / 1000) + Math.max(1, Number(result.expires_in) || 1);
      await hydrateProfile();
      const nextSession = session();
      return Object.freeze({
        data: Object.freeze({ session: nextSession, user: nextSession?.user || null }),
        error: null,
      });
    },

    async refreshSession() {
      try {
        const nextSession = await hydrate({ force: true });
        return Object.freeze({
          data: Object.freeze({ session: nextSession, user: nextSession?.user || null }),
          error: null,
        });
      } catch (error) {
        return Object.freeze({ data: null, error });
      }
    },

    async signOut() {
      const result = await online.auth.logout();
      profile = null;
      expiresAt = 0;
      return result?.ok
        ? Object.freeze({ error: null })
        : Object.freeze({ error: resultError(result, 'logout_failed') });
    },
  });

  const client = Object.freeze({
    auth,
    functions: Object.freeze({
      async invoke(name, options = {}) {
        if (String(name || '').trim() === WEEKLY_FUNCTION) return invokeWeekly(options?.body);
        return Object.freeze({
          data: null,
          error: resultError({ ok: false, kind: 'unsupported', error: 'unsupported_edge_function' }),
        });
      },
    }),
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
    removeAllChannels: realtime.removeAllChannels,
  });

  async function getCurrentUserContext() {
    const current = session() || await hydrate();
    const user = current?.user || null;
    const safeProfile = normalizeProfile(profile);
    const role = roleFor(safeProfile);
    return Object.freeze({
      user,
      profile: safeProfile,
      session: current,
      role,
      isAuthenticated: Boolean(user),
      permissions: permissionsFor(user, safeProfile),
    });
  }

  return Object.freeze({
    __ccgBackendCompat: true,
    async getClient() {
      return client;
    },
    async getUser() {
      const context = await getCurrentUserContext();
      return context.user;
    },
    waitForAuth: hydrate,
    getCurrentUserContext,
    waitForSessionReady: getCurrentUserContext,
    getDiagnostics() {
      return Object.freeze({
        provider: 'ccg',
        authenticated: Boolean(online.auth.getAccessToken() && online.auth.getUserId()),
        profileLoaded: profile !== null,
        realtime: realtime.getDiagnostics(),
      });
    },
  });
}
