import { APP_PATHS } from './config.js?v=admin-stable-20260207';
import { buildStubStructure } from './games-api.js?v=admin-stable-20260207';
import { ensureRole, startAccessMonitor } from './guard.js?v=admin-stable-20260207';
import { createSnapshot, getHealthReport, scanAssets, uploadAssets } from './asset-manager-api.js?v=admin-stable-20260207';

const MAX_TARGET_BYTES = 500 * 1024;
const allowedRoles = ['editor', 'admin', 'superadmin'];

const state = {
  role: null,
  assets: [],
  queuedFiles: [],
  selectedAssetPath: ''
};

const els = {
  email: document.querySelector('[data-admin-email]'),
  role: document.querySelector('[data-admin-role]'),
  rolePolicy: document.querySelector('[data-role-policy]'),
  assetCount: document.querySelector('[data-asset-count]'),
  refreshIndex: document.querySelector('[data-refresh-index]'),
  runHealth: document.querySelector('[data-run-health]'),
  search: document.querySelector('[data-asset-search]'),
  assetList: document.querySelector('[data-asset-list]'),
  dropzone: document.querySelector('[data-dropzone]'),
  fileInput: document.querySelector('[data-file-input]'),
  uploadFolder: document.querySelector('[data-upload-folder]'),
  uploadBatch: document.querySelector('[data-upload-batch]'),
  uploadQueue: document.querySelector('[data-upload-queue]'),
  filenameInput: document.querySelector('[data-filename-input]'),
  suggestName: document.querySelector('[data-suggest-name]'),
  normaliserOutput: document.querySelector('[data-normaliser-output]'),
  previewStage: document.querySelector('[data-box-preview-stage]'),
  previewBox: document.querySelector('[data-box-preview]'),
  previewImage: document.querySelector('[data-box-preview-image]'),
  gameIdInput: document.querySelector('[data-game-id]'),
  assetPathInput: document.querySelector('[data-asset-path]'),
  validateLink: document.querySelector('[data-validate-link]'),
  linkingResult: document.querySelector('[data-linking-result]'),
  backupSnapshot: document.querySelector('[data-backup-snapshot]'),
  restoreHint: document.querySelector('[data-restore-hint]'),
  healthReport: document.querySelector('[data-health-report]'),
  logoutButton: document.querySelector('[data-logout]')
};

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function ensureExtension(path, fallback = 'webp') {
  if (/\.[a-z0-9]+$/i.test(path)) {
    return path.toLowerCase();
  }
  return `${path}.${fallback}`;
}

function prettyBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setRolePolicy(role) {
  if (role === 'editor') {
    els.rolePolicy.textContent = 'Editor: upload + preview only (no delete/purge).';
    return;
  }
  if (role === 'admin') {
    els.rolePolicy.textContent = 'Admin: upload, index, link, and health management.';
    return;
  }
  els.rolePolicy.textContent = 'Superadmin: full controls including delete + purge endpoints.';
}

function setHealthReport(status, extra = '') {
  if (!els.healthReport) return;
  els.healthReport.textContent = `${status}${extra ? `\n${extra}` : ''}`;
}

function setAssetCount(value) {
  if (!els.assetCount) return;
  els.assetCount.textContent = value;
}

function setQueuedSummary(list = []) {
  if (!els.uploadQueue) return;
  if (!list.length) {
    els.uploadQueue.textContent = 'No pending uploads.';
    return;
  }

  els.uploadQueue.textContent = list
    .map((file) => `${file.name} · ${prettyBytes(file.size)}`)
    .join('\n');
}

function renderAssetList(filter = '') {
  if (!els.assetList) return;
  const term = String(filter || '').toLowerCase();
  const filtered = state.assets.filter((asset) => asset.path.toLowerCase().includes(term));

  if (!filtered.length) {
    els.assetList.innerHTML = '<li class="empty">No assets found.</li>';
    return;
  }

  els.assetList.innerHTML = filtered
    .map(
      (asset) => `
        <li data-asset-path="${asset.path}">
          <span>${asset.path}</span>
          <span>${prettyBytes(asset.bytes)}</span>
        </li>
      `
    )
    .join('');

  els.assetList.querySelectorAll('li[data-asset-path]').forEach((item) => {
    item.addEventListener('click', () => {
      state.selectedAssetPath = item.dataset.assetPath || '';
      els.assetPathInput.value = state.selectedAssetPath;
    });
  });
}

async function indexAssets() {
  setHealthReport('Scanning assets…');
  const assets = await scanAssets(APP_PATHS.resourcesRoot);
  state.assets = assets;
  renderAssetList(els.search?.value || '');
  setAssetCount(`${assets.length} assets indexed`);
  setHealthReport('Asset index complete.');
}

async function runHealthReport() {
  setHealthReport('Running health report…');
  const report = await getHealthReport();
  setHealthReport('Health report complete.', JSON.stringify(report, null, 2));
}

async function uploadBatch() {
  if (!state.queuedFiles.length) {
    setHealthReport('No files queued for upload.');
    return;
  }

  const totalBytes = state.queuedFiles.reduce((acc, file) => acc + file.size, 0);
  if (totalBytes > MAX_TARGET_BYTES) {
    setHealthReport(`Upload batch too large (${prettyBytes(totalBytes)}).`);
    return;
  }

  setHealthReport('Uploading files…');
  await uploadAssets(state.queuedFiles);
  state.queuedFiles = [];
  setQueuedSummary(state.queuedFiles);
  await indexAssets();
  setHealthReport('Upload complete.');
}

function bindDropzone() {
  if (!els.dropzone || !els.fileInput) return;

  function handleFiles(list) {
    state.queuedFiles = Array.from(list);
    setQueuedSummary(state.queuedFiles);
  }

  els.fileInput.addEventListener('change', (event) => {
    handleFiles(event.target.files || []);
  });

  els.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    els.dropzone.classList.add('is-dragover');
  });

  els.dropzone.addEventListener('dragleave', () => {
    els.dropzone.classList.remove('is-dragover');
  });

  els.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    els.dropzone.classList.remove('is-dragover');
    handleFiles(event.dataTransfer.files || []);
  });
}

function bindNormalizer() {
  if (!els.filenameInput || !els.suggestName) return;

  els.suggestName.addEventListener('click', () => {
    const clean = slugify(els.filenameInput.value);
    els.filenameInput.value = ensureExtension(clean);
  });
}

function bind3DPreview() {
  if (!els.previewStage || !els.previewBox || !els.previewImage) return;

  els.previewStage.addEventListener('input', () => {
    els.previewBox.style.setProperty('--box-depth', `${Number(els.previewStage.value || 0)}deg`);
  });

  els.previewImage.addEventListener('input', () => {
    els.previewBox.style.setProperty('--box-image', `url(${els.previewImage.value})`);
  });
}

function wireButtons() {
  els.refreshIndex.addEventListener('click', () => {
    indexAssets().catch((error) => {
      els.healthReport.textContent = error.message;
    });
  });

  els.runHealth.addEventListener('click', () => {
    runHealthReport().catch((error) => {
      els.healthReport.textContent = error.message;
    });
  });

  els.search.addEventListener('input', () => renderAssetList(els.search.value));
  els.uploadBatch.addEventListener('click', () => {
    uploadBatch().catch((error) => {
      els.healthReport.textContent = error.message;
    });
  });

  els.backupSnapshot.addEventListener('click', async () => {
    const result = await createSnapshot();
    els.healthReport.textContent = JSON.stringify(result, null, 2);
  });

  els.restoreHint.addEventListener('click', () => {
    els.healthReport.textContent = [
      'Restore workflow:',
      '1) Open GitHub commit history for resources/images.',
      '2) Select snapshot commit id from audit log.',
      '3) Revert commit or restore target files.',
      '4) Re-run health check to validate integrity.'
    ].join('\n');
  });

}

async function wireGameLinking() {
  if (!els.gameIdInput || !els.assetPathInput || !els.validateLink || !els.linkingResult) {
    return;
  }

  els.validateLink.addEventListener('click', () => {
    const gameId = els.gameIdInput.value.trim();
    const assetPath = els.assetPathInput.value.trim();
    if (!gameId || !assetPath) {
      els.linkingResult.textContent = 'Enter both game id and asset path.';
      return;
    }

    const url = `${APP_PATHS.gamesJson}?game_id=${encodeURIComponent(gameId)}&asset=${encodeURIComponent(assetPath)}`;
    els.linkingResult.textContent = `Checking ${url}`;

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        return response.json();
      })
      .then((data) => {
        els.linkingResult.textContent = JSON.stringify(data, null, 2);
      })
      .catch((error) => {
        els.linkingResult.textContent = `Unable to validate link: ${error.message}`;
      });
  });
}

function exposeStubBuilder() {
  window.CCGStubBuilder = (slug, meta = {}) => buildStubStructure({ slug, meta });
}

async function init() {
  const access = await ensureRole(allowedRoles);
  if (!access) return;

  state.role = access.role;
  els.email.textContent = access.session.user?.email || 'unknown';
  els.role.textContent = access.role;
  setRolePolicy(access.role);

  startAccessMonitor();
  wireDropzone();
  wireNormalizer();
  wire3DPreview();
  wireButtons();
  exposeStubBuilder();
  await wireGameLinking();
  await indexAssets();
}

init().catch((error) => {
  els.healthReport.textContent = `Initialization error: ${error.message}`;
});
