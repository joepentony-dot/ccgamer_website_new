'use strict';

// Fail-closed read-only probe of the SAME Twirp ArtifactService used by
// actions/deploy-pages@v4. Do not use the REST API's eventually-consistent view.

async function waitForArtifact({ listArtifacts, artifactName, maxAttempts = 18,
  intervalMs = 5000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  onRetry = () => {} }) {
  if (typeof listArtifacts !== 'function' ||
      typeof artifactName !== 'string' || !/^github-pages-[1-9][0-9]*$/.test(artifactName) ||
      !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 30 ||
      !Number.isInteger(intervalMs) || intervalMs < 0 || intervalMs > 30000) {
    throw new Error('Invalid Pages artifact service probe configuration');
  }
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // No findBy: default client lists the current workflow run via Twirp,
      // matching getArtifactMetadata() in actions/deploy-pages@v4.
      const response = await listArtifacts();
      if (!response || !Array.isArray(response.artifacts)) {
        throw new Error('Artifact service returned invalid metadata');
      }
      const matching = response.artifacts.filter(item => item && item.name === artifactName);
      if (matching.length > 1) {
        throw new Error('Ambiguous current-attempt Pages artifact: deployment refused');
      }
      if (matching.length === 1) {
        const id = matching[0].id;
        if (!Number.isSafeInteger(id) || id <= 0) {
          throw new Error('Invalid current-attempt Pages artifact identity');
        }
        return { id, attempt };
      }
    } catch (error) {
      if (/^(Ambiguous current-attempt|Invalid current-attempt)/.test(error.message || '')) {
        throw error;
      }
      // A temporary service failure is not acceptance. Retry, then fail.
    }
    if (attempt === maxAttempts) {
      throw new Error('Pages artifact not visible in the deployment service; deployment refused');
    }
    onRetry(attempt);
    await sleep(intervalMs);
  }
  throw new Error('Pages artifact visibility check was not completed');
}

module.exports = { waitForArtifact };
