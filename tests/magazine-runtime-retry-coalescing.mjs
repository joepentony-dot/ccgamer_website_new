import fs from "node:fs";

const source = fs.readFileSync("js/magazine-game-reviews-runtime.js", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(source.includes("function retryRender()"), "magazine runtime must retain delayed recovery through retryRender");
assert(source.includes('container?.querySelector(`[${PANEL_ATTR}=\"true\"]`)'), "delayed retries must detect the completed interactive panel");
assert(source.includes("window.setTimeout(retryRender, 500);"), "500ms recovery retry must remain");
assert(source.includes("window.setTimeout(retryRender, 1500);"), "1500ms recovery retry must remain");
assert(!source.includes("window.setTimeout(render, 500);"), "500ms retry must not blindly rebuild an existing interactive panel");
assert(!source.includes("window.setTimeout(render, 1500);"), "1500ms retry must not blindly rebuild an existing interactive panel");
assert(source.includes("render();\n        observe();"), "initial runtime upgrade and mutation recovery must remain");
assert(source.includes("new MutationObserver(() =>"), "MutationObserver recovery must remain intact");
assert(source.includes('panel.setAttribute(PANEL_ATTR, "true");'), "interactive panel marker must remain intact");

console.log("Magazine retry coalescing guard passed.");
