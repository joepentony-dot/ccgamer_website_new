/* C64 Dungeon Carnage V10.42 Stage 7 — NPC / merchant integration.
 * Connects the established R15 NPC state to the already-authoritative dungeon
 * shop/economy path. This layer assigns merchant identity, dialogue and optional
 * quest/service hooks only; it does not price, charge, grant shop stock, advance
 * floors/portals, persist saves, or own combat/networking.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V142_STAGE7_NPC_MERCHANT__)return;
  window.__CCG_LOST_SIZZLER_V142_STAGE7_NPC_MERCHANT__=true;

  const SYS=window.CCGSystems,NPC=window.CCGLostSizzlerV142R15NpcExpansion;
  if(!SYS||typeof SYS.decorate!=="function"||!NPC)return;

  const state={installed:false,hosts:0,shopsBound:0,interactions:0,transactions:0};
  const MERCHANTS=Object.freeze({
    entrance:Object.freeze({npcId:"quartermaster_bex",service:"supply"}),
    hiddenOdd:Object.freeze({npcId:"collector_nix",service:"artefact"}),
    hiddenEven:Object.freeze({npcId:"archivist_orin",service:"research"})
  });

  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
  function contextFor(worldState,runState,shop){
    const room=worldState?.rooms?.[shop?.roomId]||null;
    return{
      biome:String(room?.v142Environment?.biome||room?.theme||""),
      theme:String(room?.theme||""),
      roomRole:String(room?.v142RoomGrammar?.role||room?.stage5TopologyRole||""),
      route:String(room?.stage5TopologyRole||room?.v142Environment?.routeMood||""),
      objective:String(runState?.objective||""),
      roomKey:`F${Math.max(1,Number(runState?.floor)||1)}:R${shop?.roomId??"?"}`
    };
  }
  function merchantSpec(shop,runState){
    if(shop?.shopType==="entrance")return MERCHANTS.entrance;
    const floor=Math.max(1,Number(runState?.floor)||1);
    return floor%2===0?MERCHANTS.hiddenEven:MERCHANTS.hiddenOdd;
  }
  function bindShop(worldState,runState,shop){
    if(!shop)return null;
    const spec=merchantSpec(shop,runState),npc=NPC.npcs?.[spec.npcId];
    if(!npc)return null;
    shop.stage7NpcId=spec.npcId;
    shop.stage7NpcName=npc.name;
    shop.stage7NpcRole=npc.role;
    shop.stage7Service=spec.service;
    shop.stage7Context=contextFor(worldState,runState,shop);
    state.shopsBound++;
    return shop;
  }
  function bindMerchants(worldState,hostState,runState){
    if(!hostState)return hostState;
    const shops=hostState.shops?.length?hostState.shops:[hostState.trader,hostState.startShop].filter(Boolean);
    for(const shop of shops)bindShop(worldState,runState,shop);
    hostState.v142NpcMerchants={
      version:"V10.42-stage7-r1",
      shops:shops.filter(Boolean).map(shop=>({
        id:shop.id,npcId:shop.stage7NpcId,npcName:shop.stage7NpcName,
        role:shop.stage7NpcRole,service:shop.stage7Service,roomId:shop.roomId
      }))
    };
    state.hosts++;
    return hostState;
  }
  function enterShop(shop,ctx={}){
    if(!shop?.stage7NpcId)return null;
    const context={...(shop.stage7Context||{}),...(ctx||{})};
    const talk=NPC.talk(shop.stage7NpcId,context);
    const offer=NPC.offerFor(shop.stage7NpcId,context);
    const quest=NPC.questSpec(shop.stage7NpcId,context);
    const interaction={
      npcId:shop.stage7NpcId,
      name:shop.stage7NpcName||talk?.name||"",
      role:shop.stage7NpcRole||talk?.role||"",
      service:shop.stage7Service||"",
      text:String(talk?.text||""),
      rumour:clone(talk?.rumour||null),
      offer:clone(offer||null),
      quest:clone(quest||null),
      sequence:talk?.sequence||0
    };
    shop.stage7Interaction=interaction;
    state.interactions++;
    return clone(interaction);
  }
  function describeShop(shop){
    const row=shop?.stage7Interaction;
    if(!row)return null;
    const quest=row.quest?` Optional job: ${String(row.quest.kind||"").replaceAll("-"," ")}.`:"";
    const offer=row.offer?.type?` Service: ${String(row.offer.type).replaceAll("-"," ")}.`:"";
    return{
      heading:`${shop.title||"DUNGEON SHOP"} — ${String(row.name||"MERCHANT").toUpperCase()}`,
      copy:`${row.text}${offer}${quest}`.trim(),
      npcId:row.npcId,
      npcName:row.name,
      role:row.role,
      service:row.service
    };
  }
  function noteTransaction(shop,itemId){
    if(!shop?.stage7NpcId)return null;
    shop.stage7Transactions=Math.max(0,Number(shop.stage7Transactions)||0)+1;
    state.transactions++;
    return{
      npcId:shop.stage7NpcId,
      shopId:shop.id,
      itemId:String(itemId||""),
      transactions:shop.stage7Transactions,
      service:shop.stage7Service||""
    };
  }

  const baseDecorate=SYS.decorate.bind(SYS);
  SYS.decorate=function decorateV142Stage7NpcMerchant(worldState,hostState,runState){
    const result=baseDecorate(worldState,hostState,runState);
    return bindMerchants(worldState,result||hostState,runState);
  };
  state.installed=true;

  window.CCGLostSizzlerV142Stage7NpcMerchant=Object.freeze({
    version:"V10.42-stage7-r1",state,MERCHANTS,contextFor,merchantSpec,
    bindShop,bindMerchants,enterShop,describeShop,noteTransaction
  });
})();
