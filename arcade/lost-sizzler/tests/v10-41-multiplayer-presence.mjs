import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const runtime=read("js/v10-6-runtime.js");
const presence=read("js/v10-41-multiplayer-presence.js");
const versionCheck=read("js/version-check.js");
const render=read("js/game-render.js");
const saboteurs=read("js/sizzler-saboteurs.js");

assert.match(render,/_meleeSwingAt/,"player rendering must retain transient melee animation support");
assert.match(render,/function drawPlayerWeapon/,"the visible player weapon renderer must remain available");
assert.match(presence,/net\.send\("v141_melee_fx"/,"a successful local melee swing must be broadcast to peers");
assert.match(presence,/player\._meleeSwingAt=at/,"a remote melee packet must start the peer weapon animation on the receiving browser");
assert.match(presence,/player\._meleeSwingDir=\{\.\.\.dir\}/,"remote melee direction must be reproduced rather than guessed");
assert.match(presence,/function overlayTeamRadar\(player\)/,"online teammate markers must be layered onto the radar");
assert.match(presence,/for\(const model of remote\.values\(\)\)/,"every live remote co-op player must be considered for the radar");
assert.match(presence,/drawTeamMarker\(ctx,cx,cy,colour,label,true,angle\)/,"off-panel teammates must receive an edge direction marker");
assert.match(presence,/spyMode\(\)\|\|playMode!=="online"/,"the teammate radar repair must not override Spy Vs Spy's no-radar design");
assert.match(saboteurs,/const NO_MINIMAP = true/,"Spy Vs Spy must remain a no-minimap mode");

assert.match(runtime,/const attempt=\+\+joinAttempt;startHandled=false;lastStartMeta=null;/,"join state must be reset before awaiting the network join");
assert.match(runtime,/if\(startHandled\|\|mode==="playing"\|\|document\.body\?\.dataset\?\.specialMode\)/,"a start packet received during join resolution must not be undone by reopening the lobby");
assert.match(runtime,/v106_lobby_probe/,"guests must be able to request authoritative lobby or live-match state");
assert.match(runtime,/v106_lobby_meta/,"hosts must answer join-state probes with authoritative room metadata");
assert.match(runtime,/started:live,startMeta:live\?lastStartMeta:null/,"a late join must receive the active start metadata when the host is already playing");
assert.match(runtime,/if\(!specialApi\?\.startOnline\)throw new Error/,"a failed special-mode initialisation must report an error instead of silently falling back to Dungeon mode");
assert.match(runtime,/url\.searchParams\.set\("mode"/,"shared invites must carry the intended room mode as useful pre-join context");
assert.match(presence,/id="v141-invite-player-name"/,"shared invite links must present a dedicated player-name field before connecting");
assert.match(presence,/Enter a player name before joining/,"blank invite names must be rejected before room admission");
assert.match(presence,/mainName\.value=name/,"the confirmed invite name must become the multiplayer player name");
assert.match(presence,/api\?\.joinLobbyRoom/,"the invite confirmation must use the mode-aware lobby join flow directly");
assert.match(presence,/showInviteNameGate\(meta\)/,"invite URLs must pause at the name confirmation rather than joining immediately on page load");
assert.match(versionCheck,/v10-41-multiplayer-presence\.js/,"the V10.41 multiplayer repair must be loaded by the live bootstrap path");

console.log("Lost Sizzler V10.41 multiplayer melee visibility, teammate radar, invite-name confirmation and resilient join-flow checks passed.");
