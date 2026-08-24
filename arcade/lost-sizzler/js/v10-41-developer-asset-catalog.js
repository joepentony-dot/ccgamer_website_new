/* The Lost Sizzler V10.41 — owner-only Developer Vault special asset catalogue. */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_DEV_ASSET_CATALOG__)return;
  window.__CCG_LOST_SIZZLER_V141_DEV_ASSET_CATALOG__=true;

  const state={timer:0,serial:0,bound:false};
  const isDev=()=>Boolean(document.body?.dataset?.ccgDeveloperVault==="true"&&run?.developer===true&&host?.developerRoom?.ownerOnly===true);
  const room=()=>world?.rooms?.find(row=>Number(row?.id)===Number(host?.developerRoom?.roomId))||null;
  const md=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));

  async function verifyOwner(){
    if(!isDev())return false;
    try{
      const client=await window.ccgSupabase?.getClient?.();if(!client)return false;
      const session=await client.auth.getSession(),email=String(session?.data?.session?.user?.email||"").trim().toLowerCase();if(!email)return false;
      const config=await import("/admin/js/config.js"),owners=Array.isArray(config?.OWNER_EMAILS)?config.OWNER_EMAILS:[];
      return owners.some(owner=>String(owner||"").trim().toLowerCase()===email);
    }catch(_){return false}
  }

  function occupied(x,y){
    const groups=[host?.blockingDecor,host?.items,host?.enemies,host?.chests,host?.generators,host?.shrines,host?.shops,host?.deathCaches];
    for(const group of groups)if((group||[]).some(row=>row?.active!==false&&row?.alive!==false&&row.x===x&&row.y===y))return true;
    if(host?.gambler?.active&&host.gambler.x===x&&host.gambler.y===y)return true;
    if(host?.stalker?.active&&host.stalker.x===x&&host.stalker.y===y)return true;
    return false;
  }

  function freeCell(){
    const r=room();if(!r||!world?.map)return null;const out=[];
    for(let y=r.y+2;y<=r.y+r.h-2;y++)for(let x=r.x+2;x<=r.x+r.w-2;x++){
      if(world.map[y]?.[x]!==0||occupied(x,y)||(host?.doors||[]).some(d=>md(d,{x,y})<=1))continue;out.push({x,y});
    }
    const player=p1||{x:r.x,y:r.y};out.sort((a,b)=>md(a,player)-md(b,player)||a.y-b.y||a.x-b.x);return out[0]||null;
  }

  function touch(){host.revision=(host.revision||0)+1;try{sync?.()}catch(_){} }
  function toast(text){try{showToast("DEVELOPER VAULT",text,"cyan",3000)}catch(_){} }

  function spawnGildedElf(){
    const q=freeCell();if(!q)return false;
    const id=`dev-gilded-elf-${++state.serial}`;
    host.enemies.push({id,...q,x0:q.x,y0:q.y,kind:"scout",gildedElf:true,developerSpawn:true,developerRoomSpawn:true,hp:10,maxHp:10,armor:5,maxArmor:5,alive:true,aiState:"flee",facing:{x:1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:999999,attackCooldown:999999,chargeCooldown:999999,healCooldown:999999,flash:0,hpBarMs:0,lifeMs:30000,dropTimerMs:3000,moveTimerMs:450,lastHitGoldAt:-999999,hitCount:0,quipCooldownMs:0,maxRoamTiles:10,spawnFloor:run?.floor||1});touch();return true;
  }

  function spawnDeathStalker(){
    const q=freeCell();if(!q)return false;const id=`dev-death-stalker-${++state.serial}`,hp=10;
    const enemy={id,...q,x0:q.x,y0:q.y,kind:"ghost",hp,maxHp:hp,alive:true,aiState:"idle",facing:{x:-1,y:0},lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:999999,attackCooldown:999999,chargeCooldown:999999,healCooldown:999999,flash:0,hpBarMs:0,voidStalker:true,deathStalker:true,stalker:true,developerSpawn:true,developerRoomSpawn:true,developerPassive:true,permanentlyBanished:false};
    host.enemies.push(enemy);host.voidStalkers=Array.isArray(host.voidStalkers)?host.voidStalkers:[];host.voidStalkers.push(id);touch();return true;
  }

  function spawnCountLoadula(){
    const q=freeCell();if(!q)return false;const hp=Math.max(10,Number(C?.stalker?.banishHpBase||8)+Number(run?.floor||1)*2);
    host.stalker={id:`dev-count-loadula-${++state.serial}`,name:C?.stalker?.name||"Count Loadula",...q,x0:q.x,y0:q.y,active:true,seen:true,awake:true,moveCooldown:999999,stunMs:99999999,vulnerableMs:0,hp,maxHp:hp,spawnTimer:0,near:false,developerSpawn:true,developerRoomSpawn:true};touch();return true;
  }

  function spawnShop(hidden=false){
    const q=freeCell();if(!q)return false;host.shops=Array.isArray(host.shops)?host.shops:[];
    const shop={id:`dev-${hidden?"trader":"shop"}-${++state.serial}`,...q,roomId:room()?.id,active:true,cost:C?.stalker?.flaskArtefacts||3,shopType:hidden?"hidden":"entrance",title:hidden?"DEV SECRET ARTEFACT TRADER":"DEV SUPPLY DESK",scorePurchases:0,sold:{potion:false,bronze:false,torch:false,ammo:false,armour:false,weapon:false},developerSpawn:true,developerRoomSpawn:true};host.shops.push(shop);if(hidden)host.trader=shop;touch();return true;
  }

  function spawnDeathCache(){
    const q=freeCell();if(!q)return false;host.deathCaches=Array.isArray(host.deathCaches)?host.deathCaches:[];host.deathCaches.push({id:`dev-death-cache-${++state.serial}`,...q,active:true,ownerId:p1?.id||"P1",score:1000,xp:100,inventory:[],games:[],progressionItems:[],developerSpawn:true,developerRoomSpawn:true});touch();return true;
  }

  function spawnRegen(){
    const q=freeCell();if(!q)return false;host.sanctuaryRegeneration=Array.isArray(host.sanctuaryRegeneration)?host.sanctuaryRegeneration:[];host.sanctuaryRegeneration.push({id:`dev-sanctuary-regen-${++state.serial}`,...q,roomId:room()?.id,active:true,developerSpawn:true,developerRoomSpawn:true});touch();return true;
  }

  function spawnDoor(type="room"){
    const q=freeCell();if(!q)return false;host.doors=Array.isArray(host.doors)?host.doors:[];const id=`dev-door-${type}-${++state.serial}`;
    host.doors.push({id,groupId:id,leaf:0,span:1,...q,roomId:room()?.id,locked:type!=="room",type,hidden:type==="secret",cracked:type==="secret",orientation:"vertical",side:"wall",open:false,opening:false,openingStart:0,openAt:0,developerSpawn:true,developerRoomSpawn:true});touch();return true;
  }

  function spawnBanishmentFlask(){
    const q=freeCell();if(!q)return false;host.items.push({id:`dev-banishment-${++state.serial}`,...q,kind:"banishment",active:true,title:"BANISHMENT FLASK",developerSpawn:true,developerRoomSpawn:true});touch();return true;
  }

  function rebuildSanctuary(){
    const r=room();if(!r)return false;r.sanctuary=true;world.sanctuaryRooms=Array.isArray(world.sanctuaryRooms)?world.sanctuaryRooms:[];if(!world.sanctuaryRooms.includes(r.id))world.sanctuaryRooms.push(r.id);
    try{window.CCGLostSizzlerV141SanctuaryAzalea?.buildScenes?.();return true}catch(_){return false}
  }

  function clearExtras(){
    if(!host||!world)return;
    host.enemies=(host.enemies||[]).filter(row=>!row?.developerRoomSpawn);host.items=(host.items||[]).filter(row=>!row?.developerRoomSpawn);host.chests=(host.chests||[]).filter(row=>!row?.developerRoomSpawn);host.generators=(host.generators||[]).filter(row=>!row?.developerRoomSpawn);host.shrines=(host.shrines||[]).filter(row=>!row?.developerRoomSpawn);host.traps=(host.traps||[]).filter(row=>!row?.developerRoomSpawn);host.shops=(host.shops||[]).filter(row=>!row?.developerRoomSpawn);host.deathCaches=(host.deathCaches||[]).filter(row=>!row?.developerRoomSpawn);host.doors=(host.doors||[]).filter(row=>!row?.developerRoomSpawn);host.sanctuaryRegeneration=(host.sanctuaryRegeneration||[]).filter(row=>!row?.developerRoomSpawn);host.voidStalkers=(host.voidStalkers||[]).filter(id=>(host.enemies||[]).some(row=>row.id===id));
    if(host.stalker?.developerRoomSpawn)host.stalker=null;if(host.trader?.developerRoomSpawn)host.trader=null;touch();
  }

  function sectionHtml(){return `<section class="ccg-dev-section" data-dev-catalog><h3>SPECIAL ENCOUNTERS &amp; SYSTEM OBJECTS</h3><div class="ccg-dev-grid"><button data-catalog="all">SPAWN ALL SPECIALS</button><button data-catalog="gilded">GILDED ELF</button><button data-catalog="death-stalker">DEATH STALKER</button><button data-catalog="loadula">COUNT LOADULA</button><button data-catalog="flask">BANISHMENT FLASK</button><button data-catalog="shop">SUPPLY SHOP</button><button data-catalog="trader">SECRET TRADER</button><button data-catalog="cache">DEATH CACHE</button><button data-catalog="regen">HEALTH REGEN TILE</button><button data-catalog="sanctuary">SANCTUARY LAKE SCENE</button><button data-catalog="door">ROOM DOOR</button><button data-catalog="bronze-door">BRONZE DOOR</button><button data-catalog="secret-door">SECRET WALL</button></div><p style="margin:8px 0 0;color:#8e8398;font-size:9px">Developer-spawned encounters are disposable and are removed with CLEAR SPAWNED ASSETS.</p></section>`}

  async function runAction(action){
    if(!(await verifyOwner())){toast("Owner session check failed. Developer action refused.");return}
    let ok=false;
    if(action==="gilded")ok=spawnGildedElf();
    else if(action==="death-stalker")ok=spawnDeathStalker();
    else if(action==="loadula")ok=spawnCountLoadula();
    else if(action==="flask")ok=spawnBanishmentFlask();
    else if(action==="shop")ok=spawnShop(false);
    else if(action==="trader")ok=spawnShop(true);
    else if(action==="cache")ok=spawnDeathCache();
    else if(action==="regen")ok=spawnRegen();
    else if(action==="sanctuary")ok=rebuildSanctuary();
    else if(action==="door")ok=spawnDoor("room");
    else if(action==="bronze-door")ok=spawnDoor("bronze");
    else if(action==="secret-door")ok=spawnDoor("secret");
    else if(action==="all"){
      const gambler=document.querySelector("#ccg-dev-vault-panel [data-dev-action='gambler']");gambler?.click?.();
      const results=[spawnGildedElf(),spawnDeathStalker(),spawnCountLoadula(),spawnBanishmentFlask(),spawnShop(false),spawnShop(true),spawnDeathCache(),spawnRegen(),spawnDoor("room"),spawnDoor("bronze"),spawnDoor("secret"),rebuildSanctuary()];ok=results.some(Boolean);
    }
    toast(ok?`${String(action).replaceAll("-"," ").toUpperCase()} ready for testing.`:"No safe test tile is currently available.");
  }

  function bindPanel(panel){
    if(!panel||panel.dataset.devCatalogBound==="true")return;panel.dataset.devCatalogBound="true";
    const card=panel.querySelector(".ccg-dev-card");if(card&&!card.querySelector("[data-dev-catalog]"))card.insertAdjacentHTML("beforeend",sectionHtml());
    panel.addEventListener("click",event=>{
      const button=event.target?.closest?.("button");if(!button)return;
      if(button.dataset.catalog){event.preventDefault();event.stopPropagation();void runAction(button.dataset.catalog);return}
      if(button.dataset.devAction==="clear")setTimeout(clearExtras,0);
    });
  }

  function tick(){if(!isDev())return;bindPanel(document.getElementById("ccg-dev-vault-panel"))}
  state.timer=setInterval(tick,250);tick();
  window.addEventListener("pagehide",()=>clearInterval(state.timer),{once:true});
})();