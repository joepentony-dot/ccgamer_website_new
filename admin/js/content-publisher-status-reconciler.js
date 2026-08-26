const DEFAULT_OWNER = 'joepentony-dot';
const DEFAULT_REPO = 'ccgamer_website_new';
const DEFAULT_BRANCH = 'main';
const SITE_ORIGIN = 'https://www.cheekycommodoregamer.co.uk';
const SOURCE_PATH = 'games/games.json';
const THUMBNAIL_PREFIX = 'resources/images/thumbnails/all/';
const STORAGE_KEY = 'ccg_publisher_last_game_publication_v2';
const SOURCE_MIN_WORDS = 40;
const WORKFLOW_POLL_MS = 6000;
const WORKFLOW_TIMEOUT_MS = 240000;

const log = document.querySelector('[data-publisher-log]');
const gameForm = document.querySelector('[data-game-form]');
const recoveryState = {
  games: [],
  mode: 'create',
  originalGame: null,
  originalLemonValue: '',
  originalZzapValue: '',
  monitorBusy: false,
};

if (log && typeof MutationObserver === 'function') {
  installPublishingStatusReconciler(log);
  installPublicationPersistence(log);
}

if (gameForm) {
  installGameEditControls(gameForm);
  installGameSubmitGuard(gameForm);
  installRecoveryControls();
  void refreshEditableGames();
  restoreStoredPublication();
}

function installPublishingStatusReconciler(logNode) {
  let inFlight = false;
  let lastReconciledSha = '';

  const reconcile = async () => {
    if (inFlight) return;

    const text = String(logNode.textContent || '');
    const failureIndex = text.lastIndexOf('Automated publishing check failed: Reliable Games Publishing finished with failure.');
    if (failureIndex < 0) return;

    const sourceMatches = [...text.matchAll(/Source commit created:\s*([0-9a-f]{40})/gi)];
    const sourceSha = sourceMatches.at(-1)?.[1] || '';
    const latestStartIndex = Math.max(
      text.lastIndexOf('Preparing new game:'),
      text.lastIndexOf('Preparing game update:'),
      text.lastIndexOf('Preparing new feature:'),
      text.lastIndexOf('Preparing Zzap!64 awards year:')
    );

    if (!sourceSha || failureIndex < latestStartIndex || sourceSha === lastReconciledSha) return;

    lastReconciledSha = sourceSha;
    inFlight = true;

    try {
      await reconcileReliableGamesWorkflow(sourceSha);
    } catch (_error) {
      setPublisherPipelineStep('metadata', 'running', 'Not confirmed');
      setPublisherPipelineStep('pages', 'error', 'Workflow failed');
      setLaterStagesNotConfirmed();
    } finally {
      inFlight = false;
    }
  };

  const observer = new MutationObserver(() => { void reconcile(); });
  observer.observe(logNode, { childList: true, subtree: true, characterData: true });
  void reconcile();
}

async function reconcileReliableGamesWorkflow(sourceSha) {
  const owner = String(document.querySelector('[data-github-owner]')?.value || DEFAULT_OWNER).trim() || DEFAULT_OWNER;
  const repo = String(document.querySelector('[data-github-repo]')?.value || DEFAULT_REPO).trim() || DEFAULT_REPO;
  const branch = currentBranch();
  const repositoryUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const runsResponse = await fetch(`${repositoryUrl}/actions/workflows/games-publishing.yml/runs?branch=${encodeURIComponent(branch)}&per_page=20`, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store'
  });
  if (!runsResponse.ok) throw new Error(`Workflow lookup returned HTTP ${runsResponse.status}.`);

  const runsPayload = await runsResponse.json();
  const run = (Array.isArray(runsPayload?.workflow_runs) ? runsPayload.workflow_runs : [])
    .find((item) => item?.head_sha === sourceSha);
  if (!run?.id) throw new Error('Matching Reliable Games Publishing run was not found.');

  const jobsResponse = await fetch(`${repositoryUrl}/actions/runs/${run.id}/jobs`, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store'
  });
  if (!jobsResponse.ok) throw new Error(`Workflow jobs lookup returned HTTP ${jobsResponse.status}.`);

  const jobsPayload = await jobsResponse.json();
  const steps = (Array.isArray(jobsPayload?.jobs) ? jobsPayload.jobs : [])
    .flatMap((job) => Array.isArray(job?.steps) ? job.steps : []);
  const metadataStep = steps.find((step) => step?.name === 'Sync verified YouTube metadata');
  const publishStep = steps.find((step) => step?.name === 'Run authoritative publishing command');

  applyWorkflowStepResult('metadata', metadataStep, 'Sync complete', 'Sync failed');

  if (publishStep?.conclusion === 'failure') {
    setPublisherPipelineStep('pages', 'error', 'Build failed');
    setLaterStagesNotConfirmed();
    return;
  }

  if (publishStep?.conclusion === 'success') {
    setPublisherPipelineStep('pages', 'ok', 'Generated');
    setPublisherPipelineStep('library', 'ok', 'Updated');
    setPublisherPipelineStep('sitemaps', 'ok', 'Updated');
    setPublisherPipelineStep('validation', 'ok', 'Passed');
    return;
  }

  setPublisherPipelineStep('pages', 'running', 'Not confirmed');
  setLaterStagesNotConfirmed();
}

function applyWorkflowStepResult(stepName, workflowStep, successText, failureText) {
  if (workflowStep?.conclusion === 'success') {
    setPublisherPipelineStep(stepName, 'ok', successText);
    return;
  }
  if (workflowStep?.conclusion === 'failure') {
    setPublisherPipelineStep(stepName, 'error', failureText);
    return;
  }
  setPublisherPipelineStep(stepName, 'running', 'Not confirmed');
}

function setLaterStagesNotConfirmed() {
  ['library', 'sitemaps', 'validation'].forEach((step) => {
    setPublisherPipelineStep(step, 'running', 'Not confirmed');
  });
}

function installGameEditControls(form) {
  if (document.querySelector('[data-game-edit-controls]')) return;

  const card = document.createElement('div');
  card.className = 'publisher-card publisher-card--subtle';
  card.dataset.gameEditControls = 'true';
  card.innerHTML = `
    <h3>Add or edit a game</h3>
    <p data-game-edit-message>Add a new record, or reopen an existing games.json record and update it without creating a duplicate.</p>
    <div class="publisher-grid publisher-grid--2">
      <label>Game action
        <select data-game-edit-mode>
          <option value="create">Add a new game</option>
          <option value="edit">Edit an existing game</option>
        </select>
      </label>
      <label data-game-edit-search-wrap hidden>Find existing game
        <input type="search" data-game-edit-search placeholder="Type a title or slug" autocomplete="off" />
      </label>
      <label data-game-edit-select-wrap hidden>Existing game
        <select data-game-edit-select><option value="">Select a game…</option></select>
      </label>
    </div>`;
  form.insertAdjacentElement('beforebegin', card);

  const mode = card.querySelector('[data-game-edit-mode]');
  mode?.addEventListener('change', () => setGameMode(mode.value));
  card.querySelector('[data-game-edit-search]')?.addEventListener('input', (event) => renderGameOptions(event.currentTarget.value));
  card.querySelector('[data-game-edit-select]')?.addEventListener('change', (event) => {
    const game = recoveryState.games.find((item) => String(item?.slug || '') === String(event.currentTarget.value || ''));
    if (game) loadExistingGame(game);
  });
  document.querySelector('[data-action="reset-game"]')?.addEventListener('click', () => {
    if (mode) mode.value = 'create';
    setGameMode('create');
  });
}

function installGameSubmitGuard(form) {
  form.addEventListener('submit', (event) => {
    if (recoveryState.mode === 'edit') {
      event.preventDefault();
      event.stopImmediatePropagation();
      void updateExistingGame();
      return;
    }

    const words = wordCount(gameValue('description'));
    if (words < SOURCE_MIN_WORDS) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderGameValidation([
        `Description must contain at least ${SOURCE_MIN_WORDS} words so publishing can continue if YouTube metadata is temporarily unavailable. Current count: ${words}.`
      ]);
      return;
    }

    const videoId = normalizeYoutubeId(gameValue('videoId'));
    const currentStatus = String(document.querySelector('[data-video-status="game"]')?.textContent || '');
    if (videoId && !currentStatus.includes('Verified YouTube metadata')) {
      setRecoveryMessage(`YouTube ID ${videoId} is not currently verified. The source description is long enough to provide the archive fallback, so the game can still be published safely.`, false);
    }
  }, { capture: true });
}

function installRecoveryControls() {
  const pipeline = document.querySelector('[data-panel="status"] [data-pipeline]');
  if (!pipeline || document.querySelector('[data-publisher-recovery]')) return;

  const card = document.createElement('div');
  card.className = 'publisher-card publisher-card--subtle';
  card.dataset.publisherRecovery = 'true';
  card.innerHTML = `
    <h3>Publication recovery</h3>
    <p data-publisher-recovery-message>No recent game publication is stored in this browser.</p>
    <div class="publisher-header-actions">
      <button class="ccg-btn ccg-btn--secondary" type="button" data-action="resume-game-publication">Resume last publication</button>
      <button class="ccg-btn ccg-btn--secondary" type="button" data-action="retry-games-publishing">Retry game publishing on current main</button>
    </div>
    <small>Retry rebuilds the existing games.json source. It does not add the game again.</small>`;
  pipeline.insertAdjacentElement('beforebegin', card);

  card.querySelector('[data-action="resume-game-publication"]')?.addEventListener('click', () => void resumeStoredPublication());
  card.querySelector('[data-action="retry-games-publishing"]')?.addEventListener('click', () => void retryCurrentGamesPublishing());
}

function installPublicationPersistence(logNode) {
  const reconcile = () => {
    const text = String(logNode.textContent || '');
    const starts = [...text.matchAll(/Preparing new game:\s*(.+?)\s*\(([^)]+)\)/g)];
    const sourceMatches = [...text.matchAll(/Source commit created:\s*([0-9a-f]{40})/gi)];
    const latestStart = starts.at(-1);
    const sourceSha = sourceMatches.at(-1)?.[1] || '';

    if (latestStart && sourceSha) {
      const current = readStoredJob();
      if (!current || current.sourceSha !== sourceSha) {
        saveStoredJob({
          title: latestStart[1],
          slug: latestStart[2],
          videoId: normalizeYoutubeId(gameValue('videoId')),
          sourceSha,
          branch: currentBranch(),
          status: 'pending',
          updatedAt: new Date().toISOString()
        });
      }
    }

    if (/Automated publishing check failed:/i.test(text)) updateStoredJob({ status: 'failed', updatedAt: new Date().toISOString() });
    if (/Live page confirmed:/i.test(text)) updateStoredJob({ status: 'live', updatedAt: new Date().toISOString() });
    if (/YouTube did not provide verified metadata for\s+[A-Za-z0-9_-]{11}/i.test(text)) {
      setPublisherPipelineStep('metadata', 'running', 'Unavailable / withheld');
    }
    updateRecoveryCard();
  };

  const observer = new MutationObserver(reconcile);
  observer.observe(logNode, { childList: true, subtree: true, characterData: true });
  reconcile();
}

async function refreshEditableGames() {
  try {
    const response = await fetch(`/games/games.json?publisher_edit=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    recoveryState.games = Array.isArray(payload) ? payload : [];
    renderGameOptions('');
  } catch (error) {
    setEditMessage(`Existing games could not be loaded: ${error.message}`);
  }
}

function setGameMode(value) {
  recoveryState.mode = value === 'edit' ? 'edit' : 'create';
  const editing = recoveryState.mode === 'edit';
  document.querySelector('[data-game-edit-search-wrap]')?.toggleAttribute('hidden', !editing);
  document.querySelector('[data-game-edit-select-wrap]')?.toggleAttribute('hidden', !editing);
  const button = document.querySelector('[data-publish-game]');
  if (button) button.textContent = editing ? 'Update Game' : 'Publish Game';
  if (!editing) {
    recoveryState.originalGame = null;
    setEditMessage('Add a new record, or choose “Edit an existing game” to reopen a saved games.json record.');
  } else {
    setEditMessage('Choose a saved game. Updating replaces that source record and runs the publishing chain without creating a duplicate.');
  }
}

function renderGameOptions(filterValue) {
  const select = document.querySelector('[data-game-edit-select]');
  if (!select) return;
  const filter = String(filterValue || '').trim().toLowerCase();
  const selected = select.value;
  const games = recoveryState.games
    .filter((game) => !filter || [game?.title, game?.slug, game?.id, game?.system].some((value) => String(value || '').toLowerCase().includes(filter)))
    .sort((a, b) => String(a?.title || '').localeCompare(String(b?.title || ''), 'en-GB', { numeric: true }));
  select.innerHTML = '<option value="">Select a game…</option>';
  games.forEach((game) => {
    const option = document.createElement('option');
    option.value = String(game?.slug || '');
    option.textContent = `${game?.title || game?.slug} · ${game?.system || ''} · ${game?.year || ''}`;
    select.appendChild(option);
  });
  if (games.some((game) => game?.slug === selected)) select.value = selected;
}

function loadExistingGame(game) {
  recoveryState.originalGame = clone(game);
  recoveryState.originalLemonValue = Array.isArray(game?.lemon) ? String(game.lemon[0] || '') : '';
  recoveryState.originalZzapValue = Array.isArray(game?.zzap) ? String(game.zzap[0] || '') : '';

  const values = {
    title: game?.title,
    system: game?.system,
    year: game?.year,
    ccg_rating: game?.ccg_rating ?? 6,
    slug: game?.slug,
    id: game?.id,
    description: game?.description,
    videoId: game?.videoid || game?.videoId,
    youtubeUrl: (game?.videoid || game?.videoId) ? `https://www.youtube.com/watch?v=${game.videoid || game.videoId}` : '',
    thumbnail: game?.thumbnail,
    pdf: game?.pdf,
    lemonUrl: recoveryState.originalLemonValue,
    zzapUrl: recoveryState.originalZzapValue,
    downloadStatus: game?.download_status,
    disk: Array.isArray(game?.disk) ? game.disk.join('\n') : '',
    publisher: Array.isArray(game?.credits?.publisher) ? game.credits.publisher.join(', ') : '',
    developer: game?.developer || game?.credits?.developer,
    coder: Array.isArray(game?.credits?.coder) ? game.credits.coder.join(', ') : '',
    graphics: Array.isArray(game?.credits?.graphics) ? game.credits.graphics.join(', ') : '',
    musician: Array.isArray(game?.credits?.musician) ? game.credits.musician.join(', ') : '',
    producer: game?.credits?.producer,
    reReleaser: Array.isArray(game?.credits?.re_releaser) ? game.credits.re_releaser.join(', ') : '',
    ccg_rating_reason: game?.ccg_rating_reason
  };
  Object.entries(values).forEach(([name, value]) => setGameValue(name, value ?? ''));
  applyChipSelections('[data-game-genres]', game?.genres || []);
  applyChipSelections('[data-game-collections]', game?.collections || []);
  document.querySelector('[data-game-field="slug"]')?.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('[data-game-field="videoId"]')?.dispatchEvent(new Event('input', { bubbles: true }));
  setEditMessage(`Editing ${game?.title || game?.slug}. Save with “Update Game”.`);
  renderGameValidation([]);
}

function applyChipSelections(selector, values) {
  const wanted = new Set((Array.isArray(values) ? values : []).map(String));
  let attempt = 0;
  const apply = () => {
    const inputs = Array.from(document.querySelectorAll(`${selector} input[type="checkbox"]`));
    if (!inputs.length && attempt < 20) {
      attempt += 1;
      setTimeout(apply, 150);
      return;
    }
    inputs.forEach((input) => { input.checked = wanted.has(input.value); });
  };
  apply();
}

async function updateExistingGame() {
  const original = recoveryState.originalGame;
  if (!original) {
    renderGameValidation(['Choose an existing game before updating.']);
    return;
  }

  const entry = buildEditedEntry(original);
  const errors = validateEditedEntry(entry);
  renderGameValidation(errors);
  if (errors.length) return;

  let config;
  try {
    config = getGithubConfig();
  } catch (error) {
    renderGameValidation([error.message]);
    return;
  }

  const button = document.querySelector('[data-publish-game]');
  setButtonBusy(button, true, 'Updating…');
  resetPipeline();
  setPublisherPipelineStep('source', 'running', 'Updating');
  activateStatusTab();
  writePublisherLog(`Preparing game update: ${entry.title} (${entry.slug})`);

  try {
    const source = await fetchGithubJsonFile(config, SOURCE_PATH);
    const index = source.data.findIndex((game) => String(game?.slug || '').toLowerCase() === String(original?.slug || '').toLowerCase()
      || String(game?.id || '').toLowerCase() === String(original?.id || '').toLowerCase());
    if (index < 0) throw new Error('The original game is no longer present in the current GitHub games.json. Refresh and select it again.');

    const duplicate = source.data.find((game, gameIndex) => gameIndex !== index && (
      String(game?.slug || '').toLowerCase() === entry.slug.toLowerCase()
      || String(game?.id || '').toLowerCase() === entry.id.toLowerCase()
    ));
    if (duplicate) throw new Error(`The updated slug or ID is already used by ${duplicate.title || duplicate.slug}.`);

    const collision = source.data.find((game, gameIndex) => gameIndex !== index && String(game?.thumbnail || '') === entry.thumbnail);
    if (collision) throw new Error(`Thumbnail path is already used by ${collision.title || collision.slug}.`);

    const nextGames = source.data.slice();
    nextGames[index] = entry;
    nextGames.sort(compareGames);
    const files = [{ path: SOURCE_PATH, text: `${JSON.stringify(nextGames, null, 2)}\n` }];
    const thumbnailFile = document.querySelector('[data-game-thumbnail-file]')?.files?.[0] || null;
    if (thumbnailFile) {
      files.push({ path: entry.thumbnail, base64: await fileToBase64(thumbnailFile) });
    } else if (entry.thumbnail !== original.thumbnail && !(await githubFileExists(config, entry.thumbnail))) {
      throw new Error(`Thumbnail does not exist in GitHub at ${entry.thumbnail}. Select the image file or restore the previous path.`);
    }

    const result = await commitFiles(config, files, `Update ${entry.title} via CCG Content Publisher`, entry.slug);
    setPublisherPipelineStep('source', 'ok', result.mode === 'direct' ? 'Updated' : 'PR opened');
    writePublisherLog(result.mode === 'direct' ? `Source commit created: ${result.commitSha}` : `Pull request created: ${result.prUrl}`);
    saveStoredJob({
      title: entry.title,
      slug: entry.slug,
      videoId: entry.videoid,
      sourceSha: result.commitSha,
      branch: config.branch,
      status: result.mode === 'direct' ? 'pending' : 'pr',
      updatedAt: new Date().toISOString()
    });

    recoveryState.originalGame = clone(entry);
    if (result.mode === 'pr') {
      ['metadata', 'pages', 'library', 'sitemaps', 'validation', 'live'].forEach((step) => setPublisherPipelineStep(step, 'running', 'Merge PR first'));
      return;
    }
    await monitorPublication(config, readStoredJob());
  } catch (error) {
    setPublisherPipelineStep('source', 'error', 'Update failed');
    writePublisherLog(`Game update failed: ${error.message}`, true);
  } finally {
    setButtonBusy(button, false, 'Update Game');
  }
}

function buildEditedEntry(original) {
  const developer = gameValue('developer');
  const lemonValue = gameValue('lemonUrl');
  const zzapValue = gameValue('zzapUrl');
  return {
    ...original,
    system: gameValue('system').toUpperCase(),
    id: gameValue('id'),
    slug: gameValue('slug'),
    title: gameValue('title'),
    sorttitle: original?.title === gameValue('title') ? (original?.sorttitle || gameValue('title')) : gameValue('title'),
    year: Number(gameValue('year')),
    genres: checkedValues('[data-game-genres]'),
    collections: checkedValues('[data-game-collections]'),
    videoid: normalizeYoutubeId(gameValue('videoId')),
    thumbnail: gameValue('thumbnail'),
    pdf: gameValue('pdf'),
    disk: parseLines(gameValue('disk')),
    download_status: gameValue('downloadStatus'),
    lemon: lemonValue === recoveryState.originalLemonValue ? (original?.lemon || []) : (lemonValue ? [lemonValue] : []),
    zzap: zzapValue === recoveryState.originalZzapValue ? (original?.zzap || []) : (zzapValue ? [zzapValue] : []),
    description: gameValue('description'),
    ccg_rating: Number(gameValue('ccg_rating')),
    ccg_rating_reason: gameValue('ccg_rating_reason'),
    credits: {
      ...(original?.credits || {}),
      publisher: parseCommaList(gameValue('publisher')),
      producer: gameValue('producer'),
      coder: parseCommaList(gameValue('coder')),
      graphics: parseCommaList(gameValue('graphics')),
      musician: parseCommaList(gameValue('musician')),
      re_releaser: parseCommaList(gameValue('reReleaser')),
      developer
    },
    developer
  };
}

function validateEditedEntry(entry) {
  const errors = [];
  if (!entry.title) errors.push('Title is required.');
  if (!['C64', 'AMIGA'].includes(entry.system)) errors.push('System must be C64 or AMIGA.');
  if (!Number.isInteger(entry.year) || entry.year < 1970 || entry.year > 2100) errors.push('Year must be between 1970 and 2100.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) errors.push('Slug must be lowercase kebab-case.');
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(entry.id)) errors.push('ID must be lowercase snake_case.');
  const words = wordCount(entry.description);
  if (words < SOURCE_MIN_WORDS) errors.push(`Description must contain at least ${SOURCE_MIN_WORDS} words. Current count: ${words}.`);
  if (words > 165) errors.push('Description must be 165 words or fewer for the archive fallback.');
  if (!/[.!?][”"']?$/.test(entry.description)) errors.push('Description must end at a sentence boundary.');
  if (!/^[A-Za-z0-9_-]{11}$/.test(entry.videoid)) errors.push('A valid 11-character YouTube video ID is required.');
  if (!entry.thumbnail.startsWith(THUMBNAIL_PREFIX) || !/\.(?:png|jpe?g|webp)$/i.test(entry.thumbnail)) errors.push(`Thumbnail must be an image inside ${THUMBNAIL_PREFIX}`);
  if (!entry.genres.length) errors.push('Choose at least one genre.');
  if (!entry.credits.publisher.length) errors.push('Publisher is required.');
  if (!Number.isInteger(entry.ccg_rating) || entry.ccg_rating < 1 || entry.ccg_rating > 10) errors.push('CCG rating must be 1–10.');
  if (entry.pdf && !isHttpUrl(entry.pdf)) errors.push('PDF/manual URL is not valid.');
  entry.disk.forEach((url) => { if (!isHttpUrl(url)) errors.push(`Invalid disk/download URL: ${url}`); });
  if (entry.disk.length && !['authorised', 'public-domain', 'freeware'].includes(entry.download_status)) errors.push('Select an authorised download permission before publishing download URLs.');
  return errors;
}

async function resumeStoredPublication() {
  const job = readStoredJob();
  if (!job?.sourceSha) {
    setRecoveryMessage('No stored source commit is available. Use “Retry game publishing on current main” for an older stranded record.', true);
    return;
  }
  try {
    const config = getGithubConfig();
    activateStatusTab();
    setPublisherPipelineStep('source', 'ok', 'Source saved');
    await monitorPublication(config, job);
  } catch (error) {
    setRecoveryMessage(error.message, true);
  }
}

async function retryCurrentGamesPublishing() {
  if (recoveryState.monitorBusy) return;
  const button = document.querySelector('[data-action="retry-games-publishing"]');
  try {
    const config = getGithubConfig();
    setButtonBusy(button, true, 'Starting retry…');
    activateStatusTab();
    resetPipeline();
    setPublisherPipelineStep('source', 'ok', 'Already saved');
    ['metadata', 'pages', 'library', 'sitemaps', 'validation'].forEach((step) => setPublisherPipelineStep(step, 'running', 'Retry queued'));
    setPublisherPipelineStep('live', 'running', 'Waiting');
    const startedAt = Date.now();
    await githubRequest(config, '/actions/workflows/games-publishing.yml/dispatches', { method: 'POST', body: { ref: config.branch } });
    writePublisherLog('Manual Reliable Games Publishing retry requested. Existing games.json will be rebuilt without adding another game record.');
    const run = await waitForDispatchedRun(config, startedAt);
    await monitorWorkflowRun(config, run.id, readStoredJob());
  } catch (error) {
    writePublisherLog(`Manual publishing retry failed: ${error.message}`, true);
    setRecoveryMessage(`Retry failed: ${error.message}`, true);
  } finally {
    setButtonBusy(button, false, 'Retry game publishing on current main');
  }
}

async function monitorPublication(config, job) {
  if (recoveryState.monitorBusy || !job?.sourceSha) return;
  recoveryState.monitorBusy = true;
  try {
    ['metadata', 'pages', 'library', 'sitemaps', 'validation'].forEach((step) => setPublisherPipelineStep(step, 'running', 'Checking'));
    setPublisherPipelineStep('live', 'running', 'Waiting');
    const run = await waitForWorkflowBySha(config, job.sourceSha);
    await monitorWorkflowRun(config, run.id, job);
  } catch (error) {
    updateStoredJob({ status: 'failed', updatedAt: new Date().toISOString() });
    setRecoveryMessage(`Publication check failed: ${error.message}`, true);
  } finally {
    recoveryState.monitorBusy = false;
    updateRecoveryCard();
  }
}

async function monitorWorkflowRun(config, runId, job) {
  const run = await waitForRunCompletion(config, runId);
  const payload = await githubRequest(config, `/actions/runs/${runId}/jobs?per_page=100`);
  const steps = (payload?.jobs || []).flatMap((item) => item?.steps || []);
  const metadata = steps.find((step) => step?.name === 'Sync verified YouTube metadata');
  const publish = steps.find((step) => step?.name === 'Run authoritative publishing command');
  const canonical = steps.find((step) => step?.name === 'Confirm generated public HTML is canonical');
  const diff = steps.find((step) => step?.name === 'Verify generated publishing diff');
  const protectedFiles = steps.find((step) => step?.name === 'Confirm protected files are unchanged');

  if (metadata?.conclusion === 'success') {
    const verified = job?.videoId ? await fetchVerifiedVideo(job.videoId) : null;
    setPublisherPipelineStep('metadata', verified ? 'ok' : 'running', verified ? 'Verified' : 'Sync complete · video unverified');
  } else {
    applyWorkflowStepResult('metadata', metadata, 'Sync complete', 'Sync failed');
  }

  if (publish?.conclusion === 'failure') {
    setPublisherPipelineStep('pages', 'error', 'Build failed');
    setLaterStagesNotConfirmed();
    setPublisherPipelineStep('live', 'running', 'Source saved');
    updateStoredJob({ status: 'failed', runId, updatedAt: new Date().toISOString() });
    setRecoveryMessage('Source is saved, but the build failed. Fix the build issue and use Retry; do not add the game again.', true);
    return;
  }

  if (publish?.conclusion === 'success') {
    setPublisherPipelineStep('pages', 'ok', 'Generated');
    setPublisherPipelineStep('library', 'ok', 'Updated');
    setPublisherPipelineStep('sitemaps', 'ok', 'Updated');
  }

  const validationPassed = [canonical, diff, protectedFiles].every((step) => step?.conclusion === 'success');
  setPublisherPipelineStep('validation', validationPassed ? 'ok' : 'running', validationPassed ? 'Passed' : 'Not confirmed');

  if (run.conclusion !== 'success') {
    updateStoredJob({ status: 'failed', runId, updatedAt: new Date().toISOString() });
    setRecoveryMessage(`Reliable Games Publishing finished with ${run.conclusion || 'an unknown result'}.`, true);
    return;
  }

  updateStoredJob({ status: 'published', runId, updatedAt: new Date().toISOString() });
  if (job?.slug) {
    const live = await waitForLiveUrl(`${SITE_ORIGIN}/games/${job.slug}/`);
    setPublisherPipelineStep('live', live ? 'ok' : 'running', live ? 'Live' : 'Deploy pending');
    if (live) updateStoredJob({ status: 'live', updatedAt: new Date().toISOString() });
  } else {
    setPublisherPipelineStep('live', 'running', 'Check live site');
  }
  setRecoveryMessage('Publishing rebuild completed from the existing source record.', false);
}

async function waitForWorkflowBySha(config, sourceSha) {
  const started = Date.now();
  while (Date.now() - started < WORKFLOW_TIMEOUT_MS) {
    const payload = await githubRequest(config, `/actions/workflows/games-publishing.yml/runs?branch=${encodeURIComponent(config.branch)}&per_page=30`);
    const run = (payload?.workflow_runs || []).find((item) => item?.head_sha === sourceSha);
    if (run) return run;
    await sleep(WORKFLOW_POLL_MS);
  }
  throw new Error(`Reliable Games Publishing was not found for source ${sourceSha.slice(0, 8)} within four minutes.`);
}

async function waitForDispatchedRun(config, startedAt) {
  const started = Date.now();
  while (Date.now() - started < WORKFLOW_TIMEOUT_MS) {
    const payload = await githubRequest(config, `/actions/workflows/games-publishing.yml/runs?branch=${encodeURIComponent(config.branch)}&event=workflow_dispatch&per_page=20`);
    const run = (payload?.workflow_runs || []).find((item) => new Date(item?.created_at || 0).getTime() >= startedAt - 5000);
    if (run) return run;
    await sleep(WORKFLOW_POLL_MS);
  }
  throw new Error('The manual Reliable Games Publishing run was not found within four minutes.');
}

async function waitForRunCompletion(config, runId) {
  const started = Date.now();
  while (Date.now() - started < WORKFLOW_TIMEOUT_MS) {
    const run = await githubRequest(config, `/actions/runs/${runId}`);
    if (run?.status === 'completed') return run;
    await sleep(WORKFLOW_POLL_MS);
  }
  throw new Error('Reliable Games Publishing did not finish within four minutes.');
}

async function fetchVerifiedVideo(videoId) {
  try {
    const response = await fetch(`/data/video-metadata.json?publisher_recovery=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json())?.videos?.[videoId] || null;
  } catch (_error) {
    return null;
  }
}

async function waitForLiveUrl(url) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch(`${url}?publisher_recovery=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) return true;
    } catch (_error) {
      // Deployment may still be catching up.
    }
    await sleep(5000);
  }
  return false;
}

function restoreStoredPublication() {
  const job = readStoredJob();
  updateRecoveryCard();
  if (!job?.sourceSha) return;
  setPublisherPipelineStep('source', 'ok', 'Source saved');
  if (job.status === 'failed') {
    setPublisherPipelineStep('pages', 'error', 'Previous build failed');
    setLaterStagesNotConfirmed();
  }
  if (job.status === 'live') setPublisherPipelineStep('live', 'ok', 'Live');
}

function updateRecoveryCard() {
  const job = readStoredJob();
  if (!job?.sourceSha) {
    setRecoveryMessage('No recent source commit is stored in this browser. Older stranded games can still use “Retry game publishing on current main”.', false);
    return;
  }
  setRecoveryMessage(`${job.title || job.slug || 'Game'} · source ${job.sourceSha.slice(0, 8)} · ${job.status || 'pending'}. Source data is saved separately from generated site output.`, job.status === 'failed');
}

function saveStoredJob(job) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(job)); } catch (_error) { /* optional */ }
  updateRecoveryCard();
}

function updateStoredJob(patch) {
  const current = readStoredJob();
  if (current) saveStoredJob({ ...current, ...patch });
}

function readStoredJob() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function getGithubConfig() {
  const config = {
    owner: String(document.querySelector('[data-github-owner]')?.value || DEFAULT_OWNER).trim() || DEFAULT_OWNER,
    repo: String(document.querySelector('[data-github-repo]')?.value || DEFAULT_REPO).trim() || DEFAULT_REPO,
    branch: currentBranch(),
    token: String(document.querySelector('[data-github-token]')?.value || '').trim()
  };
  if (!config.token) throw new Error('Open “GitHub publishing connection” and enter the repository token first.');
  return config;
}

async function fetchGithubJsonFile(config, path) {
  const payload = await githubRequest(config, `/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`);
  if (!payload?.content) throw new Error(`GitHub did not return content for ${path}.`);
  return { data: JSON.parse(decodeBase64Utf8(payload.content)), sha: payload.sha };
}

async function githubFileExists(config, path) {
  try {
    await githubRequest(config, `/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`);
    return true;
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }
}

async function commitFiles(config, files, message, slugHint) {
  const branchPath = config.branch.split('/').map(encodeURIComponent).join('/');
  const ref = await githubRequest(config, `/git/ref/heads/${branchPath}`);
  const headSha = ref?.object?.sha;
  const headCommit = await githubRequest(config, `/git/commits/${headSha}`);
  const baseTree = headCommit?.tree?.sha;
  if (!headSha || !baseTree) throw new Error(`Could not resolve ${config.branch} for editing.`);

  const treeEntries = [];
  for (const file of files) {
    const blob = await githubRequest(config, '/git/blobs', {
      method: 'POST',
      body: file.base64 ? { content: file.base64, encoding: 'base64' } : { content: String(file.text || ''), encoding: 'utf-8' }
    });
    treeEntries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const tree = await githubRequest(config, '/git/trees', { method: 'POST', body: { base_tree: baseTree, tree: treeEntries } });
  const commit = await githubRequest(config, '/git/commits', { method: 'POST', body: { message, tree: tree.sha, parents: [headSha] } });

  try {
    await githubRequest(config, `/git/refs/heads/${branchPath}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    return { mode: 'direct', commitSha: commit.sha };
  } catch (error) {
    if (config.branch !== 'main') throw error;
    const safeSlug = String(slugHint || 'game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42) || 'game';
    const branch = `admin/update-${safeSlug}-${Date.now()}`;
    await githubRequest(config, '/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: commit.sha } });
    const pr = await githubRequest(config, '/pulls', {
      method: 'POST',
      body: { title: message, head: branch, base: 'main', body: 'Created by the CCG Content Publisher while editing an existing game. Merge after repository checks pass.' }
    });
    return { mode: 'pr', commitSha: commit.sha, branch, prUrl: pr?.html_url || '' };
  }
}

async function githubRequest(config, endpoint, options = {}) {
  const method = options.method || 'GET';
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`GitHub ${method} ${endpoint} returned ${response.status}: ${text.slice(0, 220)}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function setPublisherPipelineStep(step, state, text) {
  const node = document.querySelector(`[data-pipeline-step="${step}"]`);
  if (!node) return;
  node.classList.remove('is-running', 'is-ok', 'is-error');
  if (state === 'running') node.classList.add('is-running');
  if (state === 'ok') node.classList.add('is-ok');
  if (state === 'error') node.classList.add('is-error');
  const status = node.querySelector('b');
  if (status) status.textContent = text;
}

function resetPipeline() {
  document.querySelectorAll('[data-pipeline-step]').forEach((node) => {
    node.classList.remove('is-running', 'is-ok', 'is-error');
    const status = node.querySelector('b');
    if (status) status.textContent = 'Waiting';
  });
}

function activateStatusTab() {
  document.querySelector('[data-tab="status"]')?.click();
}

function writePublisherLog(message, isError = false) {
  const node = document.querySelector('[data-publisher-log]');
  if (!node) return;
  const current = node.textContent === 'No publishing job has been started in this session.' ? '' : node.textContent;
  const prefix = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  node.textContent = `${current}${current ? '\n' : ''}[${prefix}] ${isError ? 'ERROR: ' : ''}${message}`;
  node.scrollTop = node.scrollHeight;
}

function renderGameValidation(errors) {
  const node = document.querySelector('[data-game-validation]');
  if (!node) return;
  node.hidden = false;
  node.classList.toggle('is-ok', !errors.length);
  node.innerHTML = errors.length
    ? `<strong>Fix these items before publishing:</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`
    : '<strong>Validation passed.</strong>';
}

function setEditMessage(message) {
  const node = document.querySelector('[data-game-edit-message]');
  if (node) node.textContent = message;
}

function setRecoveryMessage(message, isError) {
  const node = document.querySelector('[data-publisher-recovery-message]');
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('is-error', Boolean(isError));
}

function setButtonBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  button.textContent = label;
}

function gameValue(name) {
  return String(document.querySelector(`[data-game-field="${name}"]`)?.value || '').trim();
}

function setGameValue(name, value) {
  const node = document.querySelector(`[data-game-field="${name}"]`);
  if (node) node.value = value ?? '';
}

function checkedValues(selector) {
  return Array.from(document.querySelectorAll(`${selector} input:checked`)).map((input) => input.value);
}

function currentBranch() {
  return String(document.querySelector('[data-github-branch]')?.value || DEFAULT_BRANCH).trim() || DEFAULT_BRANCH;
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function normalizeYoutubeId(value) {
  const raw = String(value || '').trim().replace(/[?&].*$/, '');
  return /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : '';
}

function parseLines(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function parseCommaList(value) {
  return String(value || '').split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
}

function compareGames(a, b) {
  const left = String(a?.sorttitle || a?.title || a?.slug || a?.id || '').toLowerCase();
  const right = String(b?.sorttitle || b?.title || b?.slug || b?.id || '').toLowerCase();
  return left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' });
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
}

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function decodeBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function encodePath(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
