/* The Lost Sizzler V10.41 — wandering merchant encounter hardening.
 *
 * A rare merchant must be an encounter, not a hidden sixty-second timer.
 * The original V10.15 event is retained, but its departure clock is protected
 * until players actually see the merchant. Once encountered, only cumulative
 * visible time counts toward departure and the merchant never vanishes while
 * the shop is open.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_WANDERING_MERCHANT_HARDENING__)return;
  window.__CCG_LOST_SIZZLER_V141_WANDERING_MERCHANT_HARDENING__=true;

  const MIN_VISIBLE_MS=90000;
  const WARNING_REMAINING_MS=30000;
  const DEPART_GRACE_MS=8000;
  const VISIBILITY_RADIUS=8;
  const PROTECTED_LIFE_MS=60*60*1000;
  const state={merchantId:"",encounters:0,repositions:0,warnings:0,lastTickAt:performance.now(),timer:0};

  function authoritative(){
    try{return typeof playMode==="undefined"||playMode!=="online"||typeof net==="undefined"||net?.isHost!==false}catch(_){return true}
  }
  function rareState(){return window.CCGLostSizzlerRareEvents?.state||null}
  function merchant(){const m=rareState()?.plans?.merchant;return m?.wanderingMerchant?m:null}
  function players(){
    try{if(typeof allPlayers==="function")return(allPlayers()||[]).filter(player=>player&&Number(player.health||1)>0)}catch(_){}
    const out=[];try{if(typeof p1!=="undefined"&&p1)out.push(p1);if(typeof p2!=="undefined"&&p2)out.push(p2);for(const player of remote?.values?.()||[])if(player)out.push(player)}catch(_){}return out
  }
  function distance(a,b){return Math.hypot(Number(a?.x||0)-Number(b?.x||0),Number(a?.y||0)-Number(b?.y||0))}
  function roomAt(x,y){
    try{if(window.CCGWorld?.roomAt)return window.CCGWorld.roomAt(world,x,y);if(typeof W!=="undefined"&&W?.roomAt)return W.roomAt(world,x,y)}catch(_){}return null
  }
  function sameRoomPlayer(m){return players().filter(player=>roomAt(player.x,player.y)===m.roomId).sort((a,b)=>distance(a,m)-distance(b,m))[0]||null}
  function visiblePlayer(m){return players().filter(player=>roomAt(player.x,player.y)===m.roomId&&distance(player,m)<=VISIBILITY_RADIUS).sort((a,b)=>distance(a,m)-distance(b,m))[0]||null}
  function walkable(x,y){
    try{if(window.CCGWorld?.walkable)return Boolean(window.CCGWorld.walkable(world.map,x,y,host));if(typeof W!=="undefined"&&W?.walkable)return Boolean(W.walkable(world.map,x,y,host))}catch(_){}return false
  }
  function occupied(m,x,y){
    try{
      if((host?.enemies||[]).some(item=>item?.alive&&item.x===x&&item.y===y))return true;
      if((host?.blockingDecor||[]).some(item=>item.x===x&&item.y===y))return true;
      if((host?.generators||[]).some(item=>item?.alive&&item.x===x&&item.y===y))return true;
      if((host?.chests||[]).some(item=>item?.active&&item.x===x&&item.y===y))return true;
      if((host?.items||[]).some(item=>item?.active&&item.x===x&&item.y===y))return true;
      if((host?.shops||[]).some(item=>item!==m&&item?.active&&item.x===x&&item.y===y))return true;
      if(players().some(player=>player.x===x&&player.y===y))return true;
    }catch(_){}return false
  }
  function encounterCell(m,player){
    let room=null;try{room=world?.rooms?.[m.roomId]||null}catch(_){}if(!room)return null;
    const cells=[];
    for(let y=room.y+1;y<=room.y+room.h-1;y++)for(let x=room.x+1;x<=room.x+room.w-1;x++){
      const d=Math.hypot(x-player.x,y-player.y);if(d<2.5||d>6.5||!walkable(x,y)||occupied(m,x,y))continue;
      try{if((host?.doors||[]).some(door=>Math.abs(Number(door.x)-x)+Math.abs(Number(door.y)-y)<=1))continue}catch(_){}
      cells.push({x,y,d});
    }
    cells.sort((a,b)=>Math.abs(a.d-4)-Math.abs(b.d-4)||a.y-b.y||a.x-b.x);return cells[0]||null
  }
  function shopOpenFor(m){
    try{if(typeof activeShop==="undefined"||!activeShop)return false;return activeShop===m||String(activeShop.id||"")===String(m.id||"")}catch(_){return false}
  }
  function announce(title,text,tone="cyan",duration=8500){try{if(typeof showToast==="function")showToast(title,text,tone,duration)}catch(_){} }
  function initialise(m){
    if(state.merchantId===String(m.id||""))return;
    state.merchantId=String(m.id||"");state.lastTickAt=performance.now();
    m._v141MerchantSeen=false;m._v141MerchantVisibleMs=0;m._v141MerchantWarned=false;m._v141MerchantDepartArmed=false;m._v141MerchantDepartCountdown=false;m._v141MerchantEncounterPositioned=false;
  }
  function protect(m){m.rareLifeMs=Math.max(Number(m.rareLifeMs||0),PROTECTED_LIFE_MS);m.rareMoveMs=Math.max(Number(m.rareMoveMs||0),PROTECTED_LIFE_MS)}
  function positionForEncounter(m){
    if(m._v141MerchantEncounterPositioned)return false;const player=sameRoomPlayer(m);if(!player)return false;
    m._v141MerchantEncounterPositioned=true;if(visiblePlayer(m))return false;const cell=encounterCell(m,player);if(!cell)return false;
    m.x=cell.x;m.y=cell.y;try{host.revision=(host.revision||0)+1}catch(_){}state.repositions++;return true
  }
  function beginEncounter(m){
    if(m._v141MerchantSeen)return false;const player=visiblePlayer(m);if(!player)return false;
    m._v141MerchantSeen=true;m._v141MerchantVisibleMs=0;m._v141MerchantDepartArmed=false;m._v141MerchantDepartCountdown=false;state.encounters++;
    announce("WANDERING MERCHANT","A travelling shopkeeper has come into view. He will stay while you browse and will give fair warning before packing up.","gold",9000);return true
  }
  function tick(now=performance.now()){
    const elapsed=Math.max(0,Math.min(250,Number(now)-Number(state.lastTickAt||now)));state.lastTickAt=Number(now)||performance.now();
    if(!authoritative())return false;const m=merchant();if(!m?.active)return false;initialise(m);

    /* The legacy event subtracts life from floor start. Neutralise that timer
     * until the player has had a real encounter. */
    if(!m._v141MerchantDepartArmed)protect(m);
    positionForEncounter(m);beginEncounter(m);

    const visible=Boolean(visiblePlayer(m));const browsing=shopOpenFor(m);
    if(m._v141MerchantSeen&&(visible||browsing)&&!m._v141MerchantDepartArmed)m._v141MerchantVisibleMs=Math.min(MIN_VISIBLE_MS,Number(m._v141MerchantVisibleMs||0)+elapsed);

    const remaining=Math.max(0,MIN_VISIBLE_MS-Number(m._v141MerchantVisibleMs||0));
    if(m._v141MerchantSeen&&!m._v141MerchantWarned&&remaining<=WARNING_REMAINING_MS){
      m._v141MerchantWarned=true;state.warnings++;announce("MERCHANT PACKING UP SOON","The wandering merchant is starting to pack. You still have about thirty seconds of encounter time before he moves on.","cyan",8500);
    }

    if(Number(m._v141MerchantVisibleMs||0)>=MIN_VISIBLE_MS)m._v141MerchantDepartArmed=true;
    if(m._v141MerchantDepartArmed){
      /* Never disappear under an open purchase panel. Closing the shop starts
       * one final grace period so the departure is visible and understandable. */
      m.rareMoveMs=PROTECTED_LIFE_MS;
      if(browsing){m.rareLifeMs=PROTECTED_LIFE_MS;m._v141MerchantDepartCountdown=false;return true}
      if(!m._v141MerchantDepartCountdown){m._v141MerchantDepartCountdown=true;m.rareLifeMs=DEPART_GRACE_MS;announce("MERCHANT CLOSING","Last call. The wandering merchant is leaving in a few seconds.","cyan",6500)}
      return true
    }

    /* Once found, the merchant holds position instead of strolling back out of
     * camera range while the player is trying to reach the shop. */
    if(m._v141MerchantSeen)m.rareMoveMs=PROTECTED_LIFE_MS;
    return true
  }

  state.timer=setInterval(()=>tick(),100);
  addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerV141WanderingMerchant={tick,positionForEncounter,beginEncounter,constants:{MIN_VISIBLE_MS,WARNING_REMAINING_MS,DEPART_GRACE_MS,VISIBILITY_RADIUS,PROTECTED_LIFE_MS},get state(){return state}};
})();