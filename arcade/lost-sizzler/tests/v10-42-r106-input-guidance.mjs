import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");

const main=read("js/game-main.js");
const onboarding=read("js/v10-20-onboarding-safety.js");
const guidance=read("js/v10-23-tutorial-guidance.js");
const gamepad=read("js/v10-41-r49-gamepad-input-polish.js");
const gameplay=read("js/game-play.js");
const html=read("index.html");

assert.match(main,/const DOUBLE_TAP_DASH_MS=280/,"double-tap dash window must remain explicit");
assert.match(main,/function maybeDoubleTapDash\(player,code,now=performance\.now\(\)\)/,"canonical keyboard/controller direction path must own double-tap dash");
assert.match(main,/previous\.key===key&&now-previous\.at>45&&now-previous\.at<=DOUBLE_TAP_DASH_MS/,"double tap must require a fresh second directional press inside the bounded window");
assert.match(main,/dashPlayer\(player,dir\)/,"double tap must reuse the canonical dash implementation");
assert.match(main,/ccg:direction-double-tap-dash/,"double-tap dash must publish an observable action event");
assert.match(main,/if\(!e\.repeat&&p1\)maybeDoubleTapDash\(p1,e\.code\)/,"held/repeat movement must never generate repeated dashes");

assert.match(gamepad,/const P1_MOVE=\{up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD"\}/,"gamepad movement must continue to translate through the canonical P1 direction keys");
assert.match(gamepad,/setHeld\(slot,map\.up,up\);setHeld\(slot,map\.down,down\);setHeld\(slot,map\.left,left\);setHeld\(slot,map\.right,right\)/,"gamepad stick/D-pad edges must flow through the same key path as double-tap dash");
assert.match(gamepad,/setHeld\(slot,"Space",pressed\(b\[0\]\)\)/,"primary joypad button must remain attack");
assert.match(gamepad,/edge\(slot,5,pressed\(b\[5\]\)\).*ShiftLeft/s,"right shoulder must remain an alternate joypad dash");
assert.match(gamepad,/edge\(slot,8,pressed\(b\[8\]\)\).*Tab/s,"Select/View must remain the joypad inventory shortcut");

assert.match(onboarding,/single-button joystick/i,"tutorial must explicitly support a single-button joystick");
assert.match(onboarding,/quickly tap the same direction twice to dash/i,"tutorial must teach directional double-tap dash");
assert.match(onboarding,/4-button joypad: use A \/ primary button/i,"tutorial must give the modern joypad attack alternative");
assert.match(onboarding,/Select \/ View/i,"tutorial must give the joypad inventory alternative");
assert.doesNotMatch(onboarding,/Player 2 can use either Ctrl key/,"retired Player 2 tutorial wording must not remain in the dash lesson");
assert.doesNotMatch(onboarding,/Choose Play Solo/,"tutorial completion must not tell players to choose a retired Solo-labelled mode");

assert.match(guidance,/function controllerProfile\(\)/,"tutorial acknowledgement must detect the connected controller profile");
assert.match(guidance,/buttons<=2.*Single-button joystick detected/s,"low-button controllers must be described as single-button joystick controls");
assert.match(guidance,/Joypad detected: stick\/D-pad moves, A attacks, Select\/View opens Inventory, and double-tap a direction dashes/,"multi-button joypads must receive the correct live alternatives");

assert.doesNotMatch(guidance,/void requestPlayFullscreen\(\);\s*result=startSolo\(\)/,"tutorial/start guidance must not consume the trusted click on fullscreen before the soundtrack starts");
assert.match(guidance,/result=startSolo\(\)/,"Game and Tutorial must still route through canonical startSolo audio/fullscreen ordering");

assert.match(html,/id="timed-chamber-countdown"[^>]*role="timer"/,"Timed Chamber must expose a persistent visible countdown in the Quest strip");
assert.match(gameplay,/function timedChamberCountdown\(t=null\)/,"Timed Chamber runtime must own a persistent countdown updater");
assert.match(gameplay,/Math\.ceil\(Number\(active\.timeLeft\|\|0\)\/1000\)/,"Timed Chamber countdown must show remaining whole seconds");
assert.match(gameplay,/TIMED CHAMBER · \$\{seconds\}s/,"Timed Chamber countdown must use a player-readable seconds label");
assert.match(gameplay,/timedChamberCountdown\(null\).*TIMED CHALLENGE FAILED/s,"leaving a Timed Chamber must remove the countdown immediately");
assert.match(gameplay,/t\.cleared=true;t\.triggered=false;active=null[\s\S]*timedChamberCountdown\(null\)/,"clearing a Timed Chamber must stop and remove the countdown");

console.log("Dungeon R106 double-tap dash and controller-aware tutorial contract passed.");
