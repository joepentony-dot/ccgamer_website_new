import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.resolve(here,"../browser/v10-41-r44-solo-cloud-save.mjs");
const tempPath=path.resolve(here,"../browser/.v10-41-r44-solo-cloud-save-deterministic.tmp.mjs");
const source=fs.readFileSync(sourcePath,"utf8");

const target=`  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:20000});
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.save_envelope),USER_A,{timeout:10000});`;
const replacement=`  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:20000});
  const observerState=await page.evaluate(async()=>{
    const r43=window.CCGLostSizzlerV141R43SoloSave,r44=window.CCGLostSizzlerV141R44SoloCloudSave,local=r43.readEnvelope(),fingerprint=r44.fingerprint(local);
    const deadline=performance.now()+5000;
    while(r44.state.syncPromise&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));
    r44.observeLocal();
    const result=await r44.reconcile();
    return{fingerprint,lastObservedFingerprint:r44.state.lastObservedFingerprint,result,status:r44.state.status,lastError:r44.state.lastError,writes:window.__r44Mock?.writes?.length||0};
  });
  assert.equal(observerState.lastObservedFingerprint,observerState.fingerprint,"r44 observer must own the real Floor 1 local autosave fingerprint before the cloud mirror assertion");
  assert.equal(observerState.result?.ok,true,`r44 deterministic Floor 1 reconcile must succeed: \${JSON.stringify(observerState)}`);
  assert.match(String(observerState.result?.action||""),/upload|already_synced/,`r44 Floor 1 reconcile must upload or confirm the authenticated cloud mirror: \${JSON.stringify(observerState)}`);
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.save_envelope),USER_A,{timeout:5000});`;

const matches=source.split(target).length-1;
assert.equal(matches,1,"the deterministic r44 harness must find exactly one Floor 1 cloud-mirror observer target");

fs.writeFileSync(tempPath,source.replace(target,replacement),"utf8");
try{
  await import(`${pathToFileURL(tempPath).href}?deterministic=${Date.now()}`);
}finally{
  try{fs.unlinkSync(tempPath);}catch(_){}
}
