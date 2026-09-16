const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const MUSIC_UPLOAD_URL = '/api/admin/game-music';
const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const MUSIC_EXPECTED_KEY = 'ccg_publisher_music_expected_v1';
const HAS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

const form = HAS_BROWSER ? document.querySelector('[data-game-form]') : null;
const titleInput = HAS_BROWSER ? document.querySelector('[data-game-field="title"]') : null;
const slugInput = HAS_BROWSER ? document.querySelector('[data-game-field="slug"]') : null;
const idInput = HAS_BROWSER ? document.querySelector('[data-game-field="id"]') : null;
const thumbnailInput = HAS_BROWSER ? document.querySelector('[data-game-field="thumbnail"]') : null;
const videoIdInput = HAS_BROWSER ? document.querySelector('[data-game-field="videoId"]') : null;
const lemonInput = HAS_BROWSER ? document.querySelector('[data-game-field="lemonUrl"]') : null;
const thumbnailFile = HAS_BROWSER ? document.querySelector('[data-game-thumbnail-file]') : null;
const musicFile = HAS_BROWSER ? document.querySelector('[data-game-music-file]') : null;
const log = HAS_BROWSER ? document.querySelector('[data-publisher-log]') : null;

const nativeFetch = HAS_BROWSER ? window.fetch.bind(window) : null;
let musicReadyKey = '';
let musicReadyPayload = null;
let resubmitting = false;

if (HAS_BROWSER) {
  installInternalFieldUi();
  installCanonicalFieldAutomation();
  installMusicBarrier();
  installCompletionGuard();
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

function isCreateMode() {
  if (!HAS_BROWSER) return true;
  return String(document.querySelector('[data-game-edit-mode]')?.value || 'create') !== 'edit';
}

function canonicalThumbnail(slug) {
  return slug ? `${THUMBNAIL_PREFIX}${slug}.webp` : '';
}

function dispatchValue(node, value) {
  if (!node || node.value === value) return;
  node.value = value;
  node.dispatchEvent(new Event('input', { bubbles: true }));
  node.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncInternalFields() {
  if (!isCreateMode()) return;
  const slug = slugify(titleInput?.value || slugInput?.value || '');
  if (!slug) return;
  dispatchValue(slugInput, slug);
  dispatchValue(idInput, slug.replace(/-/g, '_'));
  dispatchValue(thumbnailInput, canonicalThumbnail(slug));
}

function installCanonicalFieldAutomation() {
  titleInput?.addEventListener('input', () => queueMicrotask(syncInternalFields));
  thumbnailFile?.addEventListener('change', () => {
    if (thumbnailFile.files?.[0]) syncInternalFields();
  }, { capture: true });
  form?.addEventListener('submit', syncInternalFields, { capture: true });
}

function installInternalFieldUi() {
  if (!form) return;
  const advanced = document.createElement('details');
  advanced.className = 'publisher-card publisher-card--subtle';
  advanced.dataset.publisherAdvancedRecovery = 'true';
  advanced.innerHTML = '<summary><strong>Advanced recovery fields</strong></summary><p>Normally leave these alone. They are generated automatically and are exposed only for recovery or source correction.</p>';

  const labels = [slugInput, idInput, thumbnailInput, videoIdInput]
    .map((input) => input?.closest('label'))
    .filter(Boolean);
  labels.forEach((label) => {
    label.hidden = true;
    advanced.appendChild(label);
  });

  const lemonLabel = lemonInput?.closest('label');
  if (lemonLabel) advanced.appendChild(lemonLabel);

  const credits = form.querySelector('.publisher-card.publisher-card--subtle');
  if (credits) credits.insertAdjacentElement('beforebegin', advanced);
  else form.appendChild(advanced);
}

function musicFingerprint(slug, file) {
  return file && slug ? `${slug}:${file.size}:${file.lastModified}` : '';
}

function readExpectedMusic() {
  if (!HAS_BROWSER) return {};
  try { return JSON.parse(localStorage.getItem(MUSIC_EXPECTED_KEY) || '{}'); } catch { return {}; }
}

function writeExpectedMusic(slug, value) {
  if (!HAS_BROWSER || !slug) return;
  const map = readExpectedMusic();
  if (value) map[slug] = value;
  else delete map[slug];
  try { localStorage.setItem(MUSIC_EXPECTED_KEY, JSON.stringify(map)); } catch { /* optional */ }
}

async function uploadMusicBeforeCommit(slug, file) {
  if (!HAS_BROWSER || !nativeFetch) throw new Error('Browser upload runtime is unavailable.');
  const client = await window.ccgSupabase?.getClient?.();
  const { data, error } = await client?.auth?.getSession?.() || {};
  const token = data?.session?.access_token;
  if (error || !token) throw new Error('Your admin session has expired. Sign in again before publishing music.');
  const body = new FormData();
  body.set('slug', slug);
  body.set('file', file, `${slug}.mp3`);
  const response = await nativeFetch(MUSIC_UPLOAD_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Music upload failed (${response.status}).`);
  return payload;
}

function installMusicBarrier() {
  if (!form || !musicFile || !HAS_BROWSER) return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url === MUSIC_UPLOAD_URL && String(init.method || 'GET').toUpperCase() === 'POST' && musicReadyPayload) {
      const slug = String(init.body?.get?.('slug') || '');
      const file = init.body?.get?.('file');
      const key = musicFingerprint(slug, file);
      if (key && key === musicReadyKey) {
        return new Response(JSON.stringify(musicReadyPayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return originalFetch(input, init);
  };

  form.addEventListener('submit', (event) => {
    if (resubmitting) return;
    const file = musicFile.files?.[0] || null;
    if (!file) return;

    syncInternalFields();
    const slug = slugify(slugInput?.value || titleInput?.value || '');
    const key = musicFingerprint(slug, file);
    if (!slug || !key || key === musicReadyKey) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const submitter = event.submitter;
    setGameValidation('Uploading and verifying the selected MP3 before the game source is committed…', false);

    void (async () => {
      try {
        const payload = await uploadMusicBeforeCommit(slug, file);
        musicReadyKey = key;
        musicReadyPayload = payload;
        writeExpectedMusic(slug, { uploaded: true, key: payload.key || `${slug}.mp3`, at: new Date().toISOString() });
        writeLog(`Game music preflight verified before source commit: ${payload.key || `${slug}.mp3`}`);
        resubmitting = true;
        try {
          if (typeof form.requestSubmit === 'function') form.requestSubmit(submitter || undefined);
          else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        } finally {
          queueMicrotask(() => { resubmitting = false; });
        }
      } catch (error) {
        musicReadyKey = '';
        musicReadyPayload = null;
        writeExpectedMusic(slug, null);
        setGameValidation(`Music upload failed. Nothing was committed. ${error.message}`, true);
        setPipeline('source', 'error', 'Blocked before commit');
        writeLog(`Music preflight stopped publication: ${error.message}`, true);
      }
    })();
  }, { capture: true });
}

function installCompletionGuard() {
  if (!log || typeof MutationObserver !== 'function') return;
  let checking = false;
  let lastSlug = '';
  const observer = new MutationObserver(() => {
    const text = String(log.textContent || '');
    const matches = [...text.matchAll(/Preparing (?:new game|game update):\s*.+?\s*\(([^)]+)\)/g)];
    const slug = matches.at(-1)?.[1] || '';
    if (slug) lastSlug = slug;
    if (!lastSlug || checking) return;
    const liveIndex = text.lastIndexOf(`Live page confirmed: ${SITE_ORIGIN}/games/${lastSlug}/`);
    const rebuildIndex = text.lastIndexOf('Publishing rebuild completed from the existing source record.');
    if (liveIndex < 0 && rebuildIndex < 0) return;
    checking = true;
    void verifyCompletion(lastSlug).finally(() => { checking = false; });
  });
  observer.observe(log, { childList: true, subtree: true, characterData: true });
}

async function verifyCompletion(slug) {
  if (!nativeFetch) return;
  const issues = [];
  try {
    const pendingResponse = await nativeFetch(`/data/lemon-source-pending.json?publisher_integrity=${Date.now()}`, { cache: 'no-store' });
    if (pendingResponse.ok) {
      const pending = await pendingResponse.json();
      if (Array.isArray(pending) && pending.includes(slug)) issues.push('automatic magazine/Lemon source resolution is still pending');
    }
  } catch {
    issues.push('magazine-source completion could not be verified');
  }

  try {
    const gamesResponse = await nativeFetch(`/games/games.json?publisher_integrity=${Date.now()}`, { cache: 'no-store' });
    if (!gamesResponse.ok) throw new Error(`HTTP ${gamesResponse.status}`);
    const games = await gamesResponse.json();
    const game = Array.isArray(games) ? games.find((item) => item?.slug === slug) : null;
    if (!game) issues.push('live games.json does not contain the published slug');
    else if (isCreateMode() && String(game.thumbnail || '') !== canonicalThumbnail(slug)) issues.push(`thumbnail path is not canonical (${canonicalThumbnail(slug)})`);
  } catch {
    issues.push('live game source could not be verified');
  }

  const expectedMusic = readExpectedMusic()[slug];
  if (expectedMusic && !expectedMusic.uploaded) issues.push('selected game music was not verified');

  if (issues.length) {
    setPipeline('validation', 'error', 'Incomplete publication');
    setPipeline('live', 'error', 'Live but incomplete');
    writeLog(`Publication integrity check failed for ${slug}: ${issues.join('; ')}.`, true);
    return;
  }

  setPipeline('validation', 'ok', 'Passed + integrity verified');
  setPipeline('live', 'ok', 'Live & complete');
  writeLog(`Publication integrity verified for ${slug}: source, enrichment state and required assets are complete.`);
}

function setPipeline(step, state, text) {
  if (!HAS_BROWSER) return;
  const node = document.querySelector(`[data-pipeline-step="${step}"]`);
  if (!node) return;
  node.classList.remove('is-running', 'is-ok', 'is-error');
  if (state === 'running') node.classList.add('is-running');
  if (state === 'ok') node.classList.add('is-ok');
  if (state === 'error') node.classList.add('is-error');
  const status = node.querySelector('b');
  if (status) status.textContent = text;
}

function setGameValidation(message, error) {
  if (!HAS_BROWSER) return;
  const node = document.querySelector('[data-game-validation]');
  if (!node) return;
  node.hidden = false;
  node.classList.toggle('is-ok', !error);
  node.textContent = message;
}

function writeLog(message, isError = false) {
  if (!log) return;
  const current = log.textContent === 'No publishing job has been started in this session.' ? '' : log.textContent;
  const prefix = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  log.textContent = `${current}${current ? '\n' : ''}[${prefix}] ${isError ? 'ERROR: ' : ''}${message}`;
  log.scrollTop = log.scrollHeight;
}
