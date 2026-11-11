// Pure decisions for publisher recovery status, shared by browser UI and tests.
export const GENERATED_OUTPUT_STEP = 'Open and merge generated output pull request';

export function classifyGeneratedOutputFailure({ failedStep = '', pullRequest = null, runId = 0 } = {}) {
  const prefix = `Reliable Games Publishing run ${runId || 'unknown'}`;
  if (failedStep !== GENERATED_OUTPUT_STEP) {
    return {
      status: 'failed',
      stage: 'validation',
      label: 'Build / workflow failed',
      message: `${prefix} failed at "${failedStep || 'an unknown step'}". The game source is saved. Inspect the GitHub Actions log before retrying.`
    };
  }

  const prUrl = String(pullRequest?.html_url || '');
  if (pullRequest?.merged_at || pullRequest?.merged === true) {
    return {
      status: 'deploy-blocked',
      stage: 'live',
      label: 'Deployment handoff failed',
      message: `Generated game output was merged${prUrl ? ` as ${prUrl}` : ''}, but the deployment handoff failed. Check the existing GitHub Pages deployment for the current main commit. Do not create the game or merge the output again.`
    };
  }
  if (pullRequest?.state === 'open') {
    return {
      status: 'review-blocked',
      stage: 'validation',
      label: 'Review / merge blocked',
      message: `Generated game output remains unmerged in ${prUrl || 'its GitHub pull request'}. Resolve independent review or CI findings there; do not add the game again or blindly retry publishing.`
    };
  }

  return {
    status: 'failed',
    stage: 'validation',
    label: 'Merge state unconfirmed',
    message: `${prefix} stopped during generated-output merge/deployment. Could not confirm whether the output merged; inspect GitHub Actions and the generated-output PR before retrying. The game source is saved.`
  };
}

export function storedPublicationMessage(job) {
  if (!job?.sourceSha) return {
    text: 'No recent game source commit is stored in this browser. For an older publication, locate its saved source record before starting recovery.',
    error: false
  };
  if (job.status === 'review-blocked' || job.status === 'deploy-blocked' || job.status === 'failed') {
    return {
      text: String(job.recoveryMessage || (
        job.status === 'review-blocked'
          ? 'Generated output remains unmerged. Resolve the review or CI findings before retrying; do not add this game again.'
          : job.status === 'deploy-blocked'
            ? 'Generated output was merged but the deployment handoff failed. Check the deployment of current main; do not republish the game.'
            : 'The game source is saved but publication failed. Inspect the failing GitHub Actions step before retrying.'
      )),
      error: true
    };
  }
  if (job.status === 'awaiting-review') return {
    text: `${job.title || job.slug || 'Game'} · source ${job.sourceSha.slice(0, 8)} · awaiting independent review and merge. Do not republish the game.`,
    error: false
  };
  return {
    text: `${job.title || job.slug || 'Game'} · source ${job.sourceSha.slice(0, 8)} · ${job.status || 'pending'}. Source data is saved separately from generated site output.`,
    error: false
  };
}

/** Return only the newest status event from the current log submission.
 * Historical error messages must not overwrite a later successful release.
 */
export function latestPublicationLogTransition(logText) {
  const text = String(logText || '');
  const latestStart = Math.max(
    text.lastIndexOf('Preparing new game:'),
    text.lastIndexOf('Preparing game update:')
  );
  const failure = text.lastIndexOf('Automated publishing check failed:');
  const live = Math.max(
    text.lastIndexOf('Live page confirmed:'),
    text.lastIndexOf('Live canonical game page confirmed')
  );
  const index = Math.max(failure, live);
  if (index < 0 || index < latestStart) return null;
  return { index, status: live > failure ? 'live' : 'failed' };
}
