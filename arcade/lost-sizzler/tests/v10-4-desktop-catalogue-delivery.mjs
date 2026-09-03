import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const gateSource = fs.readFileSync(path.join(ROOT, 'arcade/lost-sizzler/js/online-services-gate.js'), 'utf8');
const patchSource = fs.readFileSync(path.join(ROOT, 'arcade/lost-sizzler/js/v10-4-patch.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(`Desktop catalogue delivery contract failed: ${message}`);
}

function extractCatalogueUrl() {
  const start = gateSource.indexOf('  function catalogueUrl(){');
  const end = gateSource.indexOf('\n\n  const delivery=Object.freeze({', start);
  assert(start >= 0 && end > start, 'catalogueUrl() must remain defined immediately before the delivery object');
  return gateSource.slice(start, end);
}

const catalogueUrlSource = extractCatalogueUrl();

function resolveCatalogue(mode, rawDelivery = {}) {
  const warnings = [];
  const sandbox = {
    rawDelivery,
    console: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
  };
  vm.runInNewContext(`
    const deliveryMode = ${JSON.stringify(mode)};
    ${catalogueUrlSource}
    globalThis.result = catalogueUrl();
  `, sandbox, { filename: 'lost-sizzler-catalogue-delivery.vm.js', timeout: 1000 });
  return { result: sandbox.result, warnings };
}

let webResolverCalls = 0;
const web = resolveCatalogue('web', {
  resolveLocalAsset() {
    webResolverCalls += 1;
    throw new Error('web must not call desktop resolver');
  },
});
assert(web.result === '/games/games.json', `web catalogue URL changed: ${JSON.stringify(web.result)}`);
assert(webResolverCalls === 0, 'web catalogue resolution must not call the desktop local-asset resolver');

const resolverCalls = [];
const desktopResolved = resolveCatalogue('desktop-offline', {
  resolveLocalAsset(relativePath, meta) {
    resolverCalls.push({ relativePath, meta });
    return 'app://lost-sizzler/games/games.json';
  },
});
assert(desktopResolved.result === 'app://lost-sizzler/games/games.json', 'desktop catalogue must use wrapper-resolved local asset URL');
assert(resolverCalls.length === 1, `desktop catalogue resolver must be called once; got ${resolverCalls.length}`);
assert(resolverCalls[0].relativePath === 'games/games.json', `desktop catalogue resolver path mismatch: ${resolverCalls[0].relativePath}`);
assert(resolverCalls[0].meta?.kind === 'collectible-catalogue', `desktop catalogue resolver kind mismatch: ${resolverCalls[0].meta?.kind}`);

const explicit = resolveCatalogue('desktop-online', { catalogueUrl: 'app://lost-sizzler/catalogue/c64.json' });
assert(explicit.result === 'app://lost-sizzler/catalogue/c64.json', 'desktop explicit catalogueUrl fallback must remain supported');

const thrown = resolveCatalogue('desktop-offline', {
  resolveLocalAsset() { throw new Error('fixture resolver failure'); },
  catalogueUrl: 'app://lost-sizzler/catalogue/fallback.json',
});
assert(thrown.result === 'app://lost-sizzler/catalogue/fallback.json', 'resolver failure must fall back to explicit catalogueUrl');
assert(thrown.warnings.length === 1 && thrown.warnings[0].includes('games/games.json'), 'resolver failure must remain observable without aborting the explicit fallback');

const unconfigured = resolveCatalogue('desktop-offline', {});
assert(unconfigured.result === null, `unconfigured desktop catalogue must fail closed; got ${JSON.stringify(unconfigured.result)}`);

assert(gateSource.includes('catalogueUrl\n  };') || gateSource.includes('catalogueUrl\r\n  };'), 'catalogueUrl must remain exported through CCGLostSizzlerDelivery');
assert(patchSource.includes('typeof delivery?.catalogueUrl === "function" ? delivery.catalogueUrl() : "/games/games.json"'), 'V10.4 catalogue loader must consume the delivery catalogue resolver');
assert(patchSource.includes('if (!target) throw new Error("Desktop collectible catalogue is not configured.");'), 'unconfigured desktop catalogue must fall back through the existing built-in-pool error path');
assert(patchSource.includes('const response = await fetch(target, { cache: "no-cache" });'), 'catalogue fetch must use the resolved target');
assert(!patchSource.includes('fetch("/games/games.json"'), 'V10.4 must not directly fetch the website-root catalogue');

console.log('Lost Sizzler desktop catalogue delivery contract: PASS');
