import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

const choiceIds=choices=>choices.map(choice=>choice.id);

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[],failedScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-r23-rpg-build-focus=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142ProceduralOverhaul)&&Boolean(window.CCGLostSizzlerV142R23RpgBuildFocus)&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  const loadState=await page.evaluate(()=>({
    version:window.CCGLostSizzlerV142R23RpgBuildFocus?.version||"",
    wrapped:Boolean(window.CCGProgression?.skillChoices?.__ccgV142R23RpgBuildFocus),
    loaded:[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])]
  }));
  assert.equal(loadState.version,"V10.42-r23","Build-focus runtime must expose the r23 API.");
  assert.equal(loadState.wrapped,true,"Build-focus runtime must own the live skill-choice wrapper.");
  assert.ok(loadState.loaded.includes("v10-42-r23-rpg-build-focus.js"),"Ordered V10.42 bootstrap must load r23 before release-ready.");

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo",null,{timeout:20000});

  const baseline=await page.evaluate(()=>{
    p1.level=2;p1.skills=[];p1.rpgStats={might:5,vitality:5,agility:5,endurance:5,luck:5,arcana:5};
    const before={rpg:{...p1.rpgStats},skills:[...p1.skills]};
    const choices=window.CCGProgression.skillChoices(p1).map(choice=>({...choice}));
    return{before,after:{rpg:{...p1.rpgStats},skills:[...p1.skills]},choices};
  });
  assert.equal(baseline.choices.length,4,"Baseline RPG level-up must retain four choices.");
  assert.equal(new Set(choiceIds(baseline.choices)).size,4,"Baseline RPG level-up choices must remain distinct.");
  assert.ok(baseline.choices.every(choice=>/^v142-stat-(might|vitality|agility|endurance|luck|arcana)$/.test(choice.id)),"Baseline choices must remain inside the existing six-stat RPG.");
  assert.deepEqual(baseline.after,baseline.before,"Generating baseline choices must not mutate the player build.");

  const specialised=await page.evaluate(()=>{
    p1.level=3;p1.skills=["v142-stat-vitality","v142-stat-vitality"];p1.rpgStats={might:5,vitality:7,agility:5,endurance:5,luck:5,arcana:5};
    const before={rpg:{...p1.rpgStats},skills:[...p1.skills]};
    const choices=window.CCGProgression.skillChoices(p1).map(choice=>({...choice}));
    return{before,after:{rpg:{...p1.rpgStats},skills:[...p1.skills]},choices};
  });
  assert.equal(specialised.choices.length,4,"Specialised RPG level-up must still offer exactly four choices.");
  assert.equal(new Set(choiceIds(specialised.choices)).size,4,"Specialised RPG choices must remain distinct.");
  assert.ok(choiceIds(specialised.choices).includes("v142-stat-vitality"),"A leading Vitality build must keep Vitality represented in later dungeon level-up offers.");
  assert.deepEqual(specialised.after,specialised.before,"Build-focus choice planning must not mutate specialised stats or skill history.");

  const milestone=await page.evaluate(()=>{
    p1.level=5;p1.skills=["v142-stat-vitality","v142-stat-vitality","v142-stat-agility"];p1.rpgStats={might:5,vitality:7,agility:6,endurance:5,luck:5,arcana:5};
    const choices=window.CCGProgression.skillChoices(p1).map(choice=>({...choice}));
    return{choices,rpg:{...p1.rpgStats},skills:[...p1.skills]};
  });
  const milestoneIds=choiceIds(milestone.choices);
  const weakIds=["v142-stat-might","v142-stat-endurance","v142-stat-luck","v142-stat-arcana"];
  assert.equal(milestone.choices.length,4,"Milestone level-up must retain the established four-choice panel.");
  assert.equal(new Set(milestoneIds).size,4,"Milestone choices must remain distinct.");
  assert.ok(milestoneIds.includes("v142-stat-vitality"),"Milestone choices must retain the player's leading build attribute.");
  assert.ok(weakIds.some(id=>milestoneIds.includes(id)),"Milestone choices must include at least one weakest-stat pivot option.");
  assert.deepEqual(milestone.rpg,{might:5,vitality:7,agility:6,endurance:5,luck:5,arcana:5},"Milestone choice planning must not mutate RPG stats.");
  assert.deepEqual(milestone.skills,["v142-stat-vitality","v142-stat-vitality","v142-stat-agility"],"Milestone choice planning must not mutate skill history.");

  const isolation=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R23RpgBuildFocus;
    const player={level:5,rpgStats:{might:5,vitality:8,agility:6,endurance:5,luck:5,arcana:5}};
    const seed=[
      {id:"v142-stat-might",name:"MIGHT +1",desc:"seed"},
      {id:"v142-stat-agility",name:"AGILITY +1",desc:"seed"},
      {id:"v142-stat-endurance",name:"ENDURANCE +1",desc:"seed"},
      {id:"v142-stat-luck",name:"LUCK +1",desc:"seed"}
    ];
    return{
      seed:seed.map(choice=>choice.id),
      horde:api.planChoices(player,seed,"horde-survivor").map(choice=>choice.id),
      spy:api.planChoices(player,seed,"sizzler-saboteurs").map(choice=>choice.id),
      dungeon:api.planChoices(player,seed,"dungeon-solo").map(choice=>choice.id)
    };
  });
  assert.deepEqual(isolation.horde,isolation.seed,"Horde Survivor choices must remain outside dungeon RPG build-focus ownership.");
  assert.deepEqual(isolation.spy,isolation.seed,"Sizzler Saboteurs choices must remain outside dungeon RPG build-focus ownership.");
  assert.equal(isolation.dungeon.length,4,"Dungeon build focus must preserve a four-choice plan.");
  assert.equal(new Set(isolation.dungeon).size,4,"Dungeon build-focus plan must remain distinct.");
  assert.ok(isolation.dungeon.includes("v142-stat-vitality"),"Dungeon build-focus planning must inject the leading attribute when the seed offer omits it.");

  assert.deepEqual(errors,[],`R23 RPG build-focus qualification must not raise page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`R23 RPG build-focus qualification must not lose same-origin scripts: ${failedScripts.join("\n")}`);

  await page.evaluate(()=>{try{window.CCGProgression?.clearCheckpoint?.()}catch(_){}});
  console.log("V10.42 r23 RPG build-focus qualification passed: baseline 4-choice behavior, specialisation continuity, milestone pivoting and special-mode isolation.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
