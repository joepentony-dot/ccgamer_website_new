/* R51 world-light compositor. Presentation only. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_R51_WORLD_LIGHTING__)return;
  window.__CCG_LOST_SIZZLER_V141_R51_WORLD_LIGHTING__=true;
  const state={timer:0,installs:0};
  const activeGameplay=()=>document.body?.dataset?.runActive==="true";
  const performanceTier=()=>String(document.body?.dataset?.v141R47PerformanceTier||"normal");

  function clearInactive(){
    const canvas=document.getElementById("game"),layer=document.getElementById("ccg-r51-world-lighting");
    if(canvas&&!activeGameplay())canvas.style.filter="";
    if(layer&&!activeGameplay())layer.style.opacity="0"
  }

  function install(){
    if(!activeGameplay()){clearInactive();return false}
    const wrap=document.querySelector(".canvas-wrap"),canvas=document.getElementById("game"),layer=document.getElementById("ccg-r51-world-lighting");if(!wrap||!canvas||!layer)return false;
    wrap.style.position="relative";wrap.style.overflow="hidden";
    canvas.style.filter=performanceTier()==="normal"?"saturate(1.13) contrast(1.055) brightness(.985)":"";
    if(layer.dataset.r51LightingStyled!=="true"){
      layer.dataset.r51LightingStyled="true";
      layer.style.cssText="position:absolute;inset:0;z-index:1;pointer-events:none;--r51-light-x:50%;--r51-light-y:50%;--r51-ambient-rgb:142,92,255;background:radial-gradient(circle at var(--r51-light-x) var(--r51-light-y),rgba(255,226,148,.095) 0,rgba(var(--r51-ambient-rgb),.055) 18%,transparent 42%),linear-gradient(180deg,rgba(var(--r51-ambient-rgb),.035),transparent 38%,rgba(0,0,0,.07));box-shadow:inset 0 0 58px rgba(0,0,0,.38);mix-blend-mode:normal;opacity:.78;transition:opacity .2s ease";
      state.installs++
    }
    layer.style.opacity=performanceTier()==="severe"?"0":layer.classList.contains("r51-torch-live")?".90":".74";return true
  }
  function tick(){activeGameplay()?install():clearInactive()}
  tick();state.timer=setInterval(tick,900);addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  document.body.dataset.v141R51Lighting="true";window.CCGLostSizzlerV141R51WorldLighting={install,get state(){return state}};
})();
