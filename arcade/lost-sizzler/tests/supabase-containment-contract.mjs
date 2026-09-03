import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(`Containment contract failed: ${message}`)};

const index=read("arcade/lost-sizzler/index.html");
const gate=read("arcade/lost-sizzler/js/online-services-gate.js");
const weeklyPresentation=read("arcade/lost-sizzler/js/v10-6-menu-runtime-fix.js");
const audio=read("arcade/lost-sizzler/js/admin-audio-overrides.js");
const inventory=read("arcade/lost-sizzler/SUPABASE-MIGRATION-INVENTORY.md");
const recovery=read("arcade/lost-sizzler/SUPABASE-STORAGE-RECOVERY-MANIFEST.md");
const persistence=read("arcade/lost-sizzler/DESKTOP-PERSISTENCE-INVENTORY.md");

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
assert(gate.includes('let bridge=window.ccgSupabase;'),"online activation must accept an already-injected service bridge");
assert(gate.includes('if(!bridge?.getClient){'),"online scripts must be a fallback rather than replacing an injected bridge");
assert(gate.includes('Boolean(window.ccgSupabase?.getClient||sources)'),"desktop online UI must recognise an injected service bridge as configured");
assert(gate.includes('proto.getSupabase=async function()'),"multiplayer must remain routed through the central online-services gate");
assert(gate.includes('gate.activate("multiplayer-network")'),"multiplayer bridge must activate online services explicitly");
assert(gate.includes('button.dataset.ccgOnlineUnavailable'),"unavailable desktop online controls must be marked and disabled");
assert(gate.includes('roomCode.disabled=true'),"desktop room-code input must be disabled when online services are unavailable");
assert(gate.includes('authActions.hidden=true'),"desktop account actions must retain the semantic hidden state when online services are unavailable");
assert(gate.includes('authActions.classList.add("hidden")'),"desktop account actions must also use the site hidden class so author CSS cannot expose them");
assert(gate.includes('howto.classList.add("hidden")'),"desktop offline multiplayer instructions must use the site hidden class as well as the hidden attribute");
assert(gate.includes('new MutationObserver(()=>{if(needsReassertion())schedule()})'),"desktop unavailable controls must remain guarded against later renderer mutations");
assert(gate.includes('window.addEventListener("ccg:auth-changed",scheduleSettled)'),"desktop unavailable state must be reasserted after asynchronous auth refreshes");
assert(gate.includes('anchor.classList.contains("menu-exit-link")'),"desktop Exit links must remain under the delivery boundary");
assert(gate.includes('headerQuit&&menuVisible'),"title-screen QUIT must remain under the desktop delivery boundary");

assert(weeklyPresentation.includes('node?.dataset?.ccgOnlineUnavailable==="true"'),"Weekly presentation must recognise the delivery gate unavailable marker");
assert(weeklyPresentation.includes('const next=deliveryUnavailable(node)||Boolean(value)'),"Weekly presentation must not re-enable a delivery-disabled Weekly control");
assert(weeklyPresentation.includes('if(deliveryUnavailable(b))return;'),"Weekly presentation and unranked launch paths must yield to the desktop delivery gate");

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

for(const key of [
  "ccg-lost-sizzler-solo-save-v2",
  "ccg-lost-sizzler-solo-save-v2-backup",
  "ccg-lost-sizzler-achievements-v1",
  "ccg-quest-collection",
  "ccg-named-enemy-dossier-v1"
])assert(persistence.includes(`\`${key}\``),`desktop persistence inventory must retain Tier A key ${key}`);
assert(persistence.includes("Any loss of Tier A state is a **release blocker**"),"desktop update persistence must remain a release gate");
assert(persistence.includes("ccg-lost-sizzler-solo-cloud-sync-v1"),"desktop-online persistence must document cloud reconciliation metadata");
assert(persistence.includes("ccg-weekly-pending-result-v1"),"desktop-online persistence must preserve pending Weekly submissions");
assert(persistence.includes("sessionStorage: ccg-weekly-ghost-preview"),"disposable Weekly session cache must remain distinguished from persistent state");

console.log("Lost Sizzler Supabase containment contract: PASS");
