import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const render=read("js/game-render.js");
const ai=read("js/ai.js");
const supabase=fs.readFileSync(path.resolve(root,"../../js/ccg-supabase-client.js"),"utf8");
const version=JSON.parse(read("version.json"));
const canonical=read("index.html");
const alias=fs.readFileSync(path.resolve(root,"../c64-dungeon-carnage/index.html"),"utf8");

assert.equal(version.build,"V10.42 r70");
assert.equal(version.cacheToken,"20260930r70");
assert.match(canonical,/ccg-lost-sizzler-build" content="V10\.42 r70"/);
assert.match(canonical,/ccg-lost-sizzler-cache" content="20260930r70"/);
assert.match(alias,/ccg-lost-sizzler-build" content="V10\.42 r70"/);
assert.match(alias,/ccg-lost-sizzler-cache" content="20260930r70"/);

assert.match(render,/CCGLostSizzlerV142R70RenderPerformance/,"R70 must expose renderer performance diagnostics");
assert.match(render,/quality:"rich"/,"renderer must start at full quality");
assert.match(render,/avg>=42/,"renderer must detect severe frame-time pressure");
assert.match(render,/next="severe"/,"renderer must enter severe recovery mode after sustained pressure");
assert.match(render,/function drawTilePerformance\(x,y\)/,"severe mode must use the lightweight static-tile path");
assert.match(render,/severe\?drawTilePerformance:drawTile/,"severe mode must preserve normal rich tiles outside the fallback path");
assert.match(render,/if\(richFx\)drawWallLights\(\)/,"expensive wall-light work must be shed outside rich quality");
assert.match(render,/if\(richFx\)drawAmbientMotes\(\)/,"ambient motes must be shed outside rich quality");
assert.match(render,/if\(!severe\)drawFog\(\)/,"fog must be skipped only during severe slowdown");
assert.match(render,/sampleDungeonRenderPerformance\(t\)/,"the main render loop must sample real frame cadence");
assert.match(ai,/R70 severe-performance recovery/,"R70 must document the cheap enemy-path fast path");
assert.match(ai,/const startDistance=man\(e,target\),direct=DIRS/,"enemy pathing must attempt a cheap reducing step before A*");
assert.match(ai,/if\(direct\[0\]\)return\{x:direct\[0\]\.x,y:direct\[0\]\.y\};/,"A* must be skipped when a direct legal reducing step exists");

assert.match(supabase,/function supabaseDebugEnabled\(\)/,"Supabase debug logging must have an explicit production gate");
assert.match(supabase,/ccgSupabaseDebug/,"Supabase debug logging must be opt-in");
assert.match(supabase,/supabaseDebugSeen = new Set\(\)/,"duplicate debug payloads must be suppressed");
assert.match(supabase,/if \(!supabaseDebugEnabled\(\)\) return;/,"normal production traffic must not emit debug logs");

console.log("PASS V10.42 R70 severe performance recovery contract");
