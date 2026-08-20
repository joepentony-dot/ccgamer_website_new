window.CCGSound=(()=>{
  "use strict";
  let ctx=null,master=null,musicGain=null,sfxGain=null,dangerGain=null,musicTimer=null,dangerTimer=null,step=0,enabled=true,started=false,danger=0;
  const melody=[262,0,330,392,0,330,294,0,262,330,0,440,392,330,294,0,220,0,262,330,0,294,262,0,196,247,0,294,330,294,247,0];
  const counter=[0,523,0,494,0,440,392,0,0,392,0,440,0,494,523,0];
  const bass=[131,131,98,98,110,110,98,98];

  function ensure(){
    if(ctx)return true;
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();musicGain=ctx.createGain();sfxGain=ctx.createGain();dangerGain=ctx.createGain();
      master.gain.value=.34;musicGain.gain.value=.08;sfxGain.gain.value=.46;dangerGain.gain.value=.08;
      musicGain.connect(master);dangerGain.connect(master);sfxGain.connect(master);master.connect(ctx.destination);return true;
    }catch(_){return false}
  }
  function tone(freq,dur=.07,type="square",vol=.12,slide=0,delay=0,target="sfx"){
    if(!enabled||!ensure()||!freq)return;
    const now=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,now);if(slide)o.frequency.linearRampToValueAtTime(Math.max(45,freq+slide),now+dur);
    g.gain.setValueAtTime(Math.max(.0001,vol),now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);
    o.connect(g).connect(target==="music"?musicGain:target==="danger"?dangerGain:sfxGain);o.start(now);o.stop(now+dur+.02);
  }
  function noise(dur=.06,vol=.06,target="sfx"){
    if(!enabled||!ensure())return;
    const frames=Math.max(1,Math.floor(ctx.sampleRate*dur)),b=ctx.createBuffer(1,frames,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<frames;i++)d[i]=(Math.random()*2-1)*(1-i/frames);
    const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.value=vol;s.connect(g).connect(target==="music"?musicGain:target==="danger"?dangerGain:sfxGain);s.start();
  }
  function musicTick(){
    if(!enabled||!ctx||ctx.state!=="running")return;
    const n=melody[step%melody.length];if(n)tone(n,.105,"square",.20,0,0,"music");
    if(step%4===0)tone(bass[Math.floor(step/4)%bass.length],.24,"triangle",.18,0,0,"music");
    const c=counter[step%counter.length];if(c&&step%2===1)tone(c,.05,"square",.05,-10,0,"music");
    if(step%8===4)noise(.018,.010,"music");step++;
  }
  function dangerTick(){
    if(!enabled||!ctx||ctx.state!=="running"||danger<=0)return;
    const v=.04+.055*danger;tone(78,.11,"square",v,12,0,"danger");tone(117,.07,"triangle",v*.7,-8,.16,"danger");
  }
  async function start(){
    if(!ensure())return false;try{await ctx.resume()}catch(_){}started=true;
    if(!musicTimer){step=0;musicTimer=setInterval(musicTick,170)}
    if(!dangerTimer)dangerTimer=setInterval(dangerTick,780);
    return true;
  }
  function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}if(dangerTimer){clearInterval(dangerTimer);dangerTimer=null}}
  function startMusic(){if(started){if(!musicTimer){step=0;musicTimer=setInterval(musicTick,170)}if(!dangerTimer)dangerTimer=setInterval(dangerTick,780)}}
  function setDanger(v){danger=Math.max(0,Math.min(1,Number(v)||0));if(dangerGain)dangerGain.gain.value=.045+.07*danger}
  function setMusicLevel(v){if(musicGain)musicGain.gain.value=Math.max(0,Math.min(.25,v))}

  function sfx(name){
    if(!enabled)return;
    const f={
      fire:()=>{tone(260,.045,"square",.13,260);tone(520,.025,"square",.05,-80,.025)},
      hit:()=>{tone(145,.045,"square",.14,-55);noise(.035,.045)},
      death:()=>{tone(180,.08,"sawtooth",.12,-115);tone(95,.12,"square",.10,-35,.045);noise(.08,.045)},
      elite:()=>{tone(220,.09,"square",.14,220);tone(440,.12,"square",.12,-120,.08)},
      hurt:()=>{tone(120,.13,"sawtooth",.15,-65);noise(.07,.055)},
      pickup:()=>{tone(480,.055,"square",.10,160);tone(720,.06,"square",.08,90,.045)},
      key:()=>{tone(440,.07,"square",.12,180);tone(660,.08,"square",.10,170,.06);tone(880,.09,"square",.08,0,.13)},
      dash:()=>{tone(190,.065,"sawtooth",.11,420);noise(.035,.025)},
      enemy:()=>tone(135,.065,"square",.055,45),
      alert:()=>{tone(520,.045,"square",.08,-90);tone(330,.05,"square",.06,70,.05)},
      search:()=>tone(220,.06,"triangle",.05,-45),
      food:()=>{tone(175,.08,"triangle",.08,55);tone(130,.07,"square",.05,-20,.045)},
      flame:()=>{noise(.17,.075);tone(105,.15,"sawtooth",.10,75);tone(180,.08,"triangle",.05,-35,.035)},
      wall:()=>tone(82,.025,"square",.035,-5),
      open:()=>{[330,440,660].forEach((n,i)=>tone(n,.13,"square",.09,70,i*.075))},
      heal:()=>{tone(330,.08,"sine",.08,120);tone(500,.10,"sine",.07,90,.055)},
      empty:()=>tone(82,.09,"square",.08,-20),
      respawn:()=>{tone(160,.1,"square",.10,180);tone(320,.12,"square",.09,220,.08)},
      win:()=>{[392,523,659,784].forEach((n,i)=>tone(n,.22,"square",.12,20,i*.11))},
      join:()=>{tone(330,.06,"square",.08,140);tone(550,.08,"square",.07,120,.05)},
      warp:()=>{tone(180,.12,"sine",.08,520);tone(560,.12,"triangle",.06,-260,.08)},
      campwarn:()=>{tone(760,.06,"square",.11,-200);tone(760,.06,"square",.11,-200,.16)},
      explosion:()=>{noise(.22,.11);tone(85,.20,"sawtooth",.12,-35)},
      lowhealth:()=>{tone(150,.07,"square",.07,0);tone(110,.07,"square",.055,0,.1)},
      cloak:()=>{tone(410,.09,"sine",.05,-160);noise(.05,.018)}
    }[name];if(f)f();
  }
  function toggle(){enabled=!enabled;if(enabled){start();startMusic()}else stopMusic();return enabled}
  function isEnabled(){return enabled}
  return{start,startMusic,stopMusic,sfx,toggle,isEnabled,setMusicLevel,setDanger};
})();
