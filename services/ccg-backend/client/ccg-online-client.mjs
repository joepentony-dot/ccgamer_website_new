import { createCcgAuthClient } from './ccg-auth-client.mjs';
import { createLostSizzlerCloudSync } from './lost-sizzler-cloud-sync.mjs';

/**
 * Compose the future CCG-owned browser services without activating any network
 * request during construction. The caller must explicitly invoke auth/cloud
 * operations. This module is intentionally not loaded by the live website yet.
 */
export function createCcgOnlineClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const auth = createCcgAuthClient({ baseUrl, fetchImpl });
  const lostSizzlerCloudSave = createLostSizzlerCloudSync({
    baseUrl,
    fetchImpl,
    cryptoImpl,
    getAccessToken: () => auth.getAccessToken(),
  });

  return Object.freeze({
    auth,
    lostSizzler: Object.freeze({
      cloudSave: lostSizzlerCloudSave,
    }),
  });
}
