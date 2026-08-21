/* The Lost Sizzler V10.5 — host-authoritative shared collectible effects. */
(function(){
  "use strict";
  if(window.__CCG_LOST_SIZZLER_ONLINE_EFFECTS_V105__)return;
  window.__CCG_LOST_SIZZLER_ONLINE_EFFECTS_V105__=true;

  const WORLD_EFFECTS=new Set(["secret_scan","tactical_freeze","time_slow"]);
  const norm=value=>String(value||"").toLowerCase().replace(/[’‘`]/g,"'").replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();

  function themeFor(title){return window.CCGLostSizzlerEffectsV105?.getGameTheme?.(title)||null}
  function selectedWorldRule(title){
    const api=window.CCGLostSizzlerEffectsV105;if(!api)return null;
    const rules=api.getRules?.()||[],key=norm(title),theme=api.getGameTheme?.(title),titles=rules.filter(rule=>rule?.enabled!==false&&rule.match_type==="title"&&norm(rule.match_value)===key);
    const titleWorld=titles.find(rule=>WORLD_EFFECTS.has(rule.effect_type));
    if(titleWorld)return titleWorld;
    if(titles.length)return null;
    for(const genre of theme?.genres||[]){const rule=rules.find(candidate=>candidate?.enabled!==false&&candidate.match_type==="genre"&&norm(candidate.match_value)===norm(genre)&&WORLD_EFFECTS.has(candidate.effect_type));if(rule)return rule}
    return null;
  }
  function revealHostSecrets(player,count=2){
    if(!net?.isHost||!player||!host?.doors)return 0;
    const doors=host.doors.filter(door=>door?.type==="secret"&&!door.open).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));let changed=0;
    for(const door of doors.slice(0,Math.max(1,Number(count||2)))){door.hidden=false;door.discovered=true;changed++}
    if(changed){host.revision=(host.revision||0)+1;broadcastWorld();showToast("TEAM SECRET SCAN",`${changed} hidden route${changed===1?"":"s"} revealed for the online room.`,"purple",6500)}
    return changed;
  }
  function slowHostDungeon(rule,title){
    if(!net?.isHost||!host)return;
    const duration=Math.max(1000,Number(rule?.duration_ms||6500)),scale=Math.max(.25,Math.min(1,Number(rule?.config?.enemy_time_scale||.55)));
    host._v105EnemySlowUntil=Math.max(Number(host._v105EnemySlowUntil||0),performance.now()+duration);
    host._v105EnemySlowScale=Math.min(Number(host._v105EnemySlowScale||1),scale);
    showToast(`${title} — TEAM TACTICAL EFFECT`,`Enemy movement and attacks slowed for the whole room for ${Math.ceil(duration/1000)} seconds.`,"purple",6500);
  }
  async function applyHostWorldEffects(title,collectorId){
    if(!net?.isHost||!title)return;
    try{await window.CCGLostSizzlerEffectsV105?.reload?.()}catch(_){}
    const player=(typeof remote!=="undefined"?remote.get(collectorId):null)||findLocal?.(collectorId)||p1;
    const theme=themeFor(title);
    if(theme?.genres?.some(genre=>norm(genre)==="horror")){
      try{await window.CCGLostSizzlerCollectibleEffects?.trigger?.(title,player)}catch(error){console.warn("Online horror effect could not be spawned by host",error)}
    }
    const rule=selectedWorldRule(title);if(!rule)return;
    if(rule.effect_type==="secret_scan")revealHostSecrets(player,Number(rule.config?.doors||2));
    else if(rule.effect_type==="tactical_freeze"||rule.effect_type==="time_slow")slowHostDungeon(rule,title);
  }

  if(typeof net!=="undefined"&&net?.cb){
    const originalPacket=net.cb.onPacket;
    net.cb.onPacket=function onPacketV105SharedEffects(event,payload){
      if(event==="v105_world_effect"){
        if(net.isHost)applyHostWorldEffects(String(payload?.title||""),String(payload?.collectorId||""));
        return;
      }
      return originalPacket?.(event,payload);
    };
  }

  if(typeof applyItem==="function"){
    const originalApplyItem=applyItem;
    applyItem=function applyItemV105OnlineAuthority(item,player){
      const result=originalApplyItem.apply(this,arguments);
      if(item?.kind==="game"&&player&&playMode==="online"&&net?.connected&&!net.isHost){
        const theme=themeFor(item.title),worldRule=selectedWorldRule(item.title),horror=theme?.genres?.some(genre=>norm(genre)==="horror");
        if(horror||worldRule)net.send("v105_world_effect",{title:String(item.title||""),collectorId:String(player.id||net.sessionId)});
      }
      return result;
    };
  }

  if(window.CCGAI?.stepEnemies){
    const originalStep=window.CCGAI.stepEnemies.bind(window.CCGAI);
    window.CCGAI.stepEnemies=function stepEnemiesV105OnlineSharedSlow(hostState,map,players,dt,hooks,worldState){
      let adjusted=Number(dt||0);
      if(net?.isHost&&Number(hostState?._v105EnemySlowUntil||0)>performance.now())adjusted*=Math.max(.25,Math.min(1,Number(hostState?._v105EnemySlowScale||.55)));
      else if(hostState){hostState._v105EnemySlowUntil=0;hostState._v105EnemySlowScale=1}
      return originalStep(hostState,map,players,adjusted,hooks,worldState);
    };
  }
})();
