window.CCGSound=(()=>{
  "use strict";
  const C=window.CCG_CONFIG,ASSETS=window.CCG_AUDIO_ASSETS||{sfx:{},music:{}};
  let ctx=null,master=null,musicGain=null,sfxGain=null,dangerGain=null,stalkerGain=null,musicTimer=null,dangerTimer=null,stalkerTimer=null,step=0,enabled=true,started=false,danger=0,stalkerNear=false,stalkerSight=false,stalkerStep=0,roomMood="normal",musicLevel=.075,musicAsset=null,musicAssetState="",namedEnemy="",namedLockUntil=0;
  const activeSfx=new Set(),useMusicAssets=Boolean(ASSETS.music&&ASSETS.music.normal);
  const melody=[262,0,330,392,0,330,294,0,262,330,0,440,392,330,294,0,220,0,262,330,0,294,262,0,196,247,0,294,330,294,247,0];
  const counter=[0,523,0,494,0,440,392,0,0,392,0,440,0,494,523,0];
  const bass=[131,131,98,98,110,110,98,98];
  const stalkerNotes=[55,0,58,0,52,0,46,0,55,55,0,41,0,49,0,37];
  const dangerMelody=[147,0,156,147,0,131,0,123,147,0,175,156,147,131,0,110];
  const namedMelody=[196,247,294,330,0,294,392,330,247,0,440,392,330,294,247,0];
  const sanctuaryMelody=[262,330,392,0,330,392,523,0,392,330,294,0,262,330,392,0];
  function namedMusicKey(){const f=(C.followerElites||[]).find(x=>x.name===namedEnemy);return f?.musicKey||String(namedEnemy||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
  function musicUrlFor(state){
    const admin=window.CCG_ADMIN_AUDIO||{};
    if(state==="stalker")return admin.stalker||C.adminAudio?.stalker||ASSETS.music?.stalker;
    if(state==="danger")return admin.dangerRoom||C.adminAudio?.dangerRoom||ASSETS.music?.danger;
    if(state==="sanctuary")return admin.sanctuary||C.adminAudio?.sanctuary||ASSETS.music?.sanctuary;
    if(state==="named"){const key=namedMusicKey();return admin.namedEnemies?.[key]||C.adminAudio?.namedEnemies?.[key]||ASSETS.music?.namedEnemies?.[key]||admin.namedEnemy||ASSETS.music?.named}
    if(ASSETS.music?.rooms?.[state])return ASSETS.music.rooms[state];
    return admin.exploration||ASSETS.music?.normal;
  }
  function desiredMusicState(){return stalkerNear?"stalker":roomMood}
  function syncAssetMusic(){
    if(!useMusicAssets||!enabled||!started)return;const state=desiredMusicState(),url=musicUrlFor(state);if(!url)return;const identity=state==="named"?`named:${namedMusicKey()||"generic"}`:state;
    if(musicAsset&&musicAssetState===identity&&!musicAsset.paused){musicAsset.volume=Math.max(0,Math.min(.55,state==="stalker"?musicLevel*(stalkerSight?3.7:2.2):state==="named"?musicLevel*1.45:state==="danger"?musicLevel*1.3:musicLevel));musicAsset.playbackRate=state==="stalker"&&stalkerSight ? .88 : 1;return}
    if(musicAsset){try{musicAsset.pause()}catch(_){}}
    const a=new Audio(url);a.loop=true;a.preload="auto";a.playbackRate=state==="stalker"&&stalkerSight ? .88 : 1;a.volume=Math.max(0,Math.min(.55,state==="stalker"?musicLevel*(stalkerSight?3.7:2.2):state==="named"?musicLevel*1.45:state==="danger"?musicLevel*1.3:musicLevel));musicAsset=a;musicAssetState=identity;a.play().catch(()=>{});
  }
  function playAssetSfx(name,fallback){
    const url=window.CCG_ADMIN_AUDIO?.sfx?.[name]||ASSETS.sfx?.[name];if(!url){if(fallback)fallback();return}
    try{const a=new Audio(url);a.preload="auto";a.volume=.7;activeSfx.add(a);const done=()=>activeSfx.delete(a);a.addEventListener("ended",done,{once:true});a.addEventListener("error",()=>{done();if(fallback)fallback()},{once:true});a.play().catch(()=>{done();if(fallback)fallback()})}catch(_){if(fallback)fallback()}
  }
  function ensure(){
    if(ctx)return true;
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();musicGain=ctx.createGain();sfxGain=ctx.createGain();dangerGain=ctx.createGain();stalkerGain=ctx.createGain();
      master.gain.value=.34;musicGain.gain.value=.08;sfxGain.gain.value=.46;dangerGain.gain.value=.08;stalkerGain.gain.value=0;
      musicGain.connect(master);dangerGain.connect(master);stalkerGain.connect(master);sfxGain.connect(master);master.connect(ctx.destination);return true;
    }catch(_){return false}
  }
  function tone(freq,dur=.07,type="square",vol=.12,slide=0,delay=0,target="sfx"){
    if(!enabled||!ensure()||!freq)return;const now=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.linearRampToValueAtTime(Math.max(30,freq+slide),now+dur);g.gain.setValueAtTime(Math.max(.0001,vol),now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);const bus=target==="music"?musicGain:target==="danger"?dangerGain:target==="stalker"?stalkerGain:sfxGain;o.connect(g).connect(bus);o.start(now);o.stop(now+dur+.03)
  }
  function noise(dur=.06,vol=.06,target="sfx"){
    if(!enabled||!ensure())return;const frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),b=ctx.createBuffer(1,frames,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<frames;i++)d[i]=(Math.random()*2-1)*(1-i/frames);const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=vol;const bus=target==="music"?musicGain:target==="danger"?dangerGain:target==="stalker"?stalkerGain:sfxGain;s.connect(g).connect(bus);s.start()
  }
  function musicTick(){
    if(!enabled||!ctx||ctx.state!=="running"||stalkerNear)return;
    if(roomMood==="named"){
      const n=namedMelody[step%namedMelody.length];if(n){tone(n,.10,"square",.15,18,0,"music");tone(n/2,.18,"sawtooth",.08,-5,.02,"music")}if(step%3===2)noise(.025,.016,"music");step++;return;
    }
    if(roomMood==="danger"){
      const n=dangerMelody[step%dangerMelody.length];if(n){tone(n,.13,"sawtooth",.13,-8,0,"music");if(step%2===0)tone(n/2,.20,"triangle",.10,0,.02,"music")}if(step%4===2)noise(.028,.014,"music");step++;return;
    }
    if(roomMood==="sanctuary"){
      const n=sanctuaryMelody[step%sanctuaryMelody.length];if(n)tone(n,.18,"triangle",.11,20,0,"music");if(step%8===0)tone(131,.35,"sine",.07,0,0,"music");step++;return;
    }
    const n=melody[step%melody.length];if(n)tone(n,.105,"square",.20,0,0,"music");if(step%4===0)tone(bass[Math.floor(step/4)%bass.length],.24,"triangle",.18,0,0,"music");const c=counter[step%counter.length];if(c&&step%2===1)tone(c,.05,"square",.05,-10,0,"music");if(step%8===4)noise(.018,.010,"music");step++
  }
  function dangerTick(){if(!enabled||!ctx||ctx.state!=="running"||danger<=0||stalkerNear)return;const v=.04+.055*danger;tone(78,.11,"square",v,12,0,"danger");tone(117,.07,"triangle",v*.7,-8,.16,"danger")}
  function stalkerTick(){
    if(!enabled||!ctx||ctx.state!=="running"||!stalkerNear)return;
    const admin=window.CCG_ADMIN_AUDIO?.stalker||C.adminAudio?.stalker;
    if(admin)return; // external track hook reserved for website admin integration.
    const n=stalkerNotes[stalkerStep++%stalkerNotes.length];if(n){tone(n,.42,"sawtooth",.20,-5,0,"stalker");tone(n*1.5,.24,"triangle",.08,-8,.08,"stalker")}
    if(stalkerStep%4===0)noise(.20,.024,"stalker");
  }
  async function start(){if(!ensure())return false;try{await ctx.resume()}catch(_){}started=true;if(useMusicAssets){syncAssetMusic()}else{if(!musicTimer){step=0;musicTimer=setInterval(musicTick,170)}if(!dangerTimer)dangerTimer=setInterval(dangerTick,780);if(!stalkerTimer)stalkerTimer=setInterval(stalkerTick,360)}return true}
  function stopMusic(){if(musicAsset){try{musicAsset.pause()}catch(_){}}if(musicTimer){clearInterval(musicTimer);musicTimer=null}if(dangerTimer){clearInterval(dangerTimer);dangerTimer=null}if(stalkerTimer){clearInterval(stalkerTimer);stalkerTimer=null}}
  function startMusic(){if(!started)return;if(useMusicAssets){syncAssetMusic();return}if(!musicTimer){step=0;musicTimer=setInterval(musicTick,170)}if(!dangerTimer)dangerTimer=setInterval(dangerTick,780);if(!stalkerTimer)stalkerTimer=setInterval(stalkerTick,360)}
  function setDanger(v){danger=Math.max(0,Math.min(1,Number(v)||0));if(dangerGain)dangerGain.gain.value=.045+.07*danger}
  function setRoomMood(v){const next=["normal","danger","sanctuary","named",...Object.keys(ASSETS.music?.rooms||{})].includes(v)?v:"normal";if(next===roomMood)return;roomMood=next;step=0;if(useMusicAssets)syncAssetMusic();else if(musicGain&&ctx)musicGain.gain.setTargetAtTime(next==="named"?.11:next==="danger"?.095:next==="sanctuary"?.065:.08,ctx.currentTime,.35)}
  function setNamedEnemy(name){const next=String(name||"");const now=performance.now();if(next===namedEnemy)return;if(next&&namedEnemy&&now<namedLockUntil)return;if(!next&&namedEnemy&&now<namedLockUntil)return;namedEnemy=next;if(next)namedLockUntil=now+2400;else namedLockUntil=0;if(roomMood==="named"&&useMusicAssets)syncAssetMusic()}
  function setMusicLevel(v){musicLevel=Math.max(0,Math.min(.25,v));if(useMusicAssets&&musicAsset)syncAssetMusic();else if(musicGain)musicGain.gain.value=musicLevel}
  function setStalkerNear(v){stalkerNear=Boolean(v);if(useMusicAssets){syncAssetMusic();return}if(!ensure())return;if(stalkerGain)stalkerGain.gain.setTargetAtTime(stalkerNear?.17:0,ctx.currentTime,.18);if(musicGain)musicGain.gain.setTargetAtTime(stalkerNear?.012:.08,ctx.currentTime,.22);if(dangerGain)dangerGain.gain.setTargetAtTime(stalkerNear?0:.045+.07*danger,ctx.currentTime,.18)}
  function setStalkerSight(v){const next=Boolean(v);if(next===stalkerSight)return;stalkerSight=next;if(useMusicAssets)syncAssetMusic();else if(stalkerGain&&ctx)stalkerGain.gain.setTargetAtTime(stalkerSight?.25:stalkerNear?.17:0,ctx.currentTime,.12)}
  function sfx(name){if(!enabled)return;const f={
    fire:()=>{tone(260,.045,"square",.13,260);tone(520,.025,"square",.05,-80,.025)},hit:()=>{tone(145,.045,"square",.14,-55);noise(.035,.045)},death:()=>{tone(180,.08,"sawtooth",.12,-115);tone(95,.12,"square",.10,-35,.045);noise(.08,.045)},elite:()=>{tone(220,.09,"square",.14,220);tone(440,.12,"square",.12,-120,.08)},hurt:()=>{tone(120,.13,"sawtooth",.15,-65);noise(.07,.055)},pickup:()=>{tone(480,.055,"square",.10,160);tone(720,.06,"square",.08,90,.045)},key:()=>{tone(440,.07,"square",.12,180);tone(660,.08,"square",.10,170,.06);tone(880,.09,"square",.08,0,.13)},mainKey:()=>{[440,554,660,880,1046].forEach((n,i)=>tone(n,.12,"square",.10,15,i*.09))},exitSigil:()=>{[392,523,659,784,1046,1318].forEach((n,i)=>tone(n,.2,"square",.12,20,i*.14));tone(196,.55,"triangle",.08,0,0)},playerDeath:()=>{tone(220,.16,"sawtooth",.16,-110);tone(130,.28,"square",.13,-75,.12);tone(82,.35,"sawtooth",.10,-35,.38);noise(.28,.055)},dash:()=>{tone(190,.065,"sawtooth",.11,420);noise(.035,.025)},enemy:()=>tone(135,.065,"square",.055,45),alert:()=>{tone(520,.045,"square",.08,-90);tone(330,.05,"square",.06,70,.05)},search:()=>tone(220,.06,"triangle",.05,-45),food:()=>{tone(175,.08,"triangle",.08,55);tone(130,.07,"square",.05,-20,.045)},flame:()=>{noise(.17,.075);tone(105,.15,"sawtooth",.10,75);tone(180,.08,"triangle",.05,-35,.035)},wall:()=>tone(82,.025,"square",.035,-5),open:()=>{[330,440,660].forEach((n,i)=>tone(n,.13,"square",.09,70,i*.075))},heal:()=>{tone(330,.08,"sine",.08,120);tone(500,.10,"sine",.07,90,.055)},empty:()=>tone(82,.09,"square",.08,-20),respawn:()=>{tone(160,.1,"square",.10,180);tone(320,.12,"square",.09,220,.08)},win:()=>{[392,523,659,784].forEach((n,i)=>tone(n,.22,"square",.12,20,i*.11))},join:()=>{tone(330,.06,"square",.08,140);tone(550,.08,"square",.07,120,.05)},warp:()=>{tone(180,.12,"sine",.08,520);tone(560,.12,"triangle",.06,-260,.08)},bronze:()=>{tone(310,.06,"square",.09,100);tone(510,.08,"triangle",.08,130,.05)},door:()=>{tone(110,.12,"square",.08,-20);tone(260,.12,"triangle",.07,120,.08)},chest:()=>{tone(92,.10,"square",.08,-20);noise(.09,.035);tone(260,.16,"triangle",.07,180,.08);tone(620,.12,"square",.05,120,.18)},dooropen:()=>{tone(92,.20,"sawtooth",.09,38);noise(.18,.055);tone(175,.12,"triangle",.06,70,.14)},locked:()=>{tone(82,.05,"square",.07,-5);tone(82,.05,"square",.05,-5,.08)},weapon:()=>{tone(350,.06,"square",.10,260);tone(700,.09,"square",.08,150,.05)},armour:()=>{tone(180,.08,"triangle",.08,80);tone(270,.11,"triangle",.07,40,.06)},potion:()=>{tone(520,.08,"sine",.08,-80);tone(690,.08,"sine",.06,90,.06)},torch:()=>{noise(.06,.025);tone(220,.12,"triangle",.06,100)},room:()=>{tone(260,.05,"triangle",.04,60);tone(390,.07,"triangle",.035,-40,.04)},campwarn:()=>{tone(760,.06,"square",.11,-200);tone(760,.06,"square",.11,-200,.16)},explosion:()=>{noise(.22,.11);tone(85,.20,"sawtooth",.12,-35)},lowhealth:()=>{tone(150,.07,"square",.07,0);tone(110,.07,"square",.055,0,.1)},cloak:()=>{tone(410,.09,"sine",.05,-160);noise(.05,.018)},level:()=>{[440,554,659,880].forEach((n,i)=>tone(n,.15,"square",.10,30,i*.08))},shrine:()=>{tone(220,.18,"sine",.06,220);tone(660,.20,"sine",.05,-100,.12)},stalker:()=>{tone(55,.35,"sawtooth",.18,-8);noise(.16,.035)},trap:()=>{tone(900,.04,"square",.08,-500);noise(.08,.06)},generator:()=>{tone(92,.18,"sawtooth",.09,30);tone(184,.12,"square",.05,-20,.08)},secret:()=>{tone(350,.08,"triangle",.08,180);tone(700,.12,"triangle",.06,120,.08)}
  }[name];playAssetSfx(name,f)}
  function toggle(){enabled=!enabled;if(enabled){start();startMusic()}else stopMusic();return enabled}
  return{start,startMusic,stopMusic,sfx,toggle,isEnabled:()=>enabled,setMusicLevel,setDanger,setStalkerNear,setStalkerSight,setRoomMood,setNamedEnemy};
})();
