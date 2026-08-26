import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const completion=fs.readFileSync(path.join(root,"js/v10-41-horde-completion.js"),"utf8");
const runtime=fs.readFileSync(path.join(root,"js/v10-41-mode-runtime.js"),"utf8");

assert.doesNotMatch(completion,/window\.update\s*=/,"Horde completion must not install a global update interceptor");
assert.doesNotMatch(completion,/function\s+wrapUpdate\s*\(/,"retired Horde completion update wrapper must stay removed");
assert.match(completion,/function postHordeCompletionFrame\s*\(\)/,"Horde completion must expose controller-owned post-frame work");
assert.match(completion,/captureTerminalResult\(\);[\s\S]*updateTransitionBanner\(\)/,"controller-owned completion frame must preserve result capture before banner refresh");
assert.match(runtime,/CCGLostSizzlerV141HordeCompletion\?\.postHordeCompletionFrame/,"mode runtime must own Horde completion post-frame dispatch");
assert.match(runtime,/hordeCombatPostFrames\+\+[\s\S]*postHordeCompletionFrame/,"Horde completion must remain after combat post-processing");
assert.match(runtime,/if\(current\.profile\.family!=="horde"\)return current;[\s\S]*postHordeCompletionFrame/,"non-Horde frames must bypass Horde completion dispatch");
assert.match(runtime,/function clearHordePresentation\(\)[\s\S]*horde-transition-banner[\s\S]*dataset\.visible="false"/,"controller transitions must hide stale Horde completion UI without running Horde frame logic");

console.log("Lost Sizzler Horde completion controller-frame ownership checks passed.");
