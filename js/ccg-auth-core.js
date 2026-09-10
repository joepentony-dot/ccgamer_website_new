import { createCcgAuthProvider } from '../services/ccg-backend/client/ccg-auth-provider.mjs';

const AUTH_LOG_PREFIX = '[CCG-AUTH]';
const DEFAULT_PROVIDER = 'supabase';
const CCG_PROVIDER = 'ccg';
const CCG_REGISTRATION_PILOT_ENABLED = false;

let ccgProvider = null;
let ccgProviderBaseUrl = '';
const ccgAuthListeners = new Set();

function clean(value) {
  return String(value ?? '').trim();
}

function bool(value) {
  return value === true || String(value ?? '').toLowerCase() === 'true';
}

function normalizeNotificationPreferences(preferences = {}) {
  return {
    notifyNewGames: bool(preferences.notifyNewGames),
    notifyNewsletter: bool(preferences.notifyNewsletter),
    choiceRecorded: bool(preferences.choiceRecorded)
  };
}

function generateUnsubscribeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function buildErrorInfo(error, context) {
  const message = String(error?.message || '').trim();
  const lower = message.toLowerCase();
  const status = Number(error?.status || error?.code || 0) || null;

  let category = 'server';
  let userMessage = 'Authentication failed. Please try again.';

  if (!message) {
    category = 'unknown';
    userMessage = 'Unexpected authentication error. Please try again.';
  } else if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('load failed')) {
    category = 'network';
    userMessage = 'Network/CORS issue while contacting auth service. Please retry in a moment.';
  } else if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid_credentials')
  ) {
    category = 'credentials';
    userMessage = 'Invalid email or password.';
  } else if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    category = 'credentials';
    userMessage = 'Please confirm your email before logging in.';
  } else if (lower.includes('already registered') || lower.includes('user already registered')) {
    category = 'duplicate_email';
    userMessage = 'This email is already registered. Use Forgot password to reset your password.';
  } else if (lower.includes('rate limit') || lower.includes('rate_limited') || status === 429) {
    category = 'rate_limit';
    userMessage = 'Too many attempts. Please wait and try again.';
  } else if (lower.includes('jwt') || lower.includes('session') || lower.includes('token')) {
    category = 'session';
    userMessage = 'Session issue detected. Please sign in again.';
  } else if (lower.includes('cors') || lower.includes('origin')) {
    category = 'cors';
    userMessage = 'Origin/CORS configuration blocked this request.';
  }

  const info = {
    context,
    category,
    status,
    detail: message || 'Unknown error',
    message: userMessage
  };

  try {
    console.error(`${AUTH_LOG_PREFIX} ${context}`, info);
  } catch (_error) {
    // ignore
  }

  return info;
}

function buildProviderErrorInfo(result, context) {
  const status = Number(result?.status || 0) || null;
  const code = clean(result?.error || result?.kind || 'provider_error');
  const kind = clean(result?.kind).toLowerCase();

  if (kind === 'network_error') {
    return buildErrorInfo({ message: 'network_error', status }, context);
  }

  if (kind === 'rate_limited') {
    return buildErrorInfo({ message: 'rate_limited', status: status || 429 }, context);
  }

  if (kind === 'unauthorized' || kind === 'forbidden') {
    return {
      context,
      category: 'credentials',
      status,
      detail: code || kind,
      message: context === 'login' ? 'Invalid email or password.' : 'Please sign in again.'
    };
  }

  if (kind === 'invalid_request') {
    const lower = code.toLowerCase();
    return {
      context,
      category: 'credentials',
      status,
      detail: code || kind,
      message: lower.includes('password')
        ? 'Please check the password and try again.'
        : 'Please check the account details and try again.'
    };
  }

  return buildErrorInfo({ message: code || kind || 'provider_error', status }, context);
}

function isLoopbackHost(hostname) {
  const host = clean(hostname).toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function readLocalPilotConfig() {
  if (typeof window === 'undefined' || !window.location) return null;

  try {
    const url = new URL(window.location.href);
    if (!isLoopbackHost(url.hostname)) return null;
    if (clean(url.searchParams.get('ccgAuthProvider')).toLowerCase() !== CCG_PROVIDER) return null;

    return {
      provider: CCG_PROVIDER,
      ccgBaseUrl: clean(url.searchParams.get('ccgAuthBaseUrl'))
    };
  } catch (_error) {
    return null;
  }
}

function readAuthRuntimeConfig() {
  const explicit = typeof window !== 'undefined' && window.ccgAuthRuntimeConfig &&
    typeof window.ccgAuthRuntimeConfig === 'object' &&
    !Array.isArray(window.ccgAuthRuntimeConfig)
    ? window.ccgAuthRuntimeConfig
    : null;

  const source = explicit || readLocalPilotConfig() || {};
  const provider = clean(source.provider).toLowerCase() === CCG_PROVIDER ? CCG_PROVIDER : DEFAULT_PROVIDER;

  return Object.freeze({
    provider,
    ccgBaseUrl: clean(source.ccgBaseUrl || source.baseUrl)
  });
}

function useCcgProvider() {
  return readAuthRuntimeConfig().provider === CCG_PROVIDER;
}

function getCcgProvider() {
  const config = readAuthRuntimeConfig();
  if (config.provider !== CCG_PROVIDER) {
    throw new Error('CCG auth provider is not selected.');
  }
  if (!config.ccgBaseUrl) {
    throw new Error('CCG auth provider requires an explicit backend URL.');
  }

  if (!ccgProvider || ccgProviderBaseUrl !== config.ccgBaseUrl) {
    ccgProvider = createCcgAuthProvider({
      provider: CCG_PROVIDER,
      ccgBaseUrl: config.ccgBaseUrl,
      fetchImpl: globalThis.fetch
    });
    ccgProviderBaseUrl = config.ccgBaseUrl;
  }

  return ccgProvider;
}

function isExpectedSignedOutResult(result) {
  const kind = clean(result?.kind).toLowerCase();
  return kind === 'unauthorized' || kind === 'unauthenticated' || kind === 'forbidden';
}

function emitCcgAuthState(event, user) {
  const session = user ? { user } : null;
  for (const listener of Array.from(ccgAuthListeners)) {
    try {
      listener(event, session);
    } catch (error) {
      console.warn(`${AUTH_LOG_PREFIX} auth-listener`, error);
    }
  }
}

function ccgUserFromResult(result, fallbackEmail = '') {
  if (result?.user) return result.user;
  if (!result?.user_id) return null;

  return {
    id: String(result.user_id),
    email: clean(result.email || fallbackEmail) || null,
    email_confirmed_at: result.email_confirmed_at ?? null
  };
}

function getRecoveryTokenFromLocation() {
  if (typeof window === 'undefined' || !window.location) return '';

  try {
    const url = new URL(window.location.href);
    return clean(url.searchParams.get('token'));
  } catch (_error) {
    return '';
  }
}

async function waitForSupabaseCore() {
  const timeoutMs = 8000;
  const intervalMs = 50;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (window.ccgSupabase && typeof window.ccgSupabase.getClient === 'function') {
      return window.ccgSupabase;
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new Error('Supabase auth core not initialized. Ensure /js/ccg-supabase-config.js and /js/ccg-supabase-client.js load first.');
}

async function getSupabaseClient() {
  const api = await waitForSupabaseCore();
  return api.getClient();
}

async function ensureProfileBootstrap(user, preferences = null) {
  if (!user?.id) return { error: null };

  try {
    const supabase = await getSupabaseClient();
    const existing = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing.error && !String(existing.error.code || '').startsWith('PGRST')) {
      console.warn(`${AUTH_LOG_PREFIX} profile-check`, existing.error);
      return { error: null };
    }

    if (!existing.data) {
      const fallbackUsername = String((user.email || 'player').split('@')[0]).slice(0, 24) || 'player';
      const metadata = user.user_metadata || {};
      const normalized = normalizeNotificationPreferences(preferences || {
        notifyNewGames: metadata.notify_new_games,
        notifyNewsletter: metadata.notify_newsletter,
        choiceRecorded: metadata.notification_preferences_presented
      });
      const recordedAt = normalized.choiceRecorded ? new Date().toISOString() : null;

      const inserted = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: fallbackUsername,
          display_name: fallbackUsername,
          role: 'user',
          points: 0,
          bio: '',
          avatar_url: '',
          created_at: new Date().toISOString(),
          newsletter_monthly: false,
          notify_new_games: normalized.notifyNewGames,
          notify_c64: false,
          notify_amiga: false,
          newsletter_opt_in: false,
          notify_new_games_opt_in: normalized.notifyNewGames,
          notify_platform_c64: false,
          notify_platform_amiga: false,
          notify_newsletter: normalized.notifyNewsletter,
          notify_new_games_choice_recorded: normalized.choiceRecorded,
          notify_newsletter_choice_recorded: normalized.choiceRecorded,
          notification_preferences_updated_at: recordedAt,
          unsub_token: generateUnsubscribeToken(),
          email_confirmed: Boolean(user.email_confirmed_at)
        });

      if (inserted.error) {
        console.warn(`${AUTH_LOG_PREFIX} profile-insert`, inserted.error);
      }
    }
  } catch (error) {
    console.warn(`${AUTH_LOG_PREFIX} profile-bootstrap`, error);
  }

  return { error: null };
}

function sanitizeEmailPassword(email, password) {
  const safeEmail = clean(email);
  const safePassword = clean(password);

  if (!safeEmail || !safePassword) {
    return {
      error: {
        category: 'credentials',
        message: 'Email and password are required.',
        detail: 'Missing email/password values.'
      }
    };
  }

  return { safeEmail, safePassword, error: null };
}

async function getCcgCurrentUser() {
  const provider = getCcgProvider();

  if (!provider.getAccessToken()) {
    const refreshResult = await provider.refresh();
    if (!refreshResult.ok) {
      if (isExpectedSignedOutResult(refreshResult)) {
        return { data: { user: null, profile: null }, error: null };
      }
      return {
        data: { user: null, profile: null },
        error: buildProviderErrorInfo(refreshResult, 'refresh-session')
      };
    }
  }

  let current = await provider.currentUser();
  if (!current.ok && isExpectedSignedOutResult(current)) {
    const refreshed = await provider.refresh();
    if (!refreshed.ok) {
      return { data: { user: null, profile: null }, error: null };
    }
    current = await provider.currentUser();
  }

  if (!current.ok) {
    if (isExpectedSignedOutResult(current)) {
      return { data: { user: null, profile: null }, error: null };
    }
    return {
      data: { user: null, profile: null },
      error: buildProviderErrorInfo(current, 'get-current-user')
    };
  }

  return {
    data: {
      user: ccgUserFromResult(current),
      profile: current.profile ?? null
    },
    error: null
  };
}

export async function registerUser(email, password, notificationPreferences = {}) {
  const { safeEmail, safePassword, error: inputError } = sanitizeEmailPassword(email, password);
  if (inputError) return { data: null, error: inputError };

  const preferences = normalizeNotificationPreferences(notificationPreferences);

  if (useCcgProvider()) {
    if (!CCG_REGISTRATION_PILOT_ENABLED) {
      return {
        data: null,
        error: {
          category: 'unavailable',
          status: null,
          detail: 'ccg_registration_pilot_locked',
          message: 'New account registration is not enabled in CCG pilot mode yet. Existing accounts can still log in.'
        }
      };
    }

    try {
      const provider = getCcgProvider();
      const result = await provider.signUp({
        email: safeEmail,
        password: safePassword,
        notificationPreferences: preferences
      });
      if (!result.ok) return { data: null, error: buildProviderErrorInfo(result, 'register') };

      const user = ccgUserFromResult(result, safeEmail);
      return {
        data: {
          user,
          session: result.verification_required ? null : (user ? { user } : null)
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: buildErrorInfo(error, 'register') };
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const result = await supabase.auth.signUp({
      email: safeEmail,
      password: safePassword,
      options: {
        data: {
          notify_new_games: preferences.notifyNewGames,
          notify_newsletter: preferences.notifyNewsletter,
          notification_preferences_presented: preferences.choiceRecorded
        }
      }
    });
    if (result.error) return { data: null, error: buildErrorInfo(result.error, 'register') };

    await ensureProfileBootstrap(result.data?.user || null, preferences);
    return result;
  } catch (error) {
    return { data: null, error: buildErrorInfo(error, 'register') };
  }
}

export async function loginUser(email, password) {
  const { safeEmail, safePassword, error: inputError } = sanitizeEmailPassword(email, password);
  if (inputError) return { data: null, error: inputError };

  if (useCcgProvider()) {
    try {
      const result = await getCcgProvider().signIn({ email: safeEmail, password: safePassword });
      if (!result.ok) return { data: null, error: buildProviderErrorInfo(result, 'login') };

      const user = ccgUserFromResult(result, safeEmail);
      emitCcgAuthState('SIGNED_IN', user);
      return {
        data: {
          user,
          session: user ? { user } : null
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: buildErrorInfo(error, 'login') };
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const result = await supabase.auth.signInWithPassword({ email: safeEmail, password: safePassword });
    if (result.error) return { data: null, error: buildErrorInfo(result.error, 'login') };

    await ensureProfileBootstrap(result.data?.user || result.data?.session?.user || null);
    return result;
  } catch (error) {
    return { data: null, error: buildErrorInfo(error, 'login') };
  }
}

export async function logoutUser() {
  if (useCcgProvider()) {
    try {
      const result = await getCcgProvider().signOut();
      if (!result.ok) return { error: buildProviderErrorInfo(result, 'logout') };
      emitCcgAuthState('SIGNED_OUT', null);
      return { error: null };
    } catch (error) {
      return { error: buildErrorInfo(error, 'logout') };
    }
  }

  try {
    const supabase = await getSupabaseClient();
    return await supabase.auth.signOut();
  } catch (error) {
    return { error: buildErrorInfo(error, 'logout') };
  }
}

export async function sendPasswordReset(email, redirectTo) {
  const safeEmail = clean(email);
  if (!safeEmail) {
    return { error: { category: 'credentials', message: 'Email is required.', detail: 'Missing email value.' } };
  }

  if (useCcgProvider()) {
    try {
      const result = await getCcgProvider().requestPasswordReset({
        email: safeEmail,
        redirectTo: clean(redirectTo) || undefined
      });
      if (!result.ok) return { data: null, error: buildProviderErrorInfo(result, 'forgot-password') };
      return { data: { accepted: Boolean(result.accepted) }, error: null };
    } catch (error) {
      return { data: null, error: buildErrorInfo(error, 'forgot-password') };
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const result = await supabase.auth.resetPasswordForEmail(safeEmail, { redirectTo: clean(redirectTo) || undefined });
    if (result.error) return { data: null, error: buildErrorInfo(result.error, 'forgot-password') };
    return result;
  } catch (error) {
    return { data: null, error: buildErrorInfo(error, 'forgot-password') };
  }
}

export async function updatePassword(newPassword) {
  const safePassword = clean(newPassword);
  if (!safePassword) {
    return { error: { category: 'credentials', message: 'New password is required.', detail: 'Missing password value.' } };
  }

  if (useCcgProvider()) {
    const token = getRecoveryTokenFromLocation();
    if (!token) {
      return {
        data: null,
        error: {
          category: 'session',
          status: null,
          detail: 'missing_recovery_token',
          message: 'This password reset link is missing or invalid. Request a new reset email.'
        }
      };
    }

    try {
      const result = await getCcgProvider().resetPassword({ token, newPassword: safePassword });
      if (!result.ok) return { data: null, error: buildProviderErrorInfo(result, 'update-password') };
      emitCcgAuthState('SIGNED_OUT', null);
      return { data: { reset: Boolean(result.reset) }, error: null };
    } catch (error) {
      return { data: null, error: buildErrorInfo(error, 'update-password') };
    }
  }

  try {
    const supabase = await getSupabaseClient();
    const result = await supabase.auth.updateUser({ password: safePassword });
    if (result.error) return { data: null, error: buildErrorInfo(result.error, 'update-password') };
    return result;
  } catch (error) {
    return { data: null, error: buildErrorInfo(error, 'update-password') };
  }
}

export async function getCurrentUser() {
  if (useCcgProvider()) {
    try {
      return await getCcgCurrentUser();
    } catch (error) {
      return { data: { user: null, profile: null }, error: buildErrorInfo(error, 'get-current-user') };
    }
  }

  try {
    const api = await waitForSupabaseCore();
    if (typeof api.getCurrentUserContext === 'function') {
      const context = await api.getCurrentUserContext();
      return { data: { user: context?.user || null }, error: null };
    }

    const supabase = await api.getClient();
    return supabase.auth.getUser();
  } catch (error) {
    return { data: { user: null }, error: buildErrorInfo(error, 'get-current-user') };
  }
}

export function onAuthStateChange(callback) {
  if (typeof callback !== 'function') {
    return {
      ready: Promise.resolve(null),
      unsubscribe() {}
    };
  }

  if (useCcgProvider()) {
    ccgAuthListeners.add(callback);
    return {
      ready: Promise.resolve(null),
      unsubscribe() {
        ccgAuthListeners.delete(callback);
      }
    };
  }

  let subscription = null;

  const ready = waitForSupabaseCore()
    .then((api) => api.getClient())
    .then((supabase) => {
      const result = supabase.auth.onAuthStateChange(callback);
      subscription = result?.data?.subscription || null;
      return result;
    })
    .catch((error) => {
      buildErrorInfo(error, 'on-auth-state-change');
      return null;
    });

  return {
    ready,
    unsubscribe() {
      try {
        subscription?.unsubscribe?.();
      } catch (_error) {
        // ignore
      }
    }
  };
}

if (typeof window !== 'undefined') {
  window.ccgAuthCore = window.ccgAuthCore || {
    registerUser,
    loginUser,
    logoutUser,
    sendPasswordReset,
    updatePassword,
    getCurrentUser,
    onAuthStateChange
  };
}
