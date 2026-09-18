const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const form = document.querySelector('[data-game-form]');
const titleInput = document.querySelector('[data-game-field="title"]');
const slugInput = document.querySelector('[data-game-field="slug"]');
const thumbnailPathInput = document.querySelector('[data-game-field="thumbnail"]');
const thumbnailFileInput = document.querySelector('[data-game-thumbnail-file]');
const logNode = document.querySelector('[data-publisher-log]');

if (form) {
  installCanonicalThumbnailGuard();
  installCompletionGuard();
}

function installCanonicalThumbnailGuard() {
  const sync = () => {
    if (!thumbnailPathInput || !thumbnailFileInput?.files?.[0]) return;
    const slug = slugify(slugInput?.value || titleInput?.value || '');
    if (!slug) return;
    const file = thumbnailFileInput.files[0];
    const extension = imageExtensionFromMime(file.type) || imageExtension(file.name) || 'webp';
    const expected = `${THUMBNAIL_PREFIX}${slug}.${extension === 'jpeg' ? 'jpg' : extension}`;
    if (thumbnailPathInput.value !== expected) {
      thumbnailPathInput.value = expected;
      thumbnailPathInput.dispatchEvent(new Event('input', { bubbles: true }));
      thumbnailPathInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  thumbnailFileInput?.addEventListener('change', sync);
  slugInput?.addEventListener('input', sync);
  titleInput?.addEventListener('input', sync);
  form.addEventListener('submit', sync, { capture: true });
}

function installCompletionGuard() {
  if (!logNode || typeof MutationObserver !== 'function') return;
  let checking = false;
  let lastKey = '';

  const reconcile = async () => {
    if (checking) return;
    const slug = slugify(slugInput?.value || readStoredPublicationSlug() || '');
    if (!slug) return;

    const liveNode = pipelineNode('live');
    const liveText = String(liveNode?.querySelector('b')?.textContent || '');
    const logText = String(logNode.textContent || '');
    if (liveText !== 'Live' && !/Live page confirmed:/i.test(logText)) return;

    const key = `${slug}|${liveText}|${logText.length}`;
    if (key === lastKey) return;
    lastKey = key;
    checking = true;

    try {
      const problems = [];
      const upstream = ['metadata', 'pages', 'library', 'sitemaps', 'validation'];
      upstream.forEach((step) => {
        const node = pipelineNode(step);
        if (!node?.classList.contains('is-ok')) problems.push(`${step} is not complete`);
      });

      const pending = await fetchPendingLemonSlugs();
      if (pending.has(slug)) {
        problems.push('automatic Lemon source discovery is unresolved');
        setPipelineStep('validation', 'error', 'Magazine reviews unresolved');
      }

      if (problems.length) {
        setPipelineStep('live', 'error', 'Incomplete');
        writeGuardLog(`Publication is reachable but incomplete for ${slug}: ${problems.join('; ')}.`);
      }
    } finally {
      checking = false;
    }
  };

  const observer = new MutationObserver(() => { void reconcile(); });
  observer.observe(logNode, { childList: true, subtree: true, characterData: true });
  document.querySelector('[data-panel="status"]')?.addEventListener('click', () => { void reconcile(); });
}

async function fetchPendingLemonSlugs() {
  try {
    const response = await fetch(`/data/lemon-source-pending.json?publisher_guard=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return new Set();
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.pending) ? payload.pending : Array.isArray(payload?.entries) ? payload.entries : [];
    return new Set(rows.map((row) => slugify(row?.slug || row?.gameSlug || row?.id || '')).filter(Boolean));
  } catch (_error) {
    return new Set();
  }
}

function readStoredPublicationSlug() {
  try {
    const raw = localStorage.getItem('ccg_publisher_last_game_publication_v2');
    const parsed = raw ? JSON.parse(raw) : null;
    return String(parsed?.slug || '');
  } catch (_error) {
    return '';
  }
}

function setPipelineStep(step, state, text) {
  const node = pipelineNode(step);
  if (!node) return;
  node.classList.remove('is-running', 'is-ok', 'is-error');
  if (state === 'running') node.classList.add('is-running');
  if (state === 'ok') node.classList.add('is-ok');
  if (state === 'error') node.classList.add('is-error');
  const status = node.querySelector('b');
  if (status) status.textContent = text;
}

function pipelineNode(step) {
  return document.querySelector(`[data-pipeline-step="${step}"]`);
}

function writeGuardLog(message) {
  if (!logNode) return;
  const current = logNode.textContent === 'No publishing job has been started in this session.' ? '' : logNode.textContent;
  if (current.includes(message)) return;
  const prefix = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  logNode.textContent = `${current}${current ? '\n' : ''}[${prefix}] ERROR: ${message}`;
  logNode.scrollTop = logNode.scrollHeight;
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

function imageExtension(value) {
  const match = String(value || '').trim().toLowerCase().match(/\.(png|jpe?g|webp)$/i);
  return match ? match[1] : '';
}

function imageExtensionFromMime(value) {
  const mime = String(value || '').toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return '';
}
