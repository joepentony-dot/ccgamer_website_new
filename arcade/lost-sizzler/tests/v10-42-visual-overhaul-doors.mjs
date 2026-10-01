import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const renderer=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../assets/asset-manifest.json",import.meta.url),"utf8"));
const provenance=readFileSync(new URL("../assets/pixel/visual-overhaul/0x72/PROVENANCE.md",import.meta.url),"utf8");

for(const key of ["doorLeafClosed","doorLeafOpen","doorFrameLeft","doorFrameRight","doorFrameTop"]){
  assert.ok(Object.prototype.hasOwnProperty.call(manifest.images.visualOverhaul,key),`visual manifest must retain ${key}`);
}
assert.match(provenance,/door-leaf-closed\.png/i,"door provenance must retain the closed state");
assert.match(provenance,/door-leaf-open\.png/i,"door provenance must retain the open state");

assert.match(renderer,/const doorRenderDiagnostics=window\.__CCG_DOOR_RENDER_DIAGNOSTICS__=/,"door renderer must expose focused diagnostics");
assert.match(renderer,/function drawDoorAsset\(d,s,eased,lockedCol,now\)/,"normal doors must have a dedicated authored-asset renderer");
assert.match(renderer,/closed\?\.complete&&closed\.naturalWidth>=16&&closed\.naturalHeight>=16&&open\?\.complete&&open\.naturalWidth>=16&&open\.naturalHeight>=16/,"door states must accept the authored source dimensions before scaling into the framed doorway");
assert.match(renderer,/if\(!horizontal\)ctx\.rotate\(Math\.PI\/2\)/,"vertical generated doors must rotate the authored horizontal-wall doorway by 90 degrees");
assert.match(renderer,/state==="open"[\s\S]*?ctx\.drawImage\(open,-half,-half,size,size\)/,"open doors must use the authored open leaf inside the framed doorway");
assert.match(renderer,/state==="opening"[\s\S]*?ctx\.drawImage\(open,-half,-half,size,size\)[\s\S]*?ctx\.drawImage\(closed,-half,-half,size,size\)/,"opening doors must transition between authored open and closed leaves");
assert.match(renderer,/const half=size\/2,jamb=Math\.max\(5,Math\.round\(size\*\.14\)\),lintel=Math\.max\(6,Math\.round\(size\*\.16\)\)/,"authored doors must be embedded in renderer-owned jamb and lintel masonry");
assert.match(renderer,/doorRenderDiagnostics\.lastMode="r84-framed-door"/,"successful framed authored rendering must be observable");
assert.match(renderer,/if\(d\.type==="secret"&&!d\.open&&!d\.opening\)\{drawSecretWall\(d,s\);continue\}/,"closed secret doors must remain disguised as wall masonry");
assert.match(renderer,/\}else if\(!drawDoorAsset\(d,s,eased,lockedCol,now\)\)\{/,"non-secret doors must prefer authored art before procedural fallback");
assert.match(renderer,/doorRenderDiagnostics\.lastMode="procedural-fallback"/,"decode failure must preserve the established procedural door renderer");
assert.doesNotMatch(renderer,/doorLeafClosed\.src\s*=\s*["']https?:/i,"door runtime must not hotlink remote art");

console.log("Dungeon Carnage CC0 door orientation and fallback contract passed.");
