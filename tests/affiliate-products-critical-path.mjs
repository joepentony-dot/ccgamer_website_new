import fs from "node:fs";

const source = fs.readFileSync("js/affiliate-products.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const contextGuard = 'const renderContextKey = getRenderContextKey();\n        if (!renderContextKey || renderContextKey === lastRenderedContextKey) return;';
const guardIndex = source.indexOf(contextGuard);
const styleIndex = source.indexOf('ensureStylesheet();', guardIndex);
const configIndex = source.indexOf('const config = await loadConfig();', guardIndex);

assert(source.includes('let renderTimer = null;'), 'affiliate scheduling must coalesce same-tick render requests');
assert(source.includes('let lastRenderedContextKey = "";'), 'affiliate runtime must track its last successful page context');
assert(source.includes('function getRenderContextKey()'), 'affiliate runtime must derive a renderable page context before loading assets');
assert(source.includes('if (!system) return "";'), 'single-game affiliate work must wait until game system metadata exists');
assert(guardIndex >= 0, 'renderAll must return before doing work when no new render context exists');
assert(styleIndex > guardIndex, 'affiliate stylesheet injection must happen after the context guard');
assert(configIndex > guardIndex, 'affiliate catalogue loading must happen after the context guard');
assert(source.includes('lastRenderedContextKey = renderContextKey;'), 'successful affiliate renders must be memoized');
assert(source.includes('if (renderTimer !== null) return;'), 'duplicate scheduled renders must be coalesced');
assert(source.includes('window.addEventListener("ccg:game-loaded", scheduleRender);'), 'dynamic game loading must continue to trigger affiliate rendering');
assert(source.includes('renderHomeSpotlight(config);'), 'homepage affiliate spotlight behaviour must remain present');
assert(source.includes('renderGameShowcase(config);'), 'game affiliate showcase behaviour must remain present');

console.log("Affiliate critical-path optimisation guard passed.");
