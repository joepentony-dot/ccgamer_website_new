import assert from "node:assert/strict";
import fs from "node:fs";
const root=new URL("../",import.meta.url);
const read=file=>fs.readFileSync(new URL(file,root),"utf8").replace(/\r\n/g,"\n");
const holdSrc=read("js/v10-42-attack-hold-liveness.js");
const r20Src=read("js/v10-42-r20-live-regression-stability.js");
const inventorySrc=read("js/v10-42-r47-inventory-fire-recovery.js");

assert.match(holdSrc,/pressVerifications:0/);
assert.match(holdSrc,/pressRecoveries:0/);
assert.match(holdSrc,/function attackSnapshot\(\)/);
assert.match(holdSrc,/const shotObserved=\(before,after\)=>after\.mana<before\.mana\|\|after\.shots>before\.shots/);
assert.match(holdSrc,/function verifyFreshPress\(code,before\)/);
assert.doesNotMatch(holdSrc,/if\(!held\.has\(code\)\|\|/,"keyup must not cancel verification of a fresh tap");
assert.doesNotMatch(holdSrc,/shotObserved[^\n]*(?:fire|buffer)/,"queued/cooldown state must not count as a completed shot");
assert.match(holdSrc,/const repairBefore=attackSnapshot\(\)/);
assert.match(holdSrc,/r20\.attackNow\(code\)/);
assert.match(holdSrc,/const repaired=shotObserved\(repairBefore,attackSnapshot\(\)\)/);
assert.match(holdSrc,/const fresh=!event\.repeat&&!held\.has\(event\.code\)/);
assert.match(holdSrc,/if\(fresh\)verifyFreshPress\(event\.code,before\)/);
assert.match(holdSrc,/const ATTACK_KEYS=new Set\(\["Space","Numpad0"\]\)/,"only Space and Numpad0 may be attack keys");
assert.doesNotMatch(holdSrc,/ATTACK_KEYS=new Set\([^\n]*"KeyF"/,"F must remain reserved for fullscreen and must not become an attack key");

assert.match(r20Src,/function activePlayerBulletCount\(player\)/);
assert.match(r20Src,/\(bullets\|\|\[\]\)\.filter\(projectile=>projectile\?\.ttl>0/,"R20 must inspect the authoritative live bullets collection");
assert.match(r20Src,/const beforeBullets=activePlayerBulletCount\(player\)/);
assert.match(r20Src,/return fired\n  }/);
assert.doesNotMatch(r20Src,/return fired\|\|Boolean\(fireBuffer1>0\)/,"a queued attack buffer is not a successful direct-fire repair");

assert.match(inventorySrc,/const handled=afterMana<before\.mana\|\|afterBullets>before\.bullets/);
assert.doesNotMatch(inventorySrc,/const handled=[^\n]*(?:afterFire|afterBuffer)/,"inventory recovery must require actual shot evidence");
assert.match(inventorySrc,/const succeeded=Number\(p\.mana\|\|0\)<fallbackBeforeMana\|\|bulletCount\(p\)>fallbackBeforeBullets/);
assert.doesNotMatch(inventorySrc,/const succeeded=[^\n]*(?:fire1|fireBuffer1)/,"inventory fallback must not accept timer/buffer activity as a shot");

console.log("PASS V10.42 R51 fresh FIRE press recovery contract");
