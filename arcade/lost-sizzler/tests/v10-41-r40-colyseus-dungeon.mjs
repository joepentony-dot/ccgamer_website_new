import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const adapter=read("arcade/lost-sizzler/js/v10-41-r40-colyseus-dungeon.js");
const loader=read("arcade/lost-sizzler/js/v10-41-lake-item-safety.js");
const app=read("multiplayer-server/src/app.config.ts");
const room=read("multiplayer-server/src/rooms/DungeonRoom.ts");
const pkg=JSON.parse(read("multiplayer-server/package.json"));

assert.match(app,/dungeon_v1:\s*defineRoom\(DungeonRoom\)\.filterBy\(\["roomCode"\]\)/,"Dungeon room must be matched by the existing CCG room code");
assert.match(app,/rooms:\s*\["horde_v1",\s*"dungeon_v1"\]/,"service metadata must advertise both migrated multiplayer rooms");
assert.match(room,/maxClients\s*=\s*4/,"Dungeon transport must retain the four-player room cap");
assert.match(room,/this\.broadcast\("game"[\s\S]*\{\s*except:\s*client\s*\}/,"Dungeon relay must preserve Supabase self:false behaviour and not echo a player's packet back to itself");
assert.match(room,/transport:\s*"colyseus"/,"Dungeon room status must identify Colyseus transport");

assert.match(adapter,/const isDungeonOnline=.*playMode==="online"[\s\S]*roomMode\(\)===DUNGEON[\s\S]*!specialType\(\)/,"Dungeon bridge must require online Dungeon and reject every special mode");
assert.match(adapter,/state\.transportLive&&state\.room&&isDungeonOnline\(\)/,"gameplay sends may leave Supabase only after the Dungeon Colyseus room is confirmed live");
assert.match(adapter,/return current\.apply\(this,arguments\)/,"Dungeon bridge must preserve the existing Supabase sender as fallback");
assert.match(adapter,/state\.transportLive&&isDungeonOnline\(\)&&!state\.deliveringColyseus/,"legacy Supabase gameplay receives must be suppressed only while live Colyseus delivery owns Dungeon transport");
assert.doesNotMatch(adapter,/hostEnemyStep\s*=/,"Dungeon transport migration must not replace the existing browser-host enemy simulation");
assert.doesNotMatch(adapter,/active\.authoritative\s*=/,"Dungeon transport migration must not steal gameplay authority from the established host model");

assert.match(loader,/playMode==="online"&&Boolean\(net\?\.connected\)&&roomMode==="dungeon"&&!special/,"late loader must lazy-load Dungeon networking only for an online Dungeon room");
assert.match(loader,/v10-41-r40-colyseus-dungeon\.js/,"late loader must publish the Dungeon Colyseus bridge");
assert.ok(loader.indexOf("loadDungeonServer")<loader.indexOf("loadHordeServer"),"Dungeon and Horde must keep independent lazy loaders");

assert.equal(pkg.scripts["smoke:dungeon"],"node tests/dungeon-room-smoke.mjs");
assert.match(pkg.scripts["smoke:local"],/smoke:horde.*smoke:dungeon/,"Colyseus CI smoke command must exercise Horde and Dungeon rooms");

console.log("Lost Sizzler V10.41 r40 Dungeon Colyseus transport and local-mode isolation contracts passed.");
