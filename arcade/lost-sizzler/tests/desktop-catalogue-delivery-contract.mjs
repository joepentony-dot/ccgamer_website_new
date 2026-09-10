import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Desktop catalogue delivery contract failed: ${message}`);
};

const gate = read('arcade/lost-sizzler/js/online-services-gate.js');
const catalogueConsumer = read('arcade/lost-sizzler/js/v10-4-patch.js');
const packageBuilder = read('scripts/build-lost-sizzler-package-manifest.mjs');

assert(gate.includes('function catalogueUrl(){'), 'delivery gate must expose a dedicated collectible-catalogue resolver');
assert(gate.includes('if(deliveryMode==="web")return "/games/games.json";'), 'website mode must retain the website catalogue URL');
assert(
  gate.includes('rawDelivery.resolveLocalAsset("games/games.json",{kind:"collectible-catalogue"})'),
  'desktop catalogue resolution must prefer the wrapper local-asset resolver'
);
assert(gate.includes('const explicit=String(rawDelivery.catalogueUrl||"").trim();'), 'desktop wrappers must retain an explicit catalogueUrl seam');
assert(gate.includes('return explicit||null'), 'unconfigured desktop catalogue resolution must fail closed');
assert(gate.includes('catalogueUrl\n  });'), 'catalogue resolver must remain exposed on CCGLostSizzlerDelivery');

assert(
  catalogueConsumer.includes('const delivery = window.CCGLostSizzlerDelivery;'),
  'collectible catalogue loading must consult the delivery boundary'
);
assert(
  catalogueConsumer.includes('typeof delivery?.catalogueUrl === "function" ? delivery.catalogueUrl() : "/games/games.json"'),
  'collectible catalogue loading must use the delivery resolver when available'
);
assert(
  catalogueConsumer.includes('if (!target) throw new Error("Desktop collectible catalogue is not configured.");'),
  'desktop catalogue loading must stop instead of falling back to an accidental network/root path'
);

assert(
  packageBuilder.includes("{ source: 'games/games.json', classification: 'catalogue' }"),
  'desktop package manifest must continue to carry the collectible catalogue locally'
);

console.log('Lost Sizzler desktop catalogue delivery contract: PASS');
