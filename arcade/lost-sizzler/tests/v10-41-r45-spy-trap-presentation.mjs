import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-r32-spy-loader.js"),"utf8");
const r45=fs.readFileSync(path.join(root,"js/v10-41-r45-spy-trap-presentation.js"),"utf8");

assert.match(loader,/v10-41-r36-spy-perfection\.js[\s\S]*v10-41-r45-spy-trap-presentation\.js/,"r45 trap presentation must load only after r36 live-state reconciliation");
assert.match(loader,/trapPresentationLoaded:true|trapPresentationLoaded=false|trapPresentationLoaded:false/,"Spy lazy-loader diagnostics must expose r45 readiness");
assert.match(loader,/state\.trapPresentationLoaded=true/,"loader must mark r45 ready only after the script loads");

assert.match(r45,/MODE_ID="sizzler-saboteurs"/,"r45 must remain Spy-only");
assert.match(r45,/active\(\)\?\.type===MODE_ID/,"r45 must gate on the active Spy special mode");
assert.match(r45,/powerBrick:[\s\S]*name:"BOMB"/,"BOMB must have dedicated presentation metadata");
assert.match(r45,/spring:[\s\S]*name:"SPRING"/,"SPRING must have dedicated presentation metadata");
assert.match(r45,/custard:[\s\S]*name:"WATER BUCKET"/,"WATER BUCKET must have dedicated presentation metadata");
assert.match(r45,/ITEMS DROPPED/,"BOMB presentation must state the victim item-drop effect");
assert.match(r45,/SLOWED/,"trigger presentation must write the slowdown effect");
assert.match(r45,/VISION HIT/,"water-bucket presentation must write the vision effect");

assert.match(r45,/if\(placer!==actorId\(\)\)\{state\.hiddenRemotePlacements\+\+;return false\}/,"opponent trap placement must remain hidden");
assert.match(r45,/phase:"placed"[\s\S]*Hidden trap set · opponent cannot see its position/,"placer must receive explicit hidden-trap placement feedback");
assert.match(r45,/const slot=slotFor\(victim\)/,"trigger feedback must target the actual victim slot, including Player 2");
assert.match(r45,/remoteVictimVisuals\+\+/,"remote Player 2 trap presentation must be observable in diagnostics");
assert.match(r45,/data-tone="bomb"/,"BOMB must have a dedicated visual style");
assert.match(r45,/data-tone="spring"/,"SPRING must have a dedicated visual style");
assert.match(r45,/data-tone="water"/,"WATER BUCKET must have a dedicated visual style");
assert.match(r45,/spy-r45-drops/,"WATER BUCKET must include a visible splash/rain layer");
assert.match(r45,/backdrop-filter:blur/,"WATER BUCKET must visibly affect the victim view");
assert.match(r45,/prefers-reduced-motion:reduce/,"trap effects must respect reduced-motion preferences");

assert.doesNotMatch(r45,/\.hp\s*=|\.health\s*=|trapCharges\s*=|m\.traps\.push|net\.send|Colyseus|supabase/i,"r45 must not own damage, trap inventory, network transport or persistence");
assert.doesNotMatch(r45,/setInterval\([^,]+,\s*[0-9]{1,2}\)/,"r45 must not introduce an ultra-hot sub-100ms anonymous interval outside its named tick cadence");

console.log("Lost Sizzler V10.41 r45 Spy trap presentation contract passed.");
