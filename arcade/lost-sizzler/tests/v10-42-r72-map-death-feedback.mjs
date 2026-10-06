import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const bootstrap=read("js/v10-42-bootstrap.js");
const gameplay=read("js/game-play.js");
const render=read("js/game-render.js");
const fullMap=read("js/v10-41-solo-full-map.js");
const warden=read("js/v10-42-warden-navigation-cues.js");
const wardenDomain=read("js/v10-42-warden-domain-progression.js");
const gameMain=read("js/game-main.js");
const evolution=read("js/v10-42-r47-firearm-evolution.js");
const voice=read("js/v10-16-voice-director.js");
const r72=read("js/v10-42-r72-map-death-feedback.js");
const css=read("css/v10-42-r72-map-death-feedback.css");
const fullMapCss=read("css/v10-41-solo-full-map.css");
const index=read("index.html");
const alias=fs.readFileSync(path.resolve(root,"../c64-dungeon-carnage/index.html"),"utf8");

assert.match(bootstrap,/v10-42-r72-map-death-feedback\.js/,"ordered bootstrap must load the R72 feedback owner after R71");
assert.match(r72,/ccg:player-death/,"R72 feedback owner must listen for explicit death events");
assert.match(r72,/YOU DIED/,"death feedback must be unmistakable before respawn");
assert.match(r72,/id="ccg-r72-death-continue"/,"death feedback must provide an explicit CONTINUE control");
assert.match(r72,/ccg:death-confirmed/,"death feedback must publish the player's explicit confirmation");
assert.match(r72,/ccg:respawn-confirmed/,"death feedback must remain present until gameplay confirms the respawn");
assert.match(css,/\.ccg-r72-death-feedback/,"R72 must style a blocking visual death announcement");
assert.match(css,/pointer-events:auto!important/,"death feedback must block and own pointer interaction while active");

assert.match(gameplay,/new CustomEvent\("ccg:player-death"/,"canonical death path must emit a death transition event");
assert.match(gameplay,/requiresConfirmation:true/,"normal death must declare that explicit confirmation is required");
assert.match(gameplay,/mode="respawning"/,"normal Solo death must stay in a non-playing respawn state until confirmed");
assert.match(gameplay,/pendingDeathConfirmation=/,"canonical death owner must retain the pending respawn transaction");
assert.match(gameplay,/addEventListener\("ccg:death-confirmed"/,"canonical gameplay must listen for the player's confirmation");
assert.match(gameplay,/function finishPendingDeathRespawn/,"confirmation must have one authoritative route back into play");
assert.doesNotMatch(gameplay,/deathTransitionMs=1200/,"normal death must no longer auto-resume on the old 1.2 second timer");
assert.doesNotMatch(gameplay,/setTimeout\(\(\)=>\{if\(mode==="respawning"\)\{mode="playing"/,"normal death must never resume through an unattended timer");
assert.match(gameplay,/mode="playing";p\.hitStunMs=0;p\.controlLocked=false;p\.controlsLocked=false/,"play may resume only inside the explicit confirmation owner");
assert.match(gameplay,/p\.invuln=Math\.max\(2200/,"respawn must be protected while the death overlay clears");
assert.match(gameplay,/p\.hitStunMs=0;p\.controlLocked=false;p\.controlsLocked=false;p\.invuln=Math\.max\(2200/,"R72 must clear stale stun and control locks before applying the temporary death-transition lock");
assert.match(gameplay,/p\.invuln=Math\.max\(2200[^\n]*p\.controlLocked=true;p\.controlsLocked=true/,"R72 may only relock controls as the deliberate temporary YOU DIED transition owner");
assert.match(wardenDomain,/\(M\(\)==="playing"\|\|M\(\)==="respawning"\)/,"cleansed Warden recovery anchor must remain eligible during the R72 respawn transition");
assert.match(gameMain,/if\(mode==="respawning"\)return false;/,"header pause/quit control must not interrupt the timed respawn transition");

assert.match(evolution,/new CustomEvent\("ccg:firearm-evolved"/,"firearm owner must publish a real tier-change event");
assert.match(voice,/ccg:firearm-evolved/,"voice director must use the real tier-change event");
assert.match(voice,/if\(detail\.first\|\|after<=before\)return/,"first acquisition and unchanged/capped pickups must not announce Weapon upgraded");
assert.doesNotMatch(voice,/WEAPON\.\*UPGRADE\|WEAPON CACHE/,"generic Weapon Cache text must no longer imply a real upgrade");
assert.match(voice,/WEAPON EVOLVED\|FIREARM UPGRADE COMPLETE/,"toast fallback may only recognise explicit successful upgrade copy");

assert.match(render,/function radarRoomType\(/,"radar must classify discovered room types");
assert.match(render,/world\?\.sanctuaryRooms[\s\S]*room\.sanctuary===true[\s\S]*return"sanctuary"/,"sanctuary map classification must require the authoritative sanctuary-room registry");
assert.match(render,/room\.dedicatedHazard\|\|room\.dangerous/,"danger rooms must receive their own map colour");
assert.match(render,/host\.enteredRoomIds/,"sanctuary icon must be gated by actual room discovery");
assert.match(render,/drawRadarCross\(radarCtx,px\(q\),py\(q\),"#64ffa2"/,"discovered sanctuary must use the green first-aid cross");
assert.match(render,/radarTileColour\(x,y,wall\)/,"radar tiles must use room-aware discovered colours");
assert.match(render,/radarCtx\.moveTo\(px\(p\),py\(p\)-5\)/,"player marker must use a directional triangle rather than the old square");

assert.match(fullMap,/function fullMapRoomType\(/,"full map must share room-type presentation");
assert.match(fullMap,/room\?\.sanctuary&&visited\.has/,"full map sanctuary markers must also require discovery");
assert.match(fullMap,/drawMarker\(context,q,"#64ffa2","plus"\)/,"full map sanctuary must use a green plus");
assert.match(fullMap,/CCGLostSizzlerV142WardenNavigationCues\?\.markerState/,"full map must include current Warden navigation markers");
assert.match(fullMap,/shape==="triangle"/,"full map marker renderer must support the player triangle");
assert.match(fullMap,/drawMarker\(context,p1,"#6cecff","triangle","YOU"\)/,"full map player marker must not fall back to the legacy square");
assert.match(fullMapCss,/ccg-map-player\{[^}]*clip-path:polygon\(50% 0,100% 100%,0 100%\)/,"full map legend must show the same triangle player symbol");
assert.match(warden,/const refuge=h\.v142CleansedRefuge/,"Warden refuge marker must come from the real cleansed refuge state, not a legacy checkpoint");
assert.doesNotMatch(warden,/rgba\(100,255,162/,"green cross styling is reserved for Sanctuary, not Warden refuge");

for(const page of [index,alias]){
  assert.match(page,/DUNGEON MAP<\/h3>/,"both public game entry pages must use the concise tactical map heading");
  assert.match(page,/radar-player/,"both public game entry pages must explain the player marker");
  assert.match(page,/radar-sanctuary/,"both public game entry pages must explain the Sanctuary marker");
  assert.match(page,/radar-key/,"both public game entry pages must explain the Key marker");
  assert.match(page,/radar-sigil/,"both public game entry pages must explain the Sigil marker");
  assert.match(page,/radar-shop/,"both public game entry pages must explain the Shop marker once");
  assert.match(page,/radar-cache/,"both public game entry pages must explain the Death Cache marker");
  assert.match(page,/radar-warden/,"both public game entry pages must explain Warden markers");
  assert.match(page,/radar-exit/,"both public game entry pages must explain the Exit marker");
  assert.doesNotMatch(page,/class="radar-room-legend"/,"main HUD must not duplicate markers with a second room-colour legend");
  assert.doesNotMatch(page,/radar-refuge/,"main HUD legend keeps rare refuge detail on the full map instead of overcrowding the tactical key");
}

assert.match(css,/\.radar-room-legend\{display:none!important\}/,"legacy room-colour legend must remain suppressed if stale markup is encountered");

console.log("Dungeon R72/R79 tactical map, truthful weapon feedback and confirmed death transition contracts passed.");
