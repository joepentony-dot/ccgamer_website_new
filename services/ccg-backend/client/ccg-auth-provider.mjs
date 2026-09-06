import { createCcgAuthClient } from './ccg-auth-client.mjs';

const VALID_PROVIDERS = new Set(['supabase', 'ccg']);

function normalizeProvider(value) {
  const normalized = String(value ?? 'supabase').trim().toLowerCase() || 'supabase';
  if (!VALID_PROVIDERS.has(normalized)) throw new Error('unsupported_auth_provider');
  return normalized;
}

function success(provider, fields = {}) {
  return Object.freeze({ ok: true, kind: 'success', provider, ...fields });
}

function failure(provider, kind, error, status = 0) {
  return Object.freeze({ ok: false, kind, provider, status, error: String(error || kind) });
}

function withProvider(result, provider) {
  return Object.freeze({ ...(result || {}), provider });
}

function supabaseFailure(error) {
  const status = Number(error?.status || 0);
  const code = String(error?.code || error?.name || 'supabase_error');
  if (status === 401 || status === 403) return failure('supabase', 'unauthorized', code, status);
  if (status === 429) return failure('supabase', 'rate_limited', code, status);
  return failure('supabase', 'remote_error', code, status);
}

function normalizeSupabaseSession(data) {
  const session = data?.session || null;
  const user = data?.user || session?.user || null;
  return {
    user,
    user_id: user?.id ? String(user.id) : null,
    access_token: session?.access_token ? String(session.access_token) : null,
  };
}

/**
 * Provider-neutral account/auth boundary for staged CCG auth cut-over.
 *
 * Construction is passive: it performs no fetch, Supabase client load or
 * session hydration. Supabase remains the default and the CCG provider can be
 * selected only with the explicit provider value "ccg".
 */
export function createCcgAuthProvider({
  provider = 'supabase',
  supabaseBridge = globalThis.ccgSupabase,
  ccgBaseUrl,
  fetchImpl = globalThis.fetch,
  ccgClient = null,
} = {}) {
  const selectedProvider = normalizeProvider(provider);
  let localCcgClient = ccgClient;
  let lastAccessToken = null;
  let lastUserId = null;

  if (selectedProvider === 'ccg' && !localCcgClient) {
    localCcgClient = createCcgAuthClient({ baseUrl: ccgBaseUrl, fetchImpl });
  }

  async function getSupabaseAuth() {
    if (!supabaseBridge || typeof supabaseBridge.getClient !== 'function') {
      throw new Error('supabase_bridge_unavailable');
    }
    const client = await supabaseBridge.getClient();
    if (!client?.auth) throw new Error('supabase_auth_unavailable');
    return client.auth;
  }

  function rememberCcgSession(result) {
    if (result?.ok) {
      lastAccessToken = localCcgClient.getAccessToken();
      lastUserId = localCcgClient.getUserId();
    }
    return withProvider(result, 'ccg');
  }

  async function signUp(credentials) {
    if (selectedProvider === 'ccg') return withProvider(await localCcgClient.register(credentials), 'ccg');

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.signUp !== 'function') return failure('supabase', 'unsupported', 'supabase_sign_up_unavailable');
      const { data, error } = await auth.signUp(credentials || {});
      if (error) return supabaseFailure(error);
      const session = normalizeSupabaseSession(data);
      lastAccessToken = session.access_token;
      lastUserId = session.user_id;
      return success('supabase', {
        status: 200,
        accepted: Boolean(session.user),
        verification_required: Boolean(session.user && !session.access_token),
        user_id: session.user_id,
        user: session.user,
      });
    } catch (error) {
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  async function signIn(credentials) {
    if (selectedProvider === 'ccg') return rememberCcgSession(await localCcgClient.login(credentials));

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.signInWithPassword !== 'function') return failure('supabase', 'unsupported', 'supabase_sign_in_unavailable');
      const { data, error } = await auth.signInWithPassword(credentials || {});
      if (error) return supabaseFailure(error);
      const session = normalizeSupabaseSession(data);
      lastAccessToken = session.access_token;
      lastUserId = session.user_id;
      return success('supabase', {
        status: 200,
        user_id: session.user_id,
        user: session.user,
      });
    } catch (error) {
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  async function refresh() {
    if (selectedProvider === 'ccg') return rememberCcgSession(await localCcgClient.refresh());

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.refreshSession !== 'function') return failure('supabase', 'unsupported', 'supabase_refresh_unavailable');
      const { data, error } = await auth.refreshSession();
      if (error) {
        if (Number(error?.status || 0) === 401) {
          lastAccessToken = null;
          lastUserId = null;
        }
        return supabaseFailure(error);
      }
      const session = normalizeSupabaseSession(data);
      lastAccessToken = session.access_token;
      lastUserId = session.user_id;
      return success('supabase', {
        status: 200,
        user_id: session.user_id,
        user: session.user,
      });
    } catch (error) {
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  async function signOut() {
    if (selectedProvider === 'ccg') {
      const result = await localCcgClient.logout();
      lastAccessToken = null;
      lastUserId = null;
      return result.ok
        ? success('ccg', { status: result.status, revoked: Boolean(result.revoked) })
        : withProvider(result, 'ccg');
    }

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.signOut !== 'function') return failure('supabase', 'unsupported', 'supabase_sign_out_unavailable');
      const { error } = await auth.signOut();
      lastAccessToken = null;
      lastUserId = null;
      if (error) return supabaseFailure(error);
      return success('supabase', { status: 200, revoked: true });
    } catch (error) {
      lastAccessToken = null;
      lastUserId = null;
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  async function currentUser() {
    if (selectedProvider === 'ccg') {
      const result = await localCcgClient.me();
      if (!result.ok) return withProvider(result, 'ccg');
      lastAccessToken = localCcgClient.getAccessToken();
      lastUserId = localCcgClient.getUserId();
      return success('ccg', {
        status: result.status,
        user_id: result.user_id,
        user: result.user_id ? Object.freeze({ id: result.user_id }) : null,
        profile: result.profile ?? null,
      });
    }

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.getUser !== 'function') return failure('supabase', 'unsupported', 'supabase_get_user_unavailable');
      const { data, error } = await auth.getUser();
      if (error) return supabaseFailure(error);
      const user = data?.user || null;
      lastUserId = user?.id ? String(user.id) : null;
      return success('supabase', {
        status: 200,
        user_id: lastUserId,
        user,
        profile: null,
      });
    } catch (error) {
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  async function requestPasswordReset({ email, redirectTo } = {}) {
    if (selectedProvider === 'ccg') return withProvider(await localCcgClient.requestPasswordReset({ email }), 'ccg');

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.resetPasswordForEmail !== 'function') {
        return failure('supabase', 'unsupported', 'supabase_password_recovery_unavailable');
      }
      const { data, error } = await auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || undefined,
      });
      if (error) return supabaseFailure(error);
      return success('supabase', { status: 200, accepted: true, data: data ?? null });
    } catch (error) {
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  async function resetPassword({ token, newPassword } = {}) {
    if (selectedProvider === 'ccg') {
      const result = await localCcgClient.resetPassword({ token, newPassword });
      lastAccessToken = null;
      lastUserId = null;
      return withProvider(result, 'ccg');
    }

    try {
      const auth = await getSupabaseAuth();
      if (typeof auth.updateUser !== 'function') return failure('supabase', 'unsupported', 'supabase_password_update_unavailable');
      const { data, error } = await auth.updateUser({ password: newPassword });
      if (error) return supabaseFailure(error);
      return success('supabase', { status: 200, reset: true, data: data ?? null });
    } catch (error) {
      return failure('supabase', 'provider_error', error?.message || error);
    }
  }

  return Object.freeze({
    provider: selectedProvider,
    isCcg: selectedProvider === 'ccg',
    isSupabase: selectedProvider === 'supabase',
    signUp,
    signIn,
    refresh,
    signOut,
    currentUser,
    requestPasswordReset,
    resetPassword,
    getAccessToken() {
      return selectedProvider === 'ccg' ? localCcgClient.getAccessToken() : lastAccessToken;
    },
    getUserId() {
      return selectedProvider === 'ccg' ? localCcgClient.getUserId() : lastUserId;
    },
    getCcgClient() {
      return selectedProvider === 'ccg' ? localCcgClient : null;
    },
  });
}

export { normalizeProvider as normalizeCcgAuthProvider };
