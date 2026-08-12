const DEFAULT_OWNER = 'joepentony-dot';
const DEFAULT_REPO = 'ccgamer_website_new';
const log = document.querySelector('[data-publisher-log]');

if (log && typeof MutationObserver === 'function') {
  installPublishingStatusReconciler(log);
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
  const branch = String(document.querySelector('[data-github-branch]')?.value || 'main').trim() || 'main';
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
  const jobs = Array.isArray(jobsPayload?.jobs) ? jobsPayload.jobs : [];
  const steps = jobs.flatMap((job) => Array.isArray(job?.steps) ? job.steps : []);
  const metadataStep = steps.find((step) => step?.name === 'Sync verified YouTube metadata');
  const publishStep = steps.find((step) => step?.name === 'Run authoritative publishing command');

  applyWorkflowStepResult('metadata', metadataStep, 'Synced', 'Sync failed');

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
