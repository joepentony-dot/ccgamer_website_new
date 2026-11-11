// Safety gate for manual game-rebuild retries. No code here creates a game,
// modifies a catalogue, or dispatches a workflow.
const ACTIVE_WORKFLOW_STATUSES = new Set(['queued', 'requested', 'waiting', 'pending', 'in_progress']);
const SOURCE_STATES_REQUIRING_MANUAL_REPAIR = new Set(['review-blocked', 'deploy-blocked']);

export function selectSourceWorkflowRun(runs, sourceSha) {
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run?.head_sha === sourceSha)
    .sort((left, right) => Number(right.id || 0) - Number(left.id || 0))[0] || null;
}

export function decideGamePublishingRetry({
  branch = 'main',
  job = null,
  runs = [],
  sourceExists = null,
  generatedPageExists = null,
  generatedPr = null
} = {}) {
  const refuse = (reason, message) => ({ allow: false, reason, message });
  if (branch !== 'main') {
    return refuse('branch', 'Recovery only operates on the authoritative main branch.');
  }
  if (!job?.slug || !/^[0-9a-f]{40}$/i.test(String(job.sourceSha || ''))) {
    return refuse('no-source', 'Select or resume a saved game publication before retrying. No new game record will be created.');
  }
  if (sourceExists !== true) {
    return refuse('missing-source', 'The original game record could not be verified on current main. Do not start another publication.');
  }
  if (!Array.isArray(runs)) {
    return refuse('unknown-runs', 'GitHub publishing status could not be checked. Retry was not started.');
  }
  if (runs.some((run) => ACTIVE_WORKFLOW_STATUSES.has(String(run?.status || '').toLowerCase()))) {
    return refuse('active', 'Reliable Games Publishing is already running or queued. Follow the existing run rather than starting another.');
  }
  if (generatedPr?.state === 'open') {
    return refuse('open-pr', `Generated archive PR ${generatedPr.html_url || ''} is still open. Resolve review and validation before retrying.`);
  }
  if (generatedPr?.merged === true || generatedPr?.merged_at) {
    return refuse('merged-pr', 'Generated archive output has already merged. Check deployment; do not rebuild it again.');
  }
  if (generatedPageExists !== false) {
    return refuse('page-present', 'The canonical game page already exists on main, or its status could not be verified. Check deployment instead.');
  }
  if (SOURCE_STATES_REQUIRING_MANUAL_REPAIR.has(job.status)) {
    return refuse('manual-repair', 'The previous publication is blocked in review or deployment. Repair that stage; a new rebuild would duplicate work.');
  }
  const sourceRun = selectSourceWorkflowRun(runs, job.sourceSha);
  if (!sourceRun) {
    return refuse('missing-run', 'The original publishing run could not be verified. Inspect GitHub Actions rather than starting an untracked retry.');
  }
  if (sourceRun.status !== 'completed' || sourceRun.conclusion !== 'failure') {
    return refuse('not-failed', 'The original publishing run has not been confirmed as a failed build. Resume monitoring instead.');
  }
  return {
    allow: true,
    reason: 'failed-build',
    message: 'The saved game is missing its generated page, the original build failed, and no active workflow or unmerged output PR was found. One source-only rebuild may be started.'
  };
}
