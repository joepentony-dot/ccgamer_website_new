import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const adapter=read("arcade/lost-sizzler/js/v10-41-r41-colyseus-spy.js");
const loader=read("arcade/lost-sizzler/js/v10-41-lake-item-safety.js");
const app=read("multiplayer-server/src/app.config.ts");
const room=read("multiplayer-server/src/rooms/SpyRoom.ts");
const pkg=JSON.parse(read("multiplayer-server/package.json"));

assert.match(app,/spy_v1:\s*defineRoom\(SpyRoom\)\.filterBy\(\["roomCode"\]\)/,"Spy room must be matched by the existing CCG room code");
assert.match(app,/rooms:\s*\["horde_v1",\s*"dungeon_v1",\s*"spy_v1"\]/,"service metadata must advertise Horde, Dungeon and Spy rooms");
assert.match(app,/hordeAuthority:\s*"server"/,"Horde must remain server-authoritative");
assert.match(app,/dungeonTransport:\s*"colyseus"/,"Dungeon Colyseus transport must remain enabled");
assert.match(app,/spyTransport:\s*"colyseus"/,"Spy Colyseus transport must be advertised");

assert.match(room,/maxClients\s*=\s*2/,"Spy transport must retain the two-player room cap");
assert.match(room,/this\.broadcast\("game"[\s\S]*\{\s*except:\s*client\s*\}/,"Spy relay must preserve Supabase self:false behaviour");
assert.match(room,/Transport-only migration/,"Spy room must document that browser gameplay authority remains intact");

assert.match(adapter,/playMode==="online"&&Boolean\(net\?\.connected\)&&roomCode\(\)\.length>=4&&specialType\(\)===SPY/,"Spy bridge must require a real connected online Spy room");
assert.match(adapter,/joinOrCreate\("spy_v1"/,"Spy bridge must join the dedicated Spy Colyseus room");
assert.match(adapter,/state\.transportLive&&state\.room&&isSpyOnline\(\)/,"Spy sends may leave Supabase only after Colyseus transport is live");
assert.match(adapter,/return current\.apply\(this,arguments\)/,"Spy bridge must retain the existing Supabase sender as fallback");
assert.match(adapter,/const callback=net\?\.cb\?\.onPacket/,"Colyseus delivery must use the currently installed Spy packet owner");
assert.doesNotMatch(adapter,/net\.cb\.onPacket\s*=/,"Spy transport must not replace the r29-r35 packet callback owner");
assert.doesNotMatch(adapter,/active\.authoritative\s*=/,"Spy transport stage must not steal browser-host gameplay authority");
assert.doesNotMatch(adapter,/CCGLostSizzlerSaboteurs\s*=/,"Spy transport stage must not replace the established Spy rules engine");

assert.match(loader,/playMode==="online"&&Boolean\(net\?\.connected\)&&code\.length>=4&&special==="sizzler-saboteurs"/,"late loader must isolate Spy Colyseus loading to a connected online Spy room");
assert.match(loader,/v10-41-r41-colyseus-spy\.js/,"late loader must publish the Spy Colyseus bridge");
assert.match(loader,/v10-41-r40-colyseus-dungeon\.js/,"Dungeon lazy transport must remain present");
assert.match(loader,/v10-41-r38-colyseus-horde\.js/,"Horde dedicated transport must remain present");

assert.equal(pkg.scripts["smoke:spy"],"node tests/spy-room-smoke.mjs");
assert.match(pkg.scripts["smoke:local"],/smoke:horde.*smoke:dungeon.*smoke:spy/,"Colyseus CI smoke command must exercise all three multiplayer rooms");

console.log("Lost Sizzler V10.41 r41 Spy Colyseus transport and local-mode isolation contracts passed.");
