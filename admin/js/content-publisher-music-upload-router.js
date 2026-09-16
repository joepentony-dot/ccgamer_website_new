import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const LEGACY_MUSIC_UPLOAD_PATH = '/api/admin/game-music';
const MUSIC_SIGNER_URL = `${SUPABASE_URL}/functions/v1/game-music-upload-url`;
const MAX_MUSIC_BYTES = 25 * 1024 * 1024;

if (typeof window !== 'undefined' && !window.__ccgMusicUploadRouterInstalled) {
  window.__ccgMusicUploadRouterInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    if (!isLegacyMusicUploadRequest(input, init)) return nativeFetch(input, init);
    return routeMusicUpload(init, nativeFetch);
  };
}

function isLegacyMusicUploadRequest(input, init) {
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (method !== 'POST') return false;

  const rawUrl = input instanceof Request ? input.url : String(input || '');
  try {
    const url = new URL(rawUrl, window.location.href);
    return url.origin === window.location.origin && url.pathname === LEGACY_MUSIC_UPLOAD_PATH;
  } catch (_error) {
    return false;
  }
}

async function routeMusicUpload(init, nativeFetch) {
  try {
    const form = init?.body;
    if (!(form instanceof FormData)) return jsonResponse(400, 'Music upload request was not multipart form data.');

    const slug = slugify(form.get('slug'));
    const file = form.get('file');
    if (!slug) return jsonResponse(400, 'Music upload slug is missing or invalid.');
    if (!(file instanceof File)) return jsonResponse(400, 'Music upload file is missing.');
    if (file.type !== 'audio/mpeg' || !/\.mp3$/i.test(file.name || '')) {
      return jsonResponse(400, 'Game music must be an MP3 file.');
    }
    if (!file.size || file.size > MAX_MUSIC_BYTES) {
      return jsonResponse(400, 'Game music must be between 1 byte and 25 MiB.');
    }

    const client = await window.ccgSupabase?.getClient?.();
    const { data, error } = await client?.auth?.getSession?.() || {};
    const token = data?.session?.access_token;
    if (error || !token) return jsonResponse(401, 'Your admin session has expired. Sign in again before retrying music upload.');

    const signerResponse = await nativeFetch(MUSIC_SIGNER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        slug,
        size: file.size,
        contentType: 'audio/mpeg'
      })
    });
    const signerPayload = await signerResponse.json().catch(() => ({}));
    if (!signerResponse.ok || !signerPayload?.ok || !signerPayload?.uploadUrl) {
      return jsonResponse(
        signerResponse.status || 502,
        friendlySignerError(signerPayload?.error, signerResponse.status)
      );
    }

    const uploadResponse = await nativeFetch(signerPayload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
      body: file
    });
    if (!uploadResponse.ok) {
      return jsonResponse(502, `R2 music upload failed (${uploadResponse.status}). Check the game-music bucket CORS policy and retry.`);
    }

    return new Response(JSON.stringify({
      ok: true,
      key: signerPayload.key || `${slug}.mp3`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return jsonResponse(502, `Music upload failed before R2 accepted the file: ${error?.message || error}`);
  }
}

function friendlySignerError(code, status) {
  const value = String(code || '').trim();
  if (value === 'r2_credentials_not_configured') {
    return 'R2 upload credentials are not configured in the secure Supabase function environment.';
  }
  if (value === 'publisher_role_required') return 'Your account is signed in but is not authorised to publish game music.';
  if (value === 'invalid_session' || status === 401) return 'Your admin session has expired. Sign in again before retrying music upload.';
  if (value === 'origin_not_allowed') return 'The music upload signer rejected this website origin.';
  return value ? `Music upload signer failed: ${value}.` : `Music upload signer failed (${status || 'unknown status'}).`;
}

function jsonResponse(status, error) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
