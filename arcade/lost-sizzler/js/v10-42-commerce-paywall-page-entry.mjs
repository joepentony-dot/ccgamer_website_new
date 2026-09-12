import { autoBootC64DungeonCarnagePaywall } from './v10-42-commerce-paywall-loader.mjs';

const DISABLED_RESULT = Object.freeze({
  enabled: false,
  mounted: false,
  reason: 'disabled',
});

function resolveConfig(globalRef) {
  if (!globalRef || typeof globalRef !== 'object') return undefined;
  return globalRef.__CCG_DUNGEON_CARNAGE_COMMERCE__;
}

export function startC64DungeonCarnagePaywallPageEntry({
  globalRef = globalThis,
  boot = autoBootC64DungeonCarnagePaywall,
} = {}) {
  const config = resolveConfig(globalRef);
  if (!config || config.enabled !== true) {
    return Promise.resolve(DISABLED_RESULT);
  }
  if (typeof boot !== 'function') {
    return Promise.reject(new Error('C64 Dungeon Carnage paywall page entry requires a boot function.'));
  }
  return Promise.resolve(boot({
    config,
    documentRef: globalRef.document,
    fetchImpl: globalRef.fetch,
    now: () => Date.now(),
  }));
}

export function autoStartC64DungeonCarnagePaywallPageEntry(globalRef = globalThis) {
  return startC64DungeonCarnagePaywallPageEntry({ globalRef }).catch((error) => {
    const config = resolveConfig(globalRef);
    if (config && typeof config.onError === 'function') {
      config.onError(error);
      return Object.freeze({
        enabled: true,
        mounted: false,
        reason: 'error',
        error,
      });
    }
    throw error;
  });
}

if (typeof window !== 'undefined' && window === globalThis) {
  void autoStartC64DungeonCarnagePaywallPageEntry(globalThis);
}

export { DISABLED_RESULT };
