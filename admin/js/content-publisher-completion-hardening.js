const MUSIC_UPLOAD_URL = '/api/admin/game-music';
const MUSIC_BASE_URL = 'https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/';
const MUSIC_EXPECTED_KEY = 'ccg_publisher_music_expected_v1';

const SUCCESS_TEXT = /^(?:source saved|verified|generated|refreshed|regenerated|passed(?:\s*\+.*)?|live\s*&\s*complete|complete|success)$/i;
const PIPELINE_ORDER = ['source', 'metadata', 'pages', 'library', 'sitemaps', 'validation', 'live'];

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

function pipelineNode(step) {
  return document.querySelector(`[data-pipeline-step="${step}"]`);
}

function pipelineStatus(step) {
  const node = pipelineNode(step);
  return {
    node,
    text: String(node?.querySelector('b')?.textContent || '').trim(),
    ok: Boolean(node?.classList.contains('is-ok'))
  };
}

function isSuccessfulStep(step) {
  const status = pipelineStatus(step);
  return status.ok || SUCCESS_TEXT.test(status.text);
}

function setPipeline(step, state, text) {
  const node = pipelineNode(step);
  if (!node) return;
  node.classList.remove('is-running', 'is-ok', 'is-error');
  if (state === 'running') node.classList.add('is-running');
  if (state === 'ok') node.classList.add('is-ok');
  if (state === 'error') node.classList.add('is-error');
  const label = node.querySelector('b');
  if (label) label.textContent = text;
}

function writeLog(message, error = false) {
  const log = document.querySelector('[data-publisher-log]');
  if (!log) return;
  const empty = 'No publishing job has been started in this session.';
  const current = log.textContent === empty ? '' : log.textContent;
  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  log.textContent = `${current}${current ? '\n' : ''}[${stamp}] ${error ? 'ERROR: ' : ''}${message}`;
  log.scrollTop = log.scrollHeight;
}

function enforcePipelineTruth() {
  const live = pipelineStatus('live');
  if (!live.node) return;

  const upstream = PIPELINE_ORDER.slice(0, -1);
  const incomplete = upstream.filter((step) => !isSuccessfulStep(step));
  const claimsComplete = live.ok || /live(?:\s*&\s*complete)?|complete|success/i.test(live.text);

  if (claimsComplete && incomplete.length) {
    live.node.classList.remove('is-ok');
    live.node.classList.add('is-error');
    const label = live.node.querySelector('b');
    if (label) label.textContent = 'Reachable · publication incomplete';
  }
}

function installStrictCompletionObserver() {
  const pipeline = document.querySelector('[data-pipeline]');
  if (!pipeline || typeof MutationObserver !== 'function') return;
  let correcting = false;
  const observer = new MutationObserver(() => {
    if (correcting) return;
    correcting = true;
    try { enforcePipelineTruth(); } finally { queueMicrotask(() => { correcting = false; }); }
  });
  observer.observe(pipeline, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  enforcePipelineTruth();
}

function currentRecoveryTitle() {
  const text = String(document.body?.innerText || '');
  const match = text.match(/Publication recovery\s+([^\n·]+?)\s*·\s*source\b/i);
  if (match?.[1]) return match[1].trim();
  return String(document.querySelector('[data-game-field="title"]')?.value || '').trim();
}

function readExpectedMusic() {
  try { return JSON.parse(localStorage.getItem(MUSIC_EXPECTED_KEY) || '{}'); } catch { return {}; }
}

function writeExpectedMusic(slug, value) {
  const map = readExpectedMusic();
  if (value) map[slug] = value;
  else delete map[slug];
  try { localStorage.setItem(MUSIC_EXPECTED_KEY, JSON.stringify(map)); } catch { /* browser storage is optional */ }
}

async function getAdminToken() {
  const client = await window.ccgSupabase?.getClient?.();
  const result = await client?.auth?.getSession?.();
  const token = result?.data?.session?.access_token;
  if (result?.error || !token) throw new Error('Your admin session has expired. Sign in again before repairing music.');
  return token;
}

async function verifyPublicMusic(slug) {
  const url = `${MUSIC_BASE_URL}${encodeURIComponent(slug)}.mp3?publisher_verify=${Date.now()}`;
  await new Promise((resolve, reject) => {
    const audio = new Audio();
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('The uploaded MP3 could not be verified on the public music host.'));
    }, 15000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('The public music host returned an error for the repaired MP3.')); };
    audio.addEventListener('loadedmetadata', onReady, { once: true });
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.preload = 'metadata';
    audio.src = url;
    audio.load();
  });
}

async function uploadRepairMusic(file, title, status) {
  const slug = slugify(title);
  if (!slug) throw new Error('Could not determine the current game slug.');
  if (!file) throw new Error('Choose the original MP3 first.');
  if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') throw new Error('The repair file must be an MP3.');

  status.textContent = `Uploading ${slug}.mp3…`;
  const token = await getAdminToken();
  const body = new FormData();
  body.set('slug', slug);
  body.set('file', file, `${slug}.mp3`);
  const response = await fetch(MUSIC_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Music upload failed (${response.status}).`);

  status.textContent = 'Upload accepted. Verifying the public MP3…';
  await verifyPublicMusic(slug);
  writeExpectedMusic(slug, { uploaded: true, publicVerified: true, key: payload.key || `${slug}.mp3`, at: new Date().toISOString() });
  status.textContent = `${slug}.mp3 uploaded and publicly verified. Rebuilding the existing source record…`;
  writeLog(`Music repair verified for ${slug}: ${payload.key || `${slug}.mp3`}.`);
  setPipeline('validation', 'running', 'Revalidating');
  setPipeline('live', 'running', 'Waiting for complete rebuild');

  const retry = Array.from(document.querySelectorAll('button')).find((button) => /retry game publishing on current main/i.test(button.textContent || ''));
  if (retry && !retry.disabled) retry.click();
  else status.textContent = `${slug}.mp3 is repaired and verified. Use “Retry game publishing on current main” to rebuild the existing game.`;
}

function installMusicRecovery() {
  const statusPanel = document.querySelector('[data-panel="status"]');
  if (!statusPanel || document.querySelector('[data-music-recovery]')) return;

  const card = document.createElement('section');
  card.className = 'publisher-card publisher-card--subtle';
  card.dataset.musicRecovery = 'true';
  card.innerHTML = `
    <h3>Repair music for current publication</h3>
    <p>If a game source was saved but its MP3 was lost during an earlier partial publish, select the original MP3 here. This replaces only <code>&lt;slug&gt;.mp3</code>; it never creates another game.</p>
    <div class="publisher-header-actions">
      <input type="file" accept="audio/mpeg,.mp3" data-music-recovery-file />
      <button class="ccg-btn ccg-btn--secondary" type="button" data-music-recovery-submit>Upload, verify & rebuild</button>
    </div>
    <p data-music-recovery-status aria-live="polite">No repair file selected.</p>`;

  const log = statusPanel.querySelector('.publisher-log');
  if (log) log.insertAdjacentElement('beforebegin', card);
  else statusPanel.appendChild(card);

  const fileInput = card.querySelector('[data-music-recovery-file]');
  const button = card.querySelector('[data-music-recovery-submit]');
  const status = card.querySelector('[data-music-recovery-status]');
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    status.textContent = file ? `${file.name} selected for ${currentRecoveryTitle() || 'the current publication'}.` : 'No repair file selected.';
  });
  button?.addEventListener('click', () => {
    button.disabled = true;
    void uploadRepairMusic(fileInput?.files?.[0] || null, currentRecoveryTitle(), status)
      .catch((error) => {
        status.textContent = `Music repair failed: ${error.message}`;
        setPipeline('validation', 'error', 'Music repair failed');
        setPipeline('live', 'error', 'Publication incomplete');
        writeLog(`Music repair failed: ${error.message}`, true);
      })
      .finally(() => { button.disabled = false; });
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installStrictCompletionObserver();
  installMusicRecovery();
}
