const ALLOWED_ROLES = new Set(['editor', 'admin', 'superadmin']);
const MP3_CONTENT_TYPE = 'audio/mpeg';
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function musicObjectKey(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return '';
  return `${normalized}.mp3`;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
  });
}

function corsHeaders(request, env) {
  const allowedOrigin = String(env.ALLOWED_ADMIN_ORIGIN || '').replace(/\/$/, '');
  const origin = String(request.headers.get('origin') || '').replace(/\/$/, '');
  return allowedOrigin && origin === allowedOrigin
    ? { 'access-control-allow-origin': allowedOrigin, vary: 'Origin' }
    : {};
}

function bearerToken(request) {
  const value = String(request.headers.get('authorization') || '');
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

async function verifySupabaseUser(token, env, fetchImpl) {
  const response = await fetchImpl(`${String(env.SUPABASE_URL || '').replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchAuthoritativeRole(userId, env, fetchImpl) {
  const endpoint = `${String(env.SUPABASE_URL || '').replace(/\/$/, '')}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`;
  const response = await fetchImpl(endpoint, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!response.ok) return '';
  const rows = await response.json();
  return String(Array.isArray(rows) ? rows[0]?.role : '').trim().toLowerCase();
}

export function createMusicUploadHandler({ fetchImpl = fetch } = {}) {
  return async function handle(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        ...cors,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '86400'
      } });
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, cors);
    if (!env.GAME_MUSIC || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: 'server_not_configured' }, 503, cors);
    }

    const token = bearerToken(request);
    if (!token) return json({ ok: false, error: 'missing_token' }, 401, cors);
    const user = await verifySupabaseUser(token, env, fetchImpl);
    if (!user?.id) return json({ ok: false, error: 'invalid_token' }, 401, cors);

    const role = await fetchAuthoritativeRole(user.id, env, fetchImpl);
    if (!ALLOWED_ROLES.has(role)) return json({ ok: false, error: 'insufficient_role' }, 403, cors);

    let form;
    try { form = await request.formData(); } catch { return json({ ok: false, error: 'invalid_form' }, 400, cors); }
    const slug = String(form.get('slug') || '');
    const key = musicObjectKey(slug);
    if (!key) return json({ ok: false, error: 'invalid_slug' }, 400, cors);
    const file = form.get('file');
    if (!(file instanceof File)) return json({ ok: false, error: 'missing_file' }, 400, cors);
    if (file.type !== MP3_CONTENT_TYPE || !/\.mp3$/i.test(file.name || '')) {
      return json({ ok: false, error: 'invalid_file_type' }, 415, cors);
    }
    if (!file.size || file.size > MAX_AUDIO_BYTES) return json({ ok: false, error: 'invalid_file_size' }, 413, cors);

    await env.GAME_MUSIC.put(key, file.stream(), {
      httpMetadata: { contentType: MP3_CONTENT_TYPE },
      customMetadata: { uploadedBy: user.id, role }
    });
    return json({ ok: true, key, bytes: file.size }, 201, cors);
  };
}

export { MAX_AUDIO_BYTES, MP3_CONTENT_TYPE };
