import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn"))&&Boolean(window.CCGLostSizzlerStage8NpcDialogue)&&window.CCGLostSizzlerStage13EncounterCompletion?.state?.installed===true,null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(run)&&Boolean(host)&&Boolean(p1)&&Boolean(world)&&window.CCGLostSizzlerStage8NpcDialogue?.soloDungeon?.()===true,null,{timeout:20000});

  const result=await page.evaluate(()=>{
    const director=window.CCGLostSizzlerStage8NpcDialogue,completion=window.CCGLostSizzlerStage13EncounterCompletion;
    const originalFloor=Number(run.floor||1),enemyArray=host.enemies,originalEnemies=enemyArray.slice();
    const originalScore=Number(score||0),originalRevision=Number(host.revision||0);
    enemyArray.length=0;
    let selected=null;
    try{
      for(let roomId=1;roomId<(world.rooms||[]).length;roomId++){
        const room=world.rooms[roomId];
        if(!director.directedEncounterEligible(room,roomId))continue;
        const cells=director.directedSpawnCells(room,p1,2);
        if(cells.length<2)continue;
        selected={roomId,room};break;
      }
      if(!selected)return{candidate:false,installed:completion?.state?.installed===true};
      const floor=10;
      run.floor=floor;
      const rewardBefore=Number(completion.state.rewardScore||0),clearsBefore=Number(completion.state.clears||0),pendingBefore=Number(completion.state.pendingKills||0),duplicateBefore=Number(completion.state.duplicateSuppressions||0);
      const spawnedOk=director.applyDirectedEncounter(p1,selected.roomId,selected.room);
      const enemies=enemyArray.filter(enemy=>enemy?.alive&&enemy?.levelDirectorEnemy&&String(enemy.id||"").startsWith(`stage12-${floor}-${selected.roomId}-`));
      const identities=enemies.map(enemy=>completion.encounterIdentity(enemy));
      if(enemies.length!==2)return{candidate:true,spawnedOk,enemyCount:enemies.length,identities};

      const scoreBeforeKills=Number(score||0),revisionBeforeKills=Number(host.revision||0);
      damageEnemy(enemies[0],999,"energy",p1);
      const afterFirst={
        firstAlive:Boolean(enemies[0].alive),secondAlive:Boolean(enemies[1].alive),score:Number(score||0),
        rewardScore:Number(completion.state.rewardScore||0),clears:Number(completion.state.clears||0),pending:Number(completion.state.pendingKills||0),
        roomCleared:Boolean(selected.room.stage13EncounterCleared)
      };
      damageEnemy(enemies[1],999,"energy",p1);
      const afterSecond={
        firstAlive:Boolean(enemies[0].alive),secondAlive:Boolean(enemies[1].alive),score:Number(score||0),
        rewardScore:Number(completion.state.rewardScore||0),clears:Number(completion.state.clears||0),pending:Number(completion.state.pendingKills||0),
        roomCleared:Boolean(selected.room.stage13EncounterCleared),roomReward:Number(selected.room.stage13EncounterReward||0),roomProfile:String(selected.room.stage13EncounterProfile||""),
        runClears:Number(run.stats?.stage13EncounterClears||0),runReward:Number(run.stats?.stage13EncounterReward||0),revision:Number(host.revision||0)
      };
      const duplicateResult=completion.onEnemyDefeated(enemies[1],p1),scoreAfterDuplicate=Number(score||0),duplicateAfter=Number(completion.state.duplicateSuppressions||0);
      return{
        candidate:true,installed:completion.state.installed===true,spawnedOk,enemyCount:enemies.length,identities,
        floor,roomId:selected.roomId,profile:director.levelProfile(floor).id,
        scoreBeforeKills,revisionBeforeKills,rewardBefore,clearsBefore,pendingBefore,duplicateBefore,
        afterFirst,afterSecond,duplicateResult,scoreAfterDuplicate,duplicateAfter,
        finalRewardDelta:Number(completion.state.rewardScore||0)-rewardBefore,
        finalClearDelta:Number(completion.state.clears||0)-clearsBefore,
        pendingDelta:Number(completion.state.pendingKills||0)-pendingBefore,
        mode:String(mode||""),controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""
      };
    }finally{
      run.floor=originalFloor;
      score=originalScore;
      host.revision=originalRevision;
      enemyArray.length=0;
      enemyArray.push(...originalEnemies);
    }
  });

  assert.equal(result.candidate,true,"Stage 13 qualification requires an ordinary room with two deterministic spawn cells");
  assert.equal(result.installed,true,"Stage 13 must be installed on the authoritative defeat transaction before Solo begins");
  assert.equal(result.spawnedOk,true,"Stage 12 must create the deep-floor directed encounter used by Stage 13");
  assert.equal(result.enemyCount,2,"Stage 13 qualification must exercise a two-enemy Lockdown Depths patrol");
  assert.ok(result.identities.every(identity=>identity?.key===`${result.floor}:${result.roomId}`),"both directed enemies must resolve to one stable Stage 13 encounter identity");
  assert.equal(result.profile,"lockdown-depths","floor 10 must use the maximum Stage 13 reward band");
  assert.equal(result.afterFirst.firstAlive,false,"the first directed enemy must die through the real damageEnemy transaction");
  assert.equal(result.afterFirst.secondAlive,true,"the second directed enemy must remain alive after the first kill");
  assert.equal(result.afterFirst.clears,result.clearsBefore,"the first kill must not complete a two-enemy directed encounter");
  assert.equal(result.afterFirst.rewardScore,result.rewardBefore,"the first kill must not award the completion bonus");
  assert.equal(result.afterFirst.roomCleared,false,"the room must remain uncleared while one directed enemy survives");
  assert.equal(result.afterSecond.firstAlive,false,"the first directed enemy must remain defeated");
  assert.equal(result.afterSecond.secondAlive,false,"the final directed enemy must die through the same authoritative damage transaction");
  assert.equal(result.finalClearDelta,1,"the final kill must complete the directed encounter exactly once");
  assert.equal(result.finalRewardDelta,100,"Lockdown Depths completion must award exactly 100 Stage 13 score");
  assert.equal(result.afterSecond.roomCleared,true,"the completed room must retain its Stage 13 clear diagnostic");
  assert.equal(result.afterSecond.roomReward,100,"the completed room must retain the bounded reward amount");
  assert.equal(result.afterSecond.roomProfile,"lockdown-depths","the completed room must retain its Level Director profile");
  assert.equal(result.afterSecond.runClears,1,"the Solo run must retain one Stage 13 encounter clear");
  assert.equal(result.afterSecond.runReward,100,"the Solo run must retain the Stage 13 reward total");
  assert.equal(result.pendingDelta,1,"only the non-final directed kill should be counted as pending");
  assert.equal(result.afterFirst.score-result.scoreBeforeKills,120,"the first kill must receive only its canonical enemy score");
  assert.equal(result.afterSecond.score-result.afterFirst.score,220,"the final kill must receive canonical enemy score plus the 100-point Stage 13 completion bonus");
  assert.ok(result.afterSecond.revision>=result.revisionBeforeKills+3,"two enemy deaths plus one completion transaction must advance host revision");
  assert.equal(result.duplicateResult,false,"replaying the completion handler for the same encounter must be rejected");
  assert.equal(result.scoreAfterDuplicate,result.afterSecond.score,"duplicate completion attempts must not award score again");
  assert.equal(result.duplicateAfter,result.duplicateBefore+1,"duplicate suppression must remain diagnosable");
  assert.equal(result.mode,"playing","Stage 13 completion must leave ordinary Solo play active");
  assert.equal(result.controller,"dungeon-solo","Stage 13 completion must retain the Solo Dungeon controller");
  assert.deepEqual(errors,[],`Stage 13 encounter-completion runtime qualification must not raise page errors: ${errors.join("\n")}`);
  console.log(`Stage 13 encounter-completion runtime qualification passed: ${JSON.stringify(result)}`);
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
