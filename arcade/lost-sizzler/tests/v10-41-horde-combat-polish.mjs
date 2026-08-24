import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-horde-combat-polish.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/version-check.js"),"utf8");

assert.match(loader,/v10-41-horde-combat-polish\.js\?v=20260824a/,"version-check must load the Horde combat polish layer");
assert.match(source,/WAVE_RECOVERY_HP=5/,"each completed Horde wave must award up to 5 HP recovery");
assert.match(source,/model\.hp=Math\.min\(maxHp,before\+WAVE_RECOVERY_HP\)/,"wave recovery must heal without exceeding max HP");
assert.match(source,/WAVE_POWER=Object\.freeze\(\[2,2,3,3,4,4,5,5,6,7\]\)/,"Horde weapons must use the stronger shot-power curve");
assert.match(source,/p1\.weapon\.power=Math\.max\(power,Number\(p1\.weapon\.power\|\|0\)\)/,"the stronger Horde power curve must reach the live local weapon");
assert.match(source,/MAX_ENEMY_SPEED=\.72/,"ordinary Horde enemies must use the slower movement cap");
assert.match(source,/MAX_WARDEN_SPEED=\.78/,"the Warden must remain slightly quicker while still slowed from the old pacing");
assert.match(source,/enemy\.moveCooldown=Math\.max\(Number\(enemy\.moveCooldown\|\|0\),90000\)/,"generic tactical wandering/dodging must remain disabled in Horde");
assert.match(source,/if\(newDistance<oldDistance\)/,"normal Horde approach steps must move toward the survivor rather than strafe");
assert.match(source,/SIDE_STEP_GRACE_MS=1100/,"lateral pathing must be delayed so enemies cannot rapidly sidestep shots");
assert.match(source,/One occasional lateral pathing step is allowed after being physically/,"blocked enemies must retain a slow escape route instead of becoming permanently stuck");

console.log("Lost Sizzler V10.41 Horde combat pacing, stronger shots, anti-sidestep and +5 HP recovery regression checks passed.");
