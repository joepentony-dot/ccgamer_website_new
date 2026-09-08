import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
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

console.log('Lost Sizzler V10.42 release-ready ownership contract passed.');
