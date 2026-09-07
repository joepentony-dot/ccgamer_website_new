import { createCcgAuthClient } from './ccg-auth-client.mjs';
import { createLostSizzlerCloudSync } from './lost-sizzler-cloud-sync.mjs';
import { createLostSizzlerWeeklyVault } from './lost-sizzler-weekly-vault.mjs';
import { createLostSizzlerFeedbackClient } from './lost-sizzler-feedback.mjs';
import { createLostSizzlerProgressClient } from './lost-sizzler-progress.mjs';
import { createLostSizzlerRealtimeClient } from './lost-sizzler-realtime.mjs';

/**
 * Compose the future CCG-owned browser services without activating any network
 * request or WebSocket during construction. The caller must explicitly invoke
 * auth/cloud/Weekly Vault/feedback/progress/realtime operations. This module is
 * intentionally not loaded by the live website or Lost Sizzler runtime yet.
 */
export function createCcgOnlineClient({
  baseUrl,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  WebSocketImpl = globalThis.WebSocket,
  realtimeOptions = {},
} = {}) {
  if (!realtimeOptions || typeof realtimeOptions !== 'object' || Array.isArray(realtimeOptions)) {
    throw new Error('realtimeOptions must be an object');
  }

  const auth = createCcgAuthClient({ baseUrl, fetchImpl });
  const lostSizzlerCloudSave = createLostSizzlerCloudSync({
    baseUrl,
    fetchImpl,
    cryptoImpl,
    getAccessToken: () => auth.getAccessToken(),
  });
  const lostSizzlerWeeklyVault = createLostSizzlerWeeklyVault({
    baseUrl,
    fetchImpl,
    getAccessToken: () => auth.getAccessToken(),
  });
  const lostSizzlerFeedback = createLostSizzlerFeedbackClient({
    baseUrl,
    fetchImpl,
    getAccessToken: () => auth.getAccessToken(),
  });
  const lostSizzlerProgress = createLostSizzlerProgressClient({
    baseUrl,
    fetchImpl,
    getAccessToken: () => auth.getAccessToken(),
  });
  const lostSizzlerRealtime = createLostSizzlerRealtimeClient({
    baseUrl,
    WebSocketImpl,
    timeoutMs: realtimeOptions.timeoutMs,
    onRoom: realtimeOptions.onRoom ?? null,
    onPacket: realtimeOptions.onPacket ?? null,
    onConnection: realtimeOptions.onConnection ?? null,
    onError: realtimeOptions.onError ?? null,
  });

  return Object.freeze({
    auth,
    lostSizzler: Object.freeze({
      cloudSave: lostSizzlerCloudSave,
      weeklyVault: lostSizzlerWeeklyVault,
      feedback: lostSizzlerFeedback,
      progress: lostSizzlerProgress,
      realtime: lostSizzlerRealtime,
    }),
  });
}
