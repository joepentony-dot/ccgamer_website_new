import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const earlySource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-41-cache-guard.js'),'utf8');
const indexSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/index.html'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const guardStart=source.indexOf('function startReleaseReadyGuard()');
const bootStart=source.indexOf('async function boot()');
const guardInstall=source.indexOf('startReleaseReadyGuard();');
const zeroServerModule=source.indexOf('["v10-42-zero-server-release.js","CCGLostSizzlerV142ZeroServerRelease"]');
const finalStability=source.indexOf('["v10-42-r1-stability.js","CCGLostSizzlerV142R1Stability"]');
const readyCommit=source.indexOf('state.ready=true;stopReleaseReadyGuard();setReleaseReady(true)');

assert(guardStart>=0&&guardInstall>=0,'V10.42 bootstrap must install an authoritative release-ready guard.');
assert(guardInstall<bootStart,'Release-ready ownership must be established before ordered module startup can expose legacy readiness signals.');
assert(source.includes('if(state.ready)return;'),'Release-ready guard must keep readiness false until the authoritative V10.42 bootstrap is ready.');
assert(source.includes('document.body?.dataset?.releaseReady==="true"')&&source.includes('setReleaseReady(false);'),'Premature legacy releaseReady=true writes must be corrected to false.');
assert(source.includes('releaseReadyObserver.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["data-release-ready"]})'),'Guard must observe the release-ready attribute without adding a polling loop.');
assert(zeroServerModule>=0&&finalStability>=0&&zeroServerModule<finalStability,'Zero-server release authority must load before final V10.42 stability ownership.');
assert(readyCommit>zeroServerModule&&readyCommit>finalStability,'Bootstrap may publish releaseReady=true only after zero-server and final stability modules have loaded.');
assert(source.includes('function stopReleaseReadyGuard()')&&source.includes('releaseReadyObserver?.disconnect();'),'Successful startup and page teardown must be able to disconnect the bounded readiness observer.');
assert(!source.includes('setInterval('),'Release-ready ownership must not introduce a polling interval.');
assert(!source.includes('requestAnimationFrame('),'Release-ready ownership must not introduce another frame owner.');

const cacheGuardTag=indexSource.indexOf('<script src="js/v10-41-cache-guard.js');
const gameMainTag=indexSource.indexOf('<script src="js/game-main.js');
const versionCheckTag=indexSource.indexOf('<script src="js/version-check.js');
assert(cacheGuardTag>=0&&gameMainTag>=0&&versionCheckTag>=0&&cacheGuardTag<gameMainTag&&cacheGuardTag<versionCheckTag,'The startup cache guard must remain the first release-readiness owner ahead of game-main and version-check.');
assert(earlySource.includes('function startV142ReleaseGuard()')&&earlySource.includes('startV142ReleaseGuard();'),'The first static startup guard must install the V10.42 release hold synchronously.');
assert(earlySource.includes('if(document.body?.dataset?.releaseReady==="true")setV142ReleaseReady(false);'),'The first static guard must reject legacy releaseReady=true writes before the ordered V10.42 bootstrap exists.');
assert(earlySource.includes('v142ReleaseObserver.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["data-release-ready"]})'),'The early release hold must use a bounded MutationObserver rather than polling.');
assert(earlySource.includes('addEventListener("ccg:v142-ready",releaseV142Ready,{once:true})'),'Only the authoritative V10.42 ready event may release the first-startup gate.');
assert(earlySource.includes('bootstrap?.ready!==true')&&earlySource.includes('zeroServer?.enabled!==true')&&earlySource.includes('zeroServer?.onlineMultiplayer!==false'),'Early release must require both completed V10.42 bootstrap state and the zero-server production policy marker.');
assert(earlySource.includes('v142ReleaseObserver?.disconnect();'),'The early release observer must disconnect after authoritative release or page teardown.');
assert(!earlySource.includes('requestAnimationFrame('),'Early release ownership must not introduce another frame owner.');

console.log('Lost Sizzler V10.42 release-ready ownership contract passed.');
