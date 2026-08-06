const AUTH_LOG_PREFIX = '[CCG-AUTH]';

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
  } else if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    category = 'credentials';
    userMessage = 'Invalid email or password.';
  } else if (lower.includes('email not confirmed')) {
    category = 'credentials';
    userMessage = 'Please confirm your email before logging in.';
  } else if (lower.includes('already registered') || lower.includes('user already registered')) {
    category = 'duplicate_email';
    userMessage = 'This email is already registered. Use Forgot password to reset your password.';
  } else if (lower.includes('rate limit') || status === 429) {
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

export async function registerUser(email, password, notificationPreferences = {}) {
  const { safeEmail, safePassword, error: inputError } = sanitizeEmailPassword(email, password);
  if (inputError) return { data: null, error: inputError };

  const preferences = normalizeNotificationPreferences(notificationPreferences);

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
