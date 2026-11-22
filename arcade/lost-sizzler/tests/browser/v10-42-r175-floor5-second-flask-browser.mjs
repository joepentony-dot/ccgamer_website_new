import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
    const filename=path.resolve(repo,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!filename.startsWith(repo+path.sep)){res.writeHead(403).end('forbidden');return}
    fs.readFile(filename,(err,data)=>{res.writeHead(err?404:200,{'content-type':mime[path.extname(filename)]||'application/octet-stream','cache-control':'no-store',connection:'close'});res.end(err?'not found':data)});
  } catch(error){res.writeHead(500).end(String(error))}
});
server.on('connection',sock=>{sockets.add(sock);sock.on('close',()=>sockets.delete(sock))});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--disable-background-networking','--autoplay-policy=no-user-gesture-required']});

try {
  for(const config of [
    {device:'desktop',route:'/arcade/lost-sizzler/',order:['death','count'],mobile:false},
    {device:'mobile',route:'/arcade/c64-dungeon-carnage/',order:['count','death'],mobile:true}
  ]){
    const context=await browser.newContext({viewport:config.mobile?{width:390,height:844}:{width:1440,height:900},isMobile:config.mobile,hasTouch:config.mobile,serviceWorkers:'block'});
    await context.addInitScript(()=>{
      localStorage.setItem('ccg-lost-sizzler-tutorial-seen-v1','true');
      localStorage.setItem('ccg-lost-sizzler-tutorial-complete-v1','true');
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(String(error?.stack||error)));
    page.setDefaultTimeout(45000);
    await page.goto(origin+config.route,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true,null,{timeout:90000});
    await page.click('#solo-btn');
    await page.waitForFunction(()=>mode==='playing'&&Boolean(p1)&&Boolean(host)&&Boolean(world));
    const initial=await page.evaluate(({device})=>{
      beginRun({seed:'R175-SECOND-CHARGE-'+device});
      run.floor=5;run.deepest=5;run.modifier=null;
      startWorld(PGR.floorSeed(run),false,true,false);
      if(!host.stalker||host.stalker.id!=='count-loadula')throw new Error('Floor 5 Count missing');
      const death=host.enemies.find(e=>e.deathStalker&&e.voidStalker&&e.alive);
      if(!death)throw new Error('Floor 5 Death Stalker missing');
      if(!host.trader?.v142Alchemist)throw new Error('Floor 5 Alchemist missing');
      p1.health=p1.maxHealth=9999;p1.invuln=999999;p1.inventory=[];
      p1.inventorySlots=Math.max(4,Number(p1.inventorySlots)||0);
      p1.banishmentEssence=0;
      const generators=host.generators||[];
      if(generators.length<3)throw new Error('Floor 5 three-generator encounter missing');
      for(let i=0;i<3;i++){generators[i].alive=i===2;generators[i].v142EssenceAwarded=i<2}
      death.stunMs=999999;death.hitStunMs=999999;death.moveCooldown=999999;
      host.stalker.stunMs=999999;host.stalker.moveCooldown=999999;
      return {floor:run.floor,count:host.stalker.id,death:death.id,cost:window.CCGLostSizzlerV142ProceduralOverhaul.essenceCost(p1)};
    },{device:config.device});
    assert.equal(initial.floor,5);
    for(let step=0;step<2;step++){
      const targetName=config.order[step];
      const setup=await page.evaluate(({targetName})=>{
        const death=host.enemies.find(e=>e.deathStalker&&e.voidStalker);
        const actor=targetName==='death'?death:host.stalker;
        if(targetName==='count'){
          actor.awake=true;actor.spawnTimer=0;actor.stunMs=999999;
        }
        const candidate=[];
        for(let y=actor.y-4;y<=actor.y+4;y++)for(let x=actor.x-4;x<=actor.x+4;x++){
          if(Math.abs(x-actor.x)+Math.abs(y-actor.y)>6)continue;
          if(!W.playerWalkable(world.map,x,y,host)||SYS.inSanctuary(world,x,y))continue;
          if(!A.lineOfSight(world.map,{x,y},actor,8,host))continue;
          candidate.push({x,y});
        }
        for(const cell of candidate){
          p1.x=cell.x;p1.y=cell.y;p1.rx=cell.x;p1.ry=cell.y;
          const state=window.CCGLostSizzlerV142WardenPurposeOverhaul.state(p1);
          if(state.nearest===actor)break;
        }
        const selected=window.CCGLostSizzlerV142WardenPurposeOverhaul.state(p1).nearest;
        if(selected!==actor)throw new Error('Could not target '+targetName+' on Floor 5');
        const owner=window.CCGLostSizzlerV142ProceduralOverhaul;
        const cost=owner.essenceCost(p1);
        let awards=0;
        while(p1.banishmentEssence<cost&&awards<8){
          if(!owner.awardEssence(p1,1,'Floor 5 earned encounter Essence',{silent:true}))throw new Error('Second Essence award budget exhausted');
          awards++;
        }
        if(p1.banishmentEssence<cost)throw new Error('Not enough Essence to fund '+targetName+' charge');
        if(!openShop(host.trader,p1))throw new Error('Real Alchemist shop did not open');
        return {cost,awards,selected:actor.id,essence:p1.banishmentEssence,score};
      },{targetName});
      const shopButton=page.locator('#shop-items [data-shop-buy="banishment"]');
      await shopButton.waitFor({state:'visible'});
      await shopButton.click();
      const paid=await page.evaluate(()=>{
        const result={charges:PGR.inventoryKindCount(p1,'banishment'),essence:p1.banishmentEssence,score};
        closeShop();return result;
      });
      assert.equal(paid.charges,1,config.device+' second legitimate Alchemist purchase must place one charge');
      assert.equal(paid.essence,0,'One legitimate purchase consumes one Vessel cost');
      assert.equal(paid.score,setup.score,'Essence charge never spends score');
      if(config.mobile){
        // Capture the real touch-dock readiness before the gesture. A hidden
        // button is not equivalent to a failed second Ward-Break transaction.
        const dock=await page.evaluate(()=>{
          const root=document.getElementById('v104-touch-controls');
          const button=root?.querySelector('[data-action="banish"]');
          const notice=document.getElementById('ccg-mobile-pc-notice');
          return {
            mode:String(mode),runActive:document.body.dataset.runActive,
            bodyClass:document.body.className,menuHidden:document.getElementById('menu')?.classList.contains('hidden'),
            rootClass:root?.className,rootDisplay:root?getComputedStyle(root).display:null,
            enabled:window.CCGLostSizzlerV142R95MobileControls?.state?.active,
            installed:window.CCGLostSizzlerV142R95MobileControls?.state?.installed,
            touch:window.CCGLostSizzlerV142R95MobileControls?.touchCapable?.(),
            buttonLabel:button?.getAttribute('aria-label'),
            buttonRect:button?(()=>{const r=button.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}})():null,
            rootRect:root?(()=>{const r=root.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}})():null,
            areaRect:(()=>{const node=document.querySelector('.game-area');if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,overflow:getComputedStyle(node).overflow}})(),
            viewport:{w:innerWidth,h:innerHeight,scrollY:scrollY,visualHeight:visualViewport?.height||0},
            buttonVisibility:button?getComputedStyle(button).visibility:null,
            buttonDisplay:button?getComputedStyle(button).display:null,
            buttonCheckVisibility:button?.checkVisibility?.({checkVisibilityCSS:true})??false,
            ancestorChain:(()=>{const out=[];for(let node=button;node&&out.length<9;node=node.parentElement)out.push({tag:node.tagName,id:node.id,cls:String(node.className||'').slice(0,150),display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility,contentVisibility:getComputedStyle(node).contentVisibility});return out})(),
            activeOverlays:[...document.querySelectorAll('.game-area>.overlay:not(.hidden)')].map(node=>({id:node.id,cls:node.className,visibility:getComputedStyle(node).visibility})),
            charges:PGR.inventoryKindCount(p1,'banishment'),
            noticeVisible:notice?getComputedStyle(notice).display!=='none'&&!notice.classList.contains('hidden'):false
          };
        });
        console.log('R175 mobile Ward-Break touch dock:',JSON.stringify(dock));
        assert.equal(dock.runActive,'true','Real game must stay active after Alchemist shop closes');
        assert.equal(dock.menuHidden,true,'Real game menu must remain hidden before mobile Ward-Break');
        assert.equal(dock.touch,true,'Mobile fixture must have an active touch-capable device');
        assert.equal(dock.charges,1,'The second purchase must be owned before tapping');
        assert.equal(dock.enabled,true,'The real mobile input owner must activate its touch dock');
        assert.equal(dock.rootDisplay,'grid','The real touch dock must be physically visible');
        assert.ok(dock.buttonRect?.w>0&&dock.buttonRect?.h>0,'The mobile Banishment hit target must be visible');
        assert.match(dock.buttonLabel||'',/1 held/i,'The live Banishment control must display the paid charge');
        assert.equal(dock.buttonVisibility,'visible','The real Banishment button must be CSS-visible for the live mobile player');
        assert.equal(dock.buttonCheckVisibility,true,'The touch control must pass the browser effective visibility check');
        // Playwright's locator visibility may disagree with Chromium's live
        // DOM visibility during this fullscreen-style mobile layout. Do not
        // bypass the player-facing control or invoke gameplay functions.
        // Verify its centre is within the screen and hit-tests to the REAL
        // button, then send a real touchscreen gesture to those coordinates.
        const touchPoint=await page.evaluate(()=>{
          const button=document.querySelector('#v104-touch-controls [data-action="banish"]');
          if(!button)throw new Error('Mobile Banishment touch target missing');
          const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
          const hit=document.elementFromPoint(x,y);
          return {x,y,hitTag:hit?.tagName||'',hitAction:hit?.closest?.('[data-action]')?.dataset.action||'',
            hitText:hit?.textContent?.trim().slice(0,70)||'',isButtonOrChild:hit===button||button.contains(hit),
            inViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,
            buttonRect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}};
        });
        console.log('R175 real mobile physical touch hit-test:',JSON.stringify(touchPoint));
        assert.equal(touchPoint.inViewport,true,'Mobile Banishment must lie inside the actual phone viewport');
        assert.equal(touchPoint.isButtonOrChild,true,
          'A real finger must hit the Banishment button, not an obscuring overlay or clipped element');
        assert.equal(touchPoint.hitAction,'banish',
          'The actual hit-tested action must be Ward-Break');
        await page.touchscreen.tap(touchPoint.x,touchPoint.y);
      }else if(step===1){
        await page.keyboard.press('KeyB');
      }else{
        const ok=await page.evaluate(()=>{
          const api=window.CCGLostSizzlerV141R49GamepadInput;
          if(!api)throw new Error('Gamepad adapter missing');
          const buttons=Array.from({length:16},()=>({pressed:false,value:0}));
          buttons[6]={pressed:true,value:1};
          api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now());
          buttons[6]={pressed:false,value:0};
          api.processSnapshot(0,{connected:true,axes:[0,0],buttons},performance.now()+20);
          return true;
        });
        assert.equal(ok,true);
      }
      const after=await page.evaluate(({targetName})=>{
        const actor=targetName==='death'?host.enemies.find(e=>e.deathStalker&&e.voidStalker):host.stalker;
        return {broken:actor?.v142WardBroken===true,charges:PGR.inventoryKindCount(p1,'banishment'),score,wardsBroken:run.stats.wardsBroken||0,
          mobileButtonLabel:document.querySelector('#v104-touch-controls [data-action="banish"]')?.getAttribute('aria-label')||''};
      },{targetName});
      assert.equal(after.broken,true,config.device+' '+targetName+' B input should break second independent ward');
      assert.equal(after.charges,0,'Each B input consumes exactly one legitimate charge');
      if(config.mobile)assert.match(after.mobileButtonLabel,/none held/i,'The real mobile Banishment button must clear its charge count after use');
      assert.equal(after.score,setup.score,'Ward break alone must not grant score');
      assert.equal(after.wardsBroken,step+1,'Each distinct Warden breaks only once');
      console.log(JSON.stringify({device:config.device,step:step+1,target:targetName,shop:setup,paid,after}));
    }
    assert.deepEqual(errors,[],config.device+' browser errors: '+errors.join(' | '));
    await context.close();
  }
  console.log('PASS R175 real Floor 5 desktop gamepad/second keyboard and mobile touch two-Flask end-to-end transactions');
} finally {
  await browser.close().catch(()=>{});
  for(const sock of sockets)sock.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
