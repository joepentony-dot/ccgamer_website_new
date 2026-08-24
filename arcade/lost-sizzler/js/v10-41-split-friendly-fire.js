/* The Lost Sizzler V10.41 — local split-screen melee friendly fire. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_SPLIT_FRIENDLY_FIRE__)return;
  window.__CCG_LOST_SIZZLER_V141_SPLIT_FRIENDLY_FIRE__=true;

  const state={wrapped:null,toastWrapped:false,sayWrapped:false,timer:0};
  const STARTER_MELEE={power:1,cooldown:390,colour:"#ffd85a",short:"SWORD"};

  function splitReady(){
    try{return Boolean(window.CCGLostSizzlerReleaseGate?.state?.ready&&window.__CCG_LOST_SIZZLER_MELEE_AMMO_V125__&&typeof firePlayer==="function"&&typeof hurtPlayer==="function")}catch(_){return false}
  }

  function directionFor(player,requested){
    const source=requested&&(requested.x||requested.y)?requested:player?.dir;
    const x=Math.sign(Number(source?.x||0)),y=Math.sign(Number(source?.y||0));
    return x||y?{x,y}:{x:1,y:0};
  }

  function meleeFor(player){return player?.meleeWeapon||STARTER_MELEE}
  function meleeDamage(player){
    const melee=meleeFor(player),mastery=Math.floor(Math.max(0,Number(player?.level||1)-1)/5),bonus=Math.floor(Number(player?.damageBonus||0)*.5);
    return Math.max(1,Number(melee.power||1)+mastery+bonus);
  }

  function adjacentOpponent(player,dir){
    if(!player||String(playMode)!=="split")return null;
    const targetX=Number(player.x)+dir.x,targetY=Number(player.y)+dir.y;
    const players=typeof localPlayers==="function"?localPlayers():[p1,p2].filter(Boolean);
    return players.find(other=>other&&other!==player&&Number(other.health||0)>0&&Number(other.x)===targetX&&Number(other.y)===targetY)||null;
  }

  function friendlyMelee(player,target,dir){
    if(!player||!target||String(playMode)!=="split"||String(mode)!=="playing"||(player.hitStunMs||0)>0)return false;
    const cooldown=player===p2?Number(fire2||0):Number(fire1||0);if(cooldown>0)return false;
    const melee=meleeFor(player),swingCooldown=Math.max(180,Number(melee.cooldown||390)),colour=String(melee.colour||"#ffd85a"),damage=meleeDamage(player);

    player.dir={...dir};
    player._meleeSwingAt=performance.now();
    player._meleeSwingMs=Math.max(220,Math.min(320,swingCooldown*.68));
    player._meleeSwingDir={...dir};
    player._meleeSwingColour=colour;
    if(player===p2)fire2=swingCooldown;else fire1=swingCooldown;
    player.emergencyRechargeMs=0;

    try{S?.sfx?.("dash")}catch(_){}
    try{ring?.(target.x,target.y,colour,25)}catch(_){}
    try{burst?.(target.x,target.y,colour,13,1)}catch(_){}
    try{floatText?.(target.x,target.y,`${String(melee.short||"SWORD").toUpperCase()} HIT!`,colour,{life:620})}catch(_){}

    hurtPlayer(target,damage,true,player.name||`Player ${player===p2?2:1}`,player.id);
    try{if(run)run.alert=Math.min(100,Number(run.alert||0)+.45)}catch(_){}
    try{sync?.()}catch(_){}
    return true;
  }

  function wrapFriendlyCopy(){
    if(!state.toastWrapped&&typeof showToast==="function"){
      const previous=showToast;
      showToast=function showToastV141FriendlyCopy(title,text,...rest){
        if(String(title)==="FRIENDLY FIRE")text=String(text||"").replace(" just shot a team-mate."," just hit a team-mate.");
        return previous.call(this,title,text,...rest);
      };
      state.toastWrapped=true;
    }
    if(!state.sayWrapped&&typeof say==="function"){
      const previous=say;
      say=function sayV141FriendlyCopy(text,...rest){
        if(String(text).includes("<strong>FRIENDLY FIRE.</strong> Try pointing the dangerous end elsewhere."))text="<strong>FRIENDLY FIRE.</strong> You hit your team-mate. Aim somewhere else.";
        return previous.call(this,text,...rest);
      };
      state.sayWrapped=true;
    }
  }

  function install(){
    if(!splitReady())return false;
    wrapFriendlyCopy();
    if(firePlayer?.__ccgV141SplitFriendlyFire)return true;
    const previous=firePlayer;
    const wrapped=function firePlayerV141SplitFriendlyFire(player,requested){
      if(String(playMode)==="split"&&player&&String(mode)==="playing"){
        const dir=directionFor(player,requested),target=adjacentOpponent(player,dir);
        if(target)return friendlyMelee(player,target,dir);
      }
      return previous.apply(this,arguments);
    };
    wrapped.__ccgV141SplitFriendlyFire=true;
    wrapped.__ccgPreviousFirePlayer=previous;
    firePlayer=wrapped;state.wrapped=wrapped;
    return true;
  }

  state.timer=setInterval(()=>{try{install()}catch(error){console.warn("[Lost Sizzler V10.41] split friendly-fire install failed safely",error)}},120);
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
})();
