const CCG_EDIT_SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const DEFAULT_OWNER = 'joepentony-dot';
const DEFAULT_REPO = 'ccgamer_website_new';
const DEFAULT_BRANCH = 'main';
const CCG_EDIT_SOURCE_PATH = 'games/games.json';
const CCG_EDIT_BOX_PREFIX = 'resources/images/games/boxes-3d/';
const CCG_EDIT_THUMB_PREFIX = 'resources/images/thumbnails/all/';
const CCG_EDIT_MUSIC_URL = '/api/admin/game-music';
const CCG_EDIT_MAX_MUSIC = 25 * 1024 * 1024;
const CCG_EDIT_STORAGE_KEY = 'ccg_publisher_last_game_publication_v2';
const CCG_EDIT_POLL_MS = 6000;
const CCG_EDIT_TIMEOUT_MS = 240000;

const ccgEditForm = typeof document !== 'undefined' ? document.querySelector('[data-game-form]') : null;
if (ccgEditForm) ccgEditForm.addEventListener('submit', ccgInterceptExistingGameUpdate, { capture: true });

async function ccgInterceptExistingGameUpdate(event) {
  if (String(document.querySelector('[data-game-edit-mode]')?.value || '') !== 'edit') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  await ccgUpdateExistingGame();
}

async function ccgUpdateExistingGame() {
  const originalSlug = String(document.querySelector('[data-game-edit-select]')?.value || '').trim();
  if (!originalSlug) return ccgEditValidation(['Choose an existing game before updating.']);

  let config;
  try { config = ccgEditGithubConfig(); }
  catch (error) { return ccgEditValidation([error.message]); }

  const button = document.querySelector('[data-publish-game]');
  ccgEditButton(button, true, 'Updating…');
  ccgEditResetPipeline();
  ccgEditStep('source', 'running', 'Checking');
  document.querySelector('[data-tab="status"]')?.click();
  ccgEditLog(`Preparing game update: ${ccgGameValue('title') || originalSlug} (${originalSlug})`);

  try {
    const source = await ccgEditFetchJsonFile(config, CCG_EDIT_SOURCE_PATH);
    const index = source.data.findIndex((game) => String(game?.slug || '').toLowerCase() === originalSlug.toLowerCase());
    if (index < 0) throw new Error('The selected game is no longer present in GitHub. Refresh the publisher and select it again.');

    const original = source.data[index];
    const entry = ccgBuildEditedGame(original);
    const errors = ccgValidateEditedGame(entry, source.data, index);
    ccgEditValidation(errors);
    if (errors.length) {
      ccgEditStep('source', 'error', 'Validation failed');
      return;
    }

    const thumbnailFile = document.querySelector('[data-game-thumbnail-file]')?.files?.[0] || null;
    const boxFile = document.querySelector('[data-game-box3d-file]')?.files?.[0] || null;
    const musicFile = document.querySelector('[data-game-music-file]')?.files?.[0] || null;
    if (boxFile && boxFile.type !== 'image/webp') throw new Error('3D box optimisation has not finished. Wait for the “3D box ready” message and try again.');
    const musicError = ccgValidateMusic(musicFile);
    if (musicError) throw new Error(musicError);

    const sourceChanged = JSON.stringify(entry) !== JSON.stringify(original);
    const files = [];
    if (sourceChanged) {
      const games = source.data.slice();
      games[index] = entry;
      games.sort(ccgCompareGames);
      files.push({ path: CCG_EDIT_SOURCE_PATH, text: `${JSON.stringify(games, null, 2)}\n` });
    }

    if (thumbnailFile) {
      files.push({ path: entry.thumbnail, base64: await ccgFileBase64(thumbnailFile) });
    } else if (entry.thumbnail !== original.thumbnail && !(await ccgEditFileExists(config, entry.thumbnail))) {
      throw new Error(`Thumbnail does not exist at ${entry.thumbnail}. Select the image file or restore the previous path.`);
    }

    const boxPath = `${CCG_EDIT_BOX_PREFIX}${ccgSlugify(entry.slug)}.webp`;
    if (boxFile) files.push({ path: boxPath, base64: await ccgFileBase64(boxFile) });

    if (!files.length && !musicFile) {
      ccgEditStep('source', 'ok', 'No changes');
      ccgEditNotNeeded();
      ccgEditStep('live', 'ok', 'Already live');
      ccgEditLog('No game data or asset changes were detected. Nothing was committed.');
      return;
    }

    let result = { mode: 'noop', commitSha: '' };
    if (files.length) result = await ccgEditCommit(config, files, `Update ${entry.title} via CCG Content Publisher`, entry.slug);

    if (result.mode === 'pr') {
      ccgEditStep('source', 'ok', 'PR opened');
      ccgEditLog(`Pull request created: ${result.prUrl}`);
      ['metadata', 'pages', 'library', 'sitemaps', 'validation', 'live'].forEach((step) => ccgEditStep(step, 'running', 'Merge PR first'));
      if (musicFile) ccgEditLog('Music upload is deferred until the repository update is merged.');
      return;
    }

    if (result.mode === 'noop') {
      ccgEditStep('source', 'ok', 'No Git change');
      if (files.length) ccgEditLog('Repository files already match this update. No empty Git commit was created.');
    } else {
      ccgEditStep('source', 'ok', 'Updated');
      ccgEditLog(`Source commit created: ${result.commitSha}`);
    }

    if (musicFile) {
      const upload = await ccgUploadMusic(entry.slug, musicFile);
      ccgEditLog(`Game music uploaded securely: ${upload.key || `${entry.slug}.mp3`}`);
    }

    if (result.mode === 'noop' || !files.length) {
      ccgEditNotNeeded();
      ccgEditStep('live', 'ok', musicFile ? 'Audio updated' : 'Already live');
      return;
    }

    ccgSaveEditJob(entry, result.commitSha, config.branch);

    if (!sourceChanged) {
      ccgEditNotNeeded();
      const assetPath = boxFile ? `/${boxPath}` : (thumbnailFile ? `/${entry.thumbnail}` : '');
      if (assetPath) {
        ccgEditStep('live', 'running', 'Deploy pending');
        const live = await ccgWaitForUrl(`${CCG_EDIT_SITE_ORIGIN}${assetPath}`, 36, 5000);
        ccgEditStep('live', live ? 'ok' : 'running', live ? 'Live' : 'Deploy pending');
        ccgEditLog(live ? `Asset confirmed live: ${assetPath}` : `Asset is committed but deployment is still catching up: ${assetPath}`);
      }
      return;
    }

    await ccgMonitorEditWorkflow(config, result.commitSha, entry.slug);
  } catch (error) {
    ccgEditStep('source', 'error', 'Update failed');
    ccgEditLog(`Game update failed: ${error.message}`, true);
  } finally {
    ccgEditButton(button, false, 'Update Game');
  }
}

function ccgBuildEditedGame(original) {
  const developer = ccgGameValue('developer');
  const entry = {
    ...original,
    system: ccgGameValue('system').toUpperCase(),
    id: ccgGameValue('id'),
    slug: ccgGameValue('slug'),
    title: ccgGameValue('title'),
    sorttitle: original?.title === ccgGameValue('title') ? (original?.sorttitle || ccgGameValue('title')) : ccgGameValue('title'),
    year: Number(ccgGameValue('year')),
    genres: ccgChecked('[data-game-genres]'),
    collections: ccgChecked('[data-game-collections]'),
    videoid: ccgYoutubeId(ccgGameValue('videoId')),
    thumbnail: ccgGameValue('thumbnail'),
    pdf: ccgGameValue('pdf'),
    disk: ccgLines(ccgGameValue('disk')),
    download_status: ccgGameValue('downloadStatus'),
    description: ccgGameValue('description'),
    ccg_rating: Number(ccgGameValue('ccg_rating')),
    ccg_rating_reason: ccgGameValue('ccg_rating_reason'),
    credits: {
      ...(original?.credits || {}),
      publisher: ccgList(ccgGameValue('publisher')),
      producer: ccgGameValue('producer'),
      coder: ccgList(ccgGameValue('coder')),
      graphics: ccgList(ccgGameValue('graphics')),
      musician: ccgList(ccgGameValue('musician')),
      re_releaser: ccgList(ccgGameValue('reReleaser')),
      developer
    },
    developer
  };

  if (document.querySelector('[data-game-field="lemonUrl"]')) entry.lemon = ccgGameValue('lemonUrl') ? [ccgGameValue('lemonUrl')] : [];
  if (document.querySelector('[data-game-field="zzapUrl"]')) entry.zzap = ccgGameValue('zzapUrl') ? [ccgGameValue('zzapUrl')] : [];
  return entry;
}

function ccgValidateEditedGame(entry, games, index) {
  const errors = [];
  if (!entry.title) errors.push('Title is required.');
  if (!['C64', 'AMIGA'].includes(entry.system)) errors.push('System must be C64 or AMIGA.');
  if (!Number.isInteger(entry.year) || entry.year < 1970 || entry.year > 2100) errors.push('Year must be between 1970 and 2100.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) errors.push('Slug must be lowercase kebab-case.');
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(entry.id)) errors.push('ID must be lowercase snake_case.');
  const words = String(entry.description || '').trim().split(/\s+/).filter(Boolean).length;
  if (words < 40) errors.push(`Description must contain at least 40 words. Current count: ${words}.`);
  if (words > 165) errors.push('Description must be 165 words or fewer.');
  if (!/^[A-Za-z0-9_-]{11}$/.test(entry.videoid)) errors.push('A valid 11-character YouTube video ID is required.');
  if (!entry.thumbnail.startsWith(CCG_EDIT_THUMB_PREFIX) || !/\.(?:png|jpe?g|webp)$/i.test(entry.thumbnail)) errors.push(`Thumbnail must be inside ${CCG_EDIT_THUMB_PREFIX}`);
  if (!entry.genres.length) errors.push('Choose at least one genre.');
  if (!entry.credits.publisher.length) errors.push('Publisher is required.');
  if (!Number.isInteger(entry.ccg_rating) || entry.ccg_rating < 1 || entry.ccg_rating > 10) errors.push('CCG rating must be 1–10.');
  if (entry.pdf && !ccgHttpUrl(entry.pdf)) errors.push('PDF/manual URL is not valid.');
  entry.disk.forEach((url) => { if (!ccgHttpUrl(url)) errors.push(`Invalid download URL: ${url}`); });
  if (entry.disk.length && !['authorised', 'public-domain', 'freeware'].includes(entry.download_status)) errors.push('Select an authorised download permission before publishing download URLs.');
  const duplicate = games.find((game, i) => i !== index && (String(game?.slug || '').toLowerCase() === entry.slug.toLowerCase() || String(game?.id || '').toLowerCase() === entry.id.toLowerCase()));
  if (duplicate) errors.push(`The updated slug or ID is already used by ${duplicate.title || duplicate.slug}.`);
  const collision = games.find((game, i) => i !== index && String(game?.thumbnail || '') === entry.thumbnail);
  if (collision) errors.push(`Thumbnail path is already used by ${collision.title || collision.slug}.`);
  return errors;
}

async function ccgEditCommit(config, files, message, slugHint) {
  const branchPath = config.branch.split('/').map(encodeURIComponent).join('/');
  const ref = await ccgEditRequest(config, `/git/ref/heads/${branchPath}`);
  const headSha = ref?.object?.sha;
  const headCommit = await ccgEditRequest(config, `/git/commits/${headSha}`);
  const baseTree = headCommit?.tree?.sha;
  if (!headSha || !baseTree) throw new Error(`Could not resolve ${config.branch}.`);

  const treeEntries = [];
  for (const file of files) {
    const blob = await ccgEditRequest(config, '/git/blobs', { method: 'POST', body: file.base64 ? { content: file.base64, encoding: 'base64' } : { content: String(file.text || ''), encoding: 'utf-8' } });
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const tree = await ccgEditRequest(config, '/git/trees', { method: 'POST', body: { base_tree: baseTree, tree: treeEntries } });
  if (tree?.sha === baseTree) return { mode: 'noop', commitSha: headSha };

  const commit = await ccgEditRequest(config, '/git/commits', { method: 'POST', body: { message, tree: tree.sha, parents: [headSha] } });
  try {
    await ccgEditRequest(config, `/git/refs/heads/${branchPath}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    return { mode: 'direct', commitSha: commit.sha };
  } catch (error) {
    if (config.branch !== 'main') throw error;
    const safeSlug = ccgSlugify(slugHint).slice(0, 42) || 'game';
    const branch = `admin/update-${safeSlug}-${Date.now()}`;
    await ccgEditRequest(config, '/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: commit.sha } });
    const pr = await ccgEditRequest(config, '/pulls', { method: 'POST', body: { title: message, head: branch, base: 'main', body: 'Created by the CCG Content Publisher while editing an existing game.' } });
    return { mode: 'pr', commitSha: commit.sha, branch, prUrl: pr?.html_url || '' };
  }
}

async function ccgMonitorEditWorkflow(config, sha, slug) {
  ['metadata', 'pages', 'library', 'sitemaps', 'validation'].forEach((step) => ccgEditStep(step, 'running', 'Checking'));
  ccgEditStep('live', 'running', 'Waiting');
  try {
    const started = Date.now();
    let run = null;
    while (Date.now() - started < CCG_EDIT_TIMEOUT_MS && !run) {
      const payload = await ccgEditRequest(config, `/actions/workflows/games-publishing.yml/runs?branch=${encodeURIComponent(config.branch)}&per_page=30`);
      run = (payload?.workflow_runs || []).find((item) => item?.head_sha === sha) || null;
      if (!run) await ccgSleep(CCG_EDIT_POLL_MS);
    }
    if (!run) throw new Error(`Reliable Games Publishing was not found for source ${sha.slice(0, 8)}.`);

    while (Date.now() - started < CCG_EDIT_TIMEOUT_MS) {
      run = await ccgEditRequest(config, `/actions/runs/${run.id}`);
      if (run?.status === 'completed') break;
      await ccgSleep(CCG_EDIT_POLL_MS);
    }
    if (run?.status !== 'completed') throw new Error('Reliable Games Publishing did not finish within four minutes.');
    if (run.conclusion !== 'success') throw new Error(`Reliable Games Publishing finished with ${run.conclusion || 'an unknown result'}.`);

    ['metadata', 'pages', 'library', 'sitemaps', 'validation'].forEach((step) => ccgEditStep(step, 'ok', 'Complete'));
    const live = await ccgWaitForUrl(`${CCG_EDIT_SITE_ORIGIN}/games/${slug}/`, 8, 5000);
    ccgEditStep('live', live ? 'ok' : 'running', live ? 'Live' : 'Deploy pending');
    ccgEditLog(live ? `Live page confirmed: /games/${slug}/` : 'Publishing finished; live deployment is still catching up.');
  } catch (error) {
    ccgEditLog(`Publication check failed: ${error.message} The source update is saved; use Publication recovery instead of resubmitting.`, true);
  }
}

async function ccgUploadMusic(slug, file) {
  const client = await window.ccgSupabase?.getClient?.();
  const { data, error } = await client?.auth?.getSession?.() || {};
  const token = data?.session?.access_token;
  if (error || !token) throw new Error('Admin session expired before music upload.');
  const body = new FormData();
  body.set('slug', slug);
  body.set('file', file, `${ccgSlugify(slug)}.mp3`);
  const response = await fetch(CCG_EDIT_MUSIC_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `Music upload failed (${response.status}).`);
  return payload;
}

function ccgValidateMusic(file) {
  if (!file) return '';
  if (file.type !== 'audio/mpeg' || !/\.mp3$/i.test(file.name || '')) return 'Game music must be an MP3 file.';
  if (!file.size || file.size > CCG_EDIT_MAX_MUSIC) return 'Game music must be between 1 byte and 25 MiB.';
  return '';
}

function ccgEditGithubConfig() {
  const config = {
    owner: String(document.querySelector('[data-github-owner]')?.value || DEFAULT_OWNER).trim() || DEFAULT_OWNER,
    repo: String(document.querySelector('[data-github-repo]')?.value || DEFAULT_REPO).trim() || DEFAULT_REPO,
    branch: String(document.querySelector('[data-github-branch]')?.value || DEFAULT_BRANCH).trim() || DEFAULT_BRANCH,
    token: String(document.querySelector('[data-github-token]')?.value || '').trim()
  };
  if (!config.token) throw new Error('Open “GitHub publishing connection” and enter the repository token first.');
  return config;
}

async function ccgEditFetchJsonFile(config, path) {
  const payload = await ccgEditRequest(config, `/contents/${ccgEncodePath(path)}?ref=${encodeURIComponent(config.branch)}`);
  if (!payload?.content) throw new Error(`GitHub did not return ${path}.`);
  return { data: JSON.parse(ccgDecode(payload.content)), sha: payload.sha };
}

async function ccgEditFileExists(config, path) {
  try { await ccgEditRequest(config, `/contents/${ccgEncodePath(path)}?ref=${encodeURIComponent(config.branch)}`); return true; }
  catch (error) { if (error.status === 404) return false; throw error; }
}

async function ccgEditRequest(config, endpoint, options = {}) {
  const method = options.method || 'GET';
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`GitHub ${method} ${endpoint} returned ${response.status}: ${detail.slice(0, 180)}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function ccgSaveEditJob(entry, sha, branch) {
  try { localStorage.setItem(CCG_EDIT_STORAGE_KEY, JSON.stringify({ title: entry.title, slug: entry.slug, videoId: entry.videoid, sourceSha: sha, branch, status: 'pending', updatedAt: new Date().toISOString() })); }
  catch (_error) { /* optional recovery state */ }
}

async function ccgWaitForUrl(url, attempts, delay) {
  for (let i = 0; i < attempts; i += 1) {
    try { if ((await fetch(`${url}${url.includes('?') ? '&' : '?'}publisher_check=${Date.now()}`, { cache: 'no-store' })).ok) return true; }
    catch (_error) { /* deployment may still be catching up */ }
    await ccgSleep(delay);
  }
  return false;
}

function ccgEditNotNeeded() { ['metadata', 'pages', 'library', 'sitemaps', 'validation'].forEach((step) => ccgEditStep(step, 'ok', 'Not needed')); }
function ccgGameValue(name) { return String(document.querySelector(`[data-game-field="${name}"]`)?.value || '').trim(); }
function ccgChecked(selector) { return Array.from(document.querySelectorAll(`${selector} input:checked`)).map((input) => input.value); }
function ccgLines(value) { return String(value || '').split(/\r?\n/).map((v) => v.trim()).filter(Boolean); }
function ccgList(value) { return String(value || '').split(/[\n,]/).map((v) => v.trim()).filter(Boolean); }
function ccgYoutubeId(value) { const raw = String(value || '').trim().replace(/[?&].*$/, ''); return /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : ''; }
function ccgSlugify(value) { return String(value || '').trim().toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function ccgCompareGames(a, b) { return String(a?.sorttitle || a?.title || a?.slug || '').toLowerCase().localeCompare(String(b?.sorttitle || b?.title || b?.slug || '').toLowerCase(), 'en', { numeric: true, sensitivity: 'base' }); }
function ccgHttpUrl(value) { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch (_error) { return false; } }
function ccgDecode(value) { const binary = atob(String(value || '').replace(/\s+/g, '')); return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))); }
function ccgEncodePath(path) { return String(path || '').split('/').map(encodeURIComponent).join('/'); }
function ccgSleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function ccgFileBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const value = String(reader.result || ''); resolve(value.includes(',') ? value.split(',')[1] : value); }; reader.onerror = () => reject(new Error(`Could not read ${file.name}.`)); reader.readAsDataURL(file); }); }
function ccgEditButton(button, busy, label) { if (button) { button.disabled = busy; button.textContent = label; } }
function ccgEditResetPipeline() { document.querySelectorAll('[data-pipeline-step]').forEach((node) => { node.classList.remove('is-running', 'is-ok', 'is-error'); const status = node.querySelector('b'); if (status) status.textContent = 'Waiting'; }); }
function ccgEditStep(step, state, text) { const node = document.querySelector(`[data-pipeline-step="${step}"]`); if (!node) return; node.classList.remove('is-running', 'is-ok', 'is-error'); if (state === 'running') node.classList.add('is-running'); if (state === 'ok') node.classList.add('is-ok'); if (state === 'error') node.classList.add('is-error'); const status = node.querySelector('b'); if (status) status.textContent = text; }
function ccgEditValidation(errors) { const node = document.querySelector('[data-game-validation]'); if (!node) return; node.hidden = false; node.classList.toggle('is-ok', !errors.length); node.innerHTML = errors.length ? `<strong>Fix these items before publishing:</strong><ul>${errors.map((error) => `<li>${ccgEscape(error)}</li>`).join('')}</ul>` : '<strong>Validation passed.</strong>'; }
function ccgEscape(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function ccgEditLog(message, isError = false) { const node = document.querySelector('[data-publisher-log]'); if (!node) return; const current = node.textContent === 'No publishing job has been started in this session.' ? '' : node.textContent; const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); node.textContent = `${current}${current ? '\n' : ''}[${time}] ${isError ? 'ERROR: ' : ''}${message}`; node.scrollTop = node.scrollHeight; }
