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
  const observedFloorOneSave=await page.evaluate(()=>window.CCGLostSizzlerV141R44SoloCloudSave.observeLocal());
  assert.equal(observedFloorOneSave,true,"r44 observer must detect the real Floor 1 local autosave before waiting for its asynchronous cloud mirror");
  await page.waitForFunction(user=>Boolean(window.__r44Mock?.rows?.[user]?.save_envelope),USER_A,{timeout:15000});`;

const matches=source.split(target).length-1;
assert.equal(matches,1,"the deterministic r44 harness must find exactly one Floor 1 cloud-mirror observer target");

fs.writeFileSync(tempPath,source.replace(target,replacement),"utf8");
try{
  await import(`${pathToFileURL(tempPath).href}?deterministic=${Date.now()}`);
}finally{
  try{fs.unlinkSync(tempPath);}catch(_){}
}
