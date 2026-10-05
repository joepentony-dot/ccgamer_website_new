import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../..");
const source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/game-render.js"),"utf8");
const setup=source.slice(0,source.indexOf("const chestRenderDiagnostics"));
const routes=source.slice(source.indexOf("const PUNY_ENEMY_CELL="),source.indexOf("function drawEnemy(e)"));
const playlist=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/lost-sizzler-playlist-audio.js"),"utf8");
const admin=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/admin-audio-overrides.js"),"utf8");
const sockets=new Set();
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,"http://local").pathname,file=path.resolve(repo,"."+pathname);
  if(!file.startsWith(repo+path.sep)){res.writeHead(403).end();return}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return}res.writeHead(200,{"content-type":pathname.endsWith(".png")?"image/png":"text/plain","cache-control":"no-store"});res.end(data)});
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage"]});
try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
    const page=await browser.newPage({viewport});
    await page.goto(origin+"/arcade/lost-sizzler/version.json");
    await page.setContent('<meta name="ccg-lost-sizzler-cache" content="20261002r97"><style>body{margin:0;background:#09040f;color:#eddbb8;font:12px Georgia}canvas{image-rendering:pixelated;max-width:100%}</style><canvas id="proof" width="780" height="420"></canvas>');
    await page.addScriptTag({content:'const canvas=document.getElementById("proof"),ctx=canvas.getContext("2d"),P={red:"#f00",cyan:"#0ff"};function enemySpriteSeed(){return 0}\n'+setup+"\n"+routes});
    await page.waitForFunction(()=>Object.values(lostSizzlerPixelAssets).filter(x=>x instanceof Image).every(x=>x.complete));
    const result=await page.evaluate(()=>{
      const kinds=["spider","skeleton","knight","scout","hunter","ambusher","guard","charger","ranger","root","cook","firebreather","ghost"],rows=[];
      ctx.fillStyle="#09040f";ctx.fillRect(0,0,780,420);ctx.font="13px Georgia";ctx.textAlign="center";
      const labels={spider:"Dustweb Spider",skeleton:"Crypt Skeleton",knight:"Archive Knight",scout:"Vault Scout",hunter:"Relic Hunter",ambusher:"Shadow Ambusher",guard:"Iron Guard",charger:"Orc Reaver",ranger:"Rune Ranger",root:"Thorn Caster",cook:"Orc Scavenger",firebreather:"Ember Fiend",ghost:"Archive Wraith"};
      for(let i=0;i<kinds.length;i++){
        const kind=kinds[i],x=60+(i%6)*130,y=60+Math.floor(i/6)*130;
        const drawn=drawPunyEnemySprite({kind,facing:{x:1,y:0}},x,y)||drawAuthoredDungeonEnemySprite({kind,facing:{x:1,y:0}},x,y);
        const data=ctx.getImageData(x-30,y-40,60,65).data;let visible=0;
        for(let n=0;n<data.length;n+=4)if(data[n]>20||data[n+1]>12||data[n+2]>24)visible++;
        rows.push({kind,drawn,visible});ctx.fillStyle="#eddbb8";ctx.fillText(labels[kind],x,y+45);
      }
      return rows;
    });
    assert.equal(result.length,13);
    for(const row of result){assert.equal(row.drawn,true,row.kind+" must decode and draw authored art");assert.ok(row.visible>50,row.kind+" must contain visible sprite pixels");}
    console.log("R97_SPRITE_PROOF_"+viewport.width+"="+(await page.screenshot()).toString("base64"));
    await page.addScriptTag({content:`
      window.__CCG_ALLOW_REMOTE_TEST_ASSETS__=true;
      window.CCG_SUPABASE_URL="https://lcslgxpgmttaexsorxik.supabase.co";
      window.CCG_SUPABASE_ANON_KEY="test-anon-key";
      window.__musicInstances=[];
      window.Audio=class{constructor(url){this.url=url;this.paused=true;this.currentTime=0;this.duration=180;this.loop=false;this.listeners={};window.__musicInstances.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}load(){}removeAttribute(){}addEventListener(name,fn){(this.listeners[name]||(this.listeners[name]=[])).push(fn)}};
      window.CCGSound={start:async()=>true,startMusic(){},stopMusic(){},isEnabled:()=>true};
      window.CCG_AUDIO_ASSETS={music:{playlists:{normal:["fallback.wav"]}}};
      window.fetch=()=>new Promise(resolve=>window.__finishAdminRest=resolve);
      window.ccgSupabase=undefined;
    `});
    await page.addScriptTag({content:admin});
    await page.waitForFunction(()=>typeof window.__finishAdminRest==="function");
    await page.addScriptTag({content:playlist});
    await page.evaluate(()=>CCGSound.start());
    await page.waitForTimeout(60);
    const pending=await page.evaluate(()=>({instances:__musicInstances.length,state:CCGLostSizzlerPlaylistAudio.getState()}));
    assert.equal(pending.instances,0,"production startup must not construct bundled placeholder music while uploaded admin audio is still resolving");
    assert.equal(pending.state.fallbackActive,false,"production startup must keep generated/bundled fallback silent while admin music is pending");
    assert.equal(pending.state.adminAudioPending,true,"playlist owner must report the unresolved production soundtrack handoff");
    await page.evaluate(()=>__finishAdminRest({ok:true,status:200,json:async()=>[{asset_group:"music",asset_key:"lostSizzlerExploration--01",public_url:"https://lcslgxpgmttaexsorxik.supabase.co/storage/v1/object/public/ccg-arcade-assets/music/lostSizzlerExploration/exploration-01.mp3",enabled:true,created_at:"2026-08-22T15:13:48Z",asset_meta:{playlist:true}}]}));
    await page.waitForFunction(()=>CCG_ADMIN_AUDIO_READY===true&&__musicInstances.length===1);
    const music=await page.evaluate(()=>({url:CCGLostSizzlerPlaylistAudio.getState().url,playing:__musicInstances.filter(x=>!x.paused).length,skipped:CCG_ADMIN_AUDIO.remoteMediaSkipped,pending:CCGLostSizzlerPlaylistAudio.getState().adminAudioPending,source:CCG_ADMIN_AUDIO.source}));
    assert.equal(music.skipped,false,"test must exercise real admin readiness rather than automation skip");
    assert.equal(music.pending,false,"uploaded soundtrack readiness must end the pending state");
    assert.equal(music.source,"rest","production soundtrack hydration must not depend on the supabase-js client");
    assert.ok(music.url.endsWith("/exploration-01.mp3"));
    assert.equal(music.playing,1);
    await page.close();
  }
  console.log("R97 real PNG decode/draw desktop/mobile and deferred admin soundtrack integration passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
