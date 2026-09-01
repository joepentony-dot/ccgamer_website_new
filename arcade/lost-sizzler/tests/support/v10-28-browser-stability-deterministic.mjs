import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.resolve(here,"../v10-28-browser-stability.mjs");
const tempPath=path.resolve(here,"../.v10-28-browser-stability-deterministic.tmp.mjs");
const source=fs.readFileSync(sourcePath,"utf8");

const target=`    const state=await newGamePage();
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;
const replacement=`    const state=await newGamePage();
    await state.page.route("**/arcade/lost-sizzler/js/v10-35-quality.js*",async route=>{
      await new Promise(resolve=>setTimeout(resolve,700));
      await route.continue();
    });
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;

const matches=source.split(target).length-1;
assert.equal(matches,1,"the deterministic browser harness must find exactly one immediate-Solo navigation target");

fs.writeFileSync(tempPath,source.replace(target,replacement),"utf8");
try{
  await import(`${pathToFileURL(tempPath).href}?deterministic=${Date.now()}`);
}finally{
  try{fs.unlinkSync(tempPath);}catch(_){}
}
