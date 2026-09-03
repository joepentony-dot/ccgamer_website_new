import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(`Containment contract failed: ${message}`)};

const index=read("arcade/lost-sizzler/index.html");
const gate=read("arcade/lost-sizzler/js/online-services-gate.js");
const audio=read("arcade/lost-sizzler/js/admin-audio-overrides.js");
const inventory=read("arcade/lost-sizzler/SUPABASE-MIGRATION-INVENTORY.md");
const recovery=read("arcade/lost-sizzler/SUPABASE-STORAGE-RECOVERY-MANIFEST.md");

const gateIndex=index.indexOf('src="js/online-services-gate.js');
const versionIndex=index.indexOf('src="js/version-check.js');
const networkIndex=index.indexOf('src="js/network.js');

assert(gateIndex>=0,"index.html must load the local-first online-services gate");
assert(versionIndex>gateIndex,"online-services gate must load before version-check.js");
assert(networkIndex>gateIndex,"online-services gate must load before network.js");
assert(!index.includes('src="/js/ccg-supabase-config.js'),"index.html must not boot the website Supabase config unconditionally");
assert(!index.includes('src="/js/ccg-supabase-client.js'),"index.html must not boot the website Supabase client unconditionally");

assert(gate.includes('new Set(["web","desktop-online","desktop-offline"])'),"delivery modes must remain explicit");
assert(gate.includes('window.__CCG_LOST_SIZZLER_DELIVERY__'),"desktop wrapper delivery configuration seam must remain available");
assert(gate.includes('resolveLocalAsset("version.json"'),"desktop version manifest must support a local-asset resolver");
assert(gate.includes('versionManifestUrl'),"desktop version manifest URL seam must remain available");
assert(gate.includes('Desktop version manifest is not configured.'),"unconfigured desktop version fetch must fail closed");
assert(gate.includes('proto.getSupabase=async function()'),"multiplayer must remain routed through the central online-services gate");
assert(gate.includes('gate.activate("multiplayer-network")'),"multiplayer bridge must activate online services explicitly");
assert(gate.includes('button.dataset.ccgOnlineUnavailable="true"'),"unavailable desktop online controls must be marked and disabled");
assert(gate.includes('roomCode.disabled=true'),"desktop room-code input must be disabled when online services are unavailable");
assert(gate.includes('authActions.hidden=true'),"desktop account actions must be hidden when online services are unavailable");
assert(gate.includes('anchor.classList.contains("menu-exit-link")'),"desktop Exit links must remain under the delivery boundary");
assert(gate.includes('headerQuit&&menuVisible'),"title-screen QUIT must remain under the desktop delivery boundary");

assert(audio.includes('window.__CCG_ALLOW_REMOTE_MEDIA__===true'),"remote admin media must require explicit opt-in");
assert(!audio.includes('return !(automated||local)'),"remote media must not revert to default-on browser detection");
assert(audio.includes('remote-media-disabled'),"remote-media skip state must remain explicit");

const recoveryRows=recovery.split(/\r?\n/).filter(line=>/^\|\s*\d+\s*\|/.test(line));
assert(recoveryRows.length===16,`recovery manifest must contain exactly 16 enabled/disabled pairs; found ${recoveryRows.length}`);
assert(recovery.includes("Enabled objects: **16**"),"recovery manifest must preserve the enabled object count");
assert(recovery.includes("Enabled bytes: **72,233,137**"),"recovery manifest must preserve the enabled byte total");
assert(recovery.includes("Cryptographic equality: **NOT YET VERIFIED**"),"manifest must not imply hash equality before recovery");
assert(recovery.includes("SIZE MATCH ONLY"),"manifest must distinguish byte-size pairing from cryptographic proof");

assert(inventory.includes("Do not delete Supabase files or database rows"),"migration inventory must retain the no-delete safety rule");
assert(inventory.includes("SUPABASE-STORAGE-RECOVERY-MANIFEST.md"),"migration inventory must point to the frozen recovery manifest");
assert(inventory.includes("offline game first; online enhancements second"),"downloadable-build architecture rule must remain documented");

console.log("Lost Sizzler Supabase containment contract: PASS");
