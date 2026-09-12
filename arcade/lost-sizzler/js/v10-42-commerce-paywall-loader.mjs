const ENTRY_MODULE_URL = '/services/ccg-backend/client/lost-sizzler-paywall-entry.mjs';

function requireImporter(value) {
  if (typeof value !== 'function') throw new Error('C64 Dungeon Carnage paywall loader importer must be a function.');
  return value;
}

function requireMount(value) {
  if (!value || typeof value.mountLostSizzlerPaywallEntry !== 'function') {
    throw new Error('C64 Dungeon Carnage paywall entry module is invalid.');
  }
  return value.mountLostSizzlerPaywallEntry;
}

export async function bootC64DungeonCarnagePaywall({
  config = globalThis.__CCG_DUNGEON_CARNAGE_COMMERCE__,
  documentRef = globalThis.document,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  importer = (url) => import(url),
} = {}) {
  if (!config || config.enabled !== true) {
    return Object.freeze({
      enabled: false,
      mounted: false,
      reason: 'disabled',
    });
  }

  const importModule = requireImporter(importer);
  const module = await importModule(ENTRY_MODULE_URL);
  const mountEntry = requireMount(module);

  return mountEntry({
    config,
    documentRef,
    fetchImpl,
    now,
  });
}

export function autoBootC64DungeonCarnagePaywall(options = {}) {
  const config = options.config ?? globalThis.__CCG_DUNGEON_CARNAGE_COMMERCE__;
  if (!config || config.enabled !== true) {
    return Promise.resolve(Object.freeze({
      enabled: false,
      mounted: false,
      reason: 'disabled',
    }));
  }

  return bootC64DungeonCarnagePaywall({ ...options, config }).catch((error) => {
    const onError = config && typeof config.onError === 'function' ? config.onError : null;
    if (onError) onError(error);
    throw error;
  });
}

export { ENTRY_MODULE_URL };
