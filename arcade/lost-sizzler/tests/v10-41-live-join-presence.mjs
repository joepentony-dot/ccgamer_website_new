import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const network=read("js/network.js");
const liveJoin=read("js/v10-41-live-join-presence.js");
const index=read("index.html");
const version=JSON.parse(read("version.json"));

assert.match(network,/runtimeStarted=false;this\.runtimeStartMeta=null/,"network rooms must track whether the host has started a live run");
assert.match(network,/presenceMember\(\).*runtimeStarted:Boolean\(this\.runtimeStarted\)/s,"live state must be persisted in Supabase room presence");
assert.match(network,/runtimeStartMeta:this\.runtimeStarted&&this\.runtimeStartMeta\?this\.runtimeStartMeta:null/,"host start metadata must be visible to later room members");
assert.match(network,/setRuntimePresence\(started,startMeta=null\)/,"network must expose an explicit live-state publisher");
assert.match(network,/getHostRuntimePresence\(\)/,"late joiners must be able to inspect the host's persisted live state");
assert.match(network,/v10-41-live-join-presence\.js\?v=\$\{encodeURIComponent\(releaseRev\)\}/,"network core must load the V10.41 late-join hardening layer through the current release token");

assert.match(liveJoin,/v106\(\)\?\.getLastStartMeta\?\.\(\)/,"host runtime presence must reuse the canonical V10.6 start metadata");
assert.match(liveJoin,/net\.setRuntimePresence\(true,meta\)/,"a running host must publish live start metadata to presence");
assert.match(liveJoin,/net\.getHostRuntimePresence\(\)/,"a waiting guest must inspect persistent host runtime state");
assert.match(liveJoin,/net\.cb\?\.onPacket\?\.\("v106_lobby_start",meta\)/,"persistent state must route through the canonical V10.6 start handler instead of duplicating launch logic");
assert.match(liveJoin,/special\?\.type!=="horde-survivor"/,"late roster reconciliation must be isolated to Horde Survivor");
assert.match(liveJoin,/runState\.players\.push\(makeHordePlayer\(member,index,runState\)\)/,"a genuine Horde late joiner must become a real survivor in the authoritative run state");
assert.match(liveJoin,/runState\.playerCount=Math\.max\(1,Math\.min\(4,runState\.players\.length\)\)/,"Horde scaling must update after late joins or disconnects");

assert.equal(version.build,"2026.08.25.28","live-join protection must remain included in the current r28 build");
assert.equal(version.cacheToken,"20260825r28","live-join protection must remain included in the current r28 cache generation");
assert.match(index,/js\/network\.js\?v=20260825r28/,"published page must keep browsers on the current r28 network runtime");
assert.doesNotMatch(index,/v10-41-live-join-presence\.js/,"published HTML must not duplicate the live-join module already owned by network.js");

console.log("Lost Sizzler V10.41 persistent live multiplayer late-join regression checks passed under r28.");
