import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-r48-character-animation-polish.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/game-render.js"),"utf8");

const r47=loader.indexOf('v10-41-r47-all-mode-optimisation.js');
const r48=loader.indexOf('v10-41-r48-character-animation-polish.js');
assert.ok(r48>r47,"r48 animation polish must load after the all-mode optimisation layer");
assert.match(loader,/data-ccg-v141-r48-character-animation-polish/,"late loader must publish an explicit r48 marker");

assert.match(render,/explorer-sheet-v10-34\.png/,"canonical player renderer must still own the explorer sprite source");
assert.match(render,/sheet\.naturalWidth>=192/,"canonical player renderer must retain the six-column explorer sheet contract");
assert.match(render,/column\*32,row\*32,32,32/,"canonical player renderer must use exact 32px source cells");
assert.match(render,/Math\.floor\(now\/145\)%2\?1:2/,"baseline player walk animation must remain a two-pose source that r48 expands safely");
assert.match(render,/function drawPixelEnemySprite\(/,"enemy families must remain procedural renderers rather than becoming fragile atlas ownership");
assert.match(render,/Math\.sin\(phase/,"procedural enemies must retain continuously animated pose components");

assert.match(source,/const PLAYER_CELL=32/,"r48 must preserve exact player cell dimensions");
assert.match(source,/const PLAYER_COLS=6/,"r48 must preserve all six player source columns");
assert.match(source,/const PLAYER_ROWS=4/,"r48 must preserve all four directional rows");
assert.match(source,/const PLAYER_PAD=2/,"r48 must add transparent per-frame padding rather than sample adjacent cells");
assert.match(source,/PLAYER_STRIDE=PLAYER_CELL\+PLAYER_PAD\*2/,"padded atlas stride must include both gutters");
assert.match(source,/for\(let row=0;row<PLAYER_ROWS;row\+\+\)for\(let column=0;column<PLAYER_COLS;column\+\+\)/,"every player frame in every direction must be copied independently");
assert.match(source,/column\*PLAYER_CELL,row\*PLAYER_CELL,PLAYER_CELL,PLAYER_CELL,column\*PLAYER_STRIDE\+PLAYER_PAD,row\*PLAYER_STRIDE\+PLAYER_PAD,PLAYER_CELL,PLAYER_CELL/,"each source frame must be copied whole into its own padded cell");
assert.match(source,/verifySourceFrameMargins/,"r48 must inspect the original source-cell perimeter before trusting the padded copy");
assert.match(source,/framesTouchingEdges/,"source-frame diagnostics must identify any exact row\/column whose visible pixels touch a cell edge");
assert.match(source,/edgeOpaquePixels===0/,"source-margin audit must require a transparent perimeter around every player pose");
assert.match(source,/verifyPaddedAtlas/,"r48 must expose a runtime gutter-integrity diagnostic");
assert.match(source,/opaqueGutterPixels/,"runtime diagnostics must detect any accidental pixel bleed into frame gutters");

const walkBlock=source.match(/const WALK_SEQUENCE=Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1]||"";
const attackBlock=source.match(/const ATTACK_SEQUENCE=Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1]||"";
assert.ok((walkBlock.match(/column:/g)||[]).length>=4,"player walk cycle must expose at least four presentation stages");
assert.ok((attackBlock.match(/column:/g)||[]).length>=6,"player melee cycle must expose at least six presentation stages");
assert.match(walkBlock,/column:0/,"walk animation must use the centred pose between stride extremes for smoother stepping");
assert.match(attackBlock,/wind-up/,"attack animation must include an explicit wind-up stage");
assert.match(attackBlock,/recover/,"attack animation must include an explicit recovery stage");

assert.match(source,/context\.drawImage=function r48PlayerDrawImage/,"player safety must intercept only the draw call, not gameplay state");
assert.match(source,/nativeDrawImage\.call\(ctx,atlas,column\*PLAYER_STRIDE,sourceRow\*PLAYER_STRIDE,PLAYER_STRIDE,PLAYER_STRIDE/,"player rendering must sample exactly one padded frame at a time");
assert.match(source,/window\.drawPlayer=wrapped/,"all canonical player render kinds must share the same animation wrapper");
assert.match(source,/kind="p1"/,"wrapper must preserve the canonical player-kind signature for P1, P2 and remote players");

assert.match(source,/function interpolationRate\(baseRate,dtMs\)/,"enemy motion must use a reusable time-based interpolation function");
assert.match(source,/1-Math\.pow\(1-base,dt\/16\.6667\)/,"enemy interpolation must preserve the 60 Hz feel while adapting to render delta");
assert.match(source,/window\.enemyScreen=wrapped/,"all canonical procedural enemies must share frame-rate-independent screen interpolation");
assert.match(source,/e\.aiState==="chase"\?\.26:\.14/,"r48 must preserve existing chase/search interpolation strength at 60 Hz");

for(const forbidden of [/\.hp\s*=/,/\.health\s*=/,/\.damage\s*=/,/\.speed\s*=/,/\.x\s*=/,/\.y\s*=/,/\.send\s*\(/,/supabase/i,/from\(/]){
  assert.doesNotMatch(source,forbidden,`animation polish must remain visual-only: ${forbidden}`);
}

console.log("V10.41 r48 character animation, source-margin, padded-frame and enemy interpolation contract passed.");
