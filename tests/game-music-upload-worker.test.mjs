import assert from 'node:assert/strict';
import test from 'node:test';
import { createMusicUploadHandler, musicObjectKey } from '../workers/game-music-upload/src/handler.mjs';

const env = (overrides = {}) => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only',
  ALLOWED_ADMIN_ORIGIN: 'https://admin.example.test',
  GAME_MUSIC: { puts: [], async put(key, body, options) { this.puts.push({ key, body, options }); } },
  ...overrides
});

function request({ token = 'valid', slug = 'premiere', file = new File(['mp3'], 'premiere.mp3', { type: 'audio/mpeg' }) } = {}) {
  const form = new FormData(); form.set('slug', slug); if (file) form.set('file', file);
  return new Request('https://worker.example/api/admin/game-music', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: form });
}

function fetchFor({ user = { id: 'user-1' }, role = 'editor' } = {}) {
  return async (url) => {
    if (url.includes('/auth/v1/user')) return user ? Response.json(user) : new Response('', { status: 401 });
    if (url.includes('/rest/v1/user_roles')) return Response.json(role ? [{ role }] : []);
    throw new Error(`unexpected ${url}`);
  };
}

test('music object keys are exactly one safe slug plus .mp3', () => {
  assert.equal(musicObjectKey('Premiere'), 'premiere.mp3');
  assert.equal(musicObjectKey('bad/path'), '');
});

test('authenticated elevated user uploads an MP3 to GAME_MUSIC', async () => {
  const runtime = env();
  const response = await createMusicUploadHandler({ fetchImpl: fetchFor() })(request(), runtime);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true, key: 'premiere.mp3', bytes: 3 });
  assert.equal(runtime.GAME_MUSIC.puts[0].key, 'premiere.mp3');
  assert.equal(runtime.GAME_MUSIC.puts[0].options.httpMetadata.contentType, 'audio/mpeg');
});

test('missing or invalid tokens and insufficient roles cannot upload', async () => {
  const handler = createMusicUploadHandler({ fetchImpl: fetchFor({ user: null }) });
  assert.equal((await handler(request({ token: '' }), env())).status, 401);
  assert.equal((await handler(request(), env())).status, 401);
  const denied = createMusicUploadHandler({ fetchImpl: fetchFor({ role: 'member' }) });
  assert.equal((await denied(request(), env())).status, 403);
});

test('invalid slug, MIME type, and size are rejected before R2 writes', async () => {
  const handler = createMusicUploadHandler({ fetchImpl: fetchFor() });
  assert.equal((await handler(request({ slug: '../premiere' }), env())).status, 400);
  assert.equal((await handler(request({ file: new File(['x'], 'premiere.wav', { type: 'audio/wav' }) }), env())).status, 415);
  assert.equal((await handler(request({ file: new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'premiere.mp3', { type: 'audio/mpeg' }) }), env())).status, 413);
});
