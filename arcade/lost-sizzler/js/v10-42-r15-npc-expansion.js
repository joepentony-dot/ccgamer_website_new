/* The Lost Sizzler V10.42 r15 — deterministic local NPC expansion. */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R15NpcExpansion)return;

  const NPCS=Object.freeze({
    scout_mara:Object.freeze({id:"scout_mara",name:"Mara Venn",role:"scout",home:"threshold",hook:"alternate-route",lines:Object.freeze(["Keep an eye on the side doors. The safest route is rarely the richest.","Webbed stone usually means the spiders have sealed something worth reaching.","If a room feels too quiet, check the walls before you trust the doorway."])}),
    archivist_orin:Object.freeze({id:"archivist_orin",name:"Orin Vale",role:"archivist",home:"sanctuary",hook:"dossier",lines:Object.freeze(["Bring me marked relics and C64 dossiers. I can tell you what the dungeon has forgotten.","Some artefacts belong to a set. Finding one can change what the next is worth.","Old symbols repeat between floors. Record them; they are rarely decoration."])}),
    quartermaster_bex:Object.freeze({id:"quartermaster_bex",name:"Bex Harrow",role:"quartermaster",home:"sanctuary",hook:"equipment",lines:Object.freeze(["Pick a strength and build around it. Carrying three half-plans gets people buried.","Rare routes pay better, but only if you still have enough supplies to get back.","If your build is short on control, save your burst damage for elites."])}),
    collector_nix:Object.freeze({id:"collector_nix",name:"Nix Calder",role:"collector",home:"sanctuary",hook:"artefact",lines:Object.freeze(["I collect the pieces nobody else wants. They become interesting when the set is complete.","Crypt relics and Ember trinkets tell different stories. Do not sell both without checking the dossier.","A rare-room token is more useful as a clue than as scrap."])}),
    survivor_elin:Object.freeze({id:"survivor_elin",name:"Elin Rook",role:"rescued-survivor",home:"web",hook:"rescue",lines:Object.freeze(["Cut the anchors first. The thicker webs tighten when the nest is disturbed.","I heard bone scraping beyond the sealed arch. There is another way through.","Get me back to sanctuary and I will mark the route I used on your map notes."])}),
    crypt_keeper:Object.freeze({id:"crypt_keeper",name:"Keeper Senn",role:"specialist",home:"crypt",hook:"secret",lines:Object.freeze(["Break the bone totems before you wake everything in the room.","Some tomb doors answer to cleared chambers, not keys.","The dead guard shortcuts as fiercely as treasure."])}),
    ember_runner:Object.freeze({id:"ember_runner",name:"Tavi Flint",role:"specialist",home:"ember",hook:"hazard",lines:Object.freeze(["Smash Ember furniture from a distance when you can. The surge is short, not harmless.","Ash vents often expose alternate paths after a fight.","The hot route is faster. It is also less forgiving if your build lacks recovery."])}),
    weather_warden:Object.freeze({id:"weather_warden",name:"Warden Pell",role:"outdoor-guide",home:"outdoor",hook:"weather",lines:Object.freeze(["Rain masks footsteps but not silhouettes. Watch the edges of open ground.","Storm rooms change the safest approach. Use cover before you commit.","Outdoor paths can bypass a hard chamber, but they may cost supplies instead."])})
  });

  const state={npcs:Object.create(null),flags:Object.create(null),quests:Object.create(null),rumours:Object.create(null),sequence:0};
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function npcState(id){
    if(!NPCS[id])return null;
    return state.npcs[id]||(state.npcs[id]={met:false,talks:0,rescued:false,lastRoom:"",lastLine:-1});
  }
  function contextKey(ctx={}){return [ctx.biome||"",ctx.roomRole||"",ctx.route||"",ctx.objective||""].join("|")}
  function stableIndex(id,ctx,count){
    const text=`${id}|${contextKey(ctx)}|${npcState(id)?.talks||0}`;let hash=2166136261;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    return (hash>>>0)%Math.max(1,count);
  }
  function biomeTag(ctx={}){
    const value=String(ctx.biome||ctx.theme||"").toLowerCase();
    if(value.includes("spider")||value.includes("web"))return "web";
    if(value.includes("crypt")||value.includes("moss")||value.includes("bone"))return "crypt";
    if(value.includes("ember")||value.includes("cinder"))return "ember";
    if(value.includes("threshold")||value.includes("rain"))return "threshold";
    if(value.includes("outdoor")||value.includes("storm"))return "outdoor";
    return value||"sanctuary";
  }
  function listForRoom(ctx={}){
    const tag=biomeTag(ctx),role=String(ctx.roomRole||"").toLowerCase();
    const ids=[];
    if(role.includes("sanctuary")||tag==="sanctuary")ids.push("archivist_orin","quartermaster_bex","collector_nix");
    if(tag==="web")ids.push("survivor_elin");
    if(tag==="crypt")ids.push("crypt_keeper");
    if(tag==="ember")ids.push("ember_runner");
    if(tag==="outdoor"||role.includes("outdoor"))ids.push("weather_warden");
    if(tag==="threshold"||role.includes("rare")||String(ctx.route||"").includes("alternate"))ids.push("scout_mara");
    return [...new Set(ids)].map(id=>({...NPCS[id],state:clone(npcState(id))}));
  }
  function rumourFor(id,ctx={}){
    const npc=NPCS[id];if(!npc)return null;
    const key=`${id}:${contextKey(ctx)}`;
    if(!state.rumours[key])state.rumours[key]={revealed:false,token:`rumour:${key}`};
    const tag=biomeTag(ctx);
    const hints={web:"Web anchors can hide a safer line into the nest.",crypt:"Bone totems often guard doors, caches or a quieter return path.",ember:"Ember scenery can hurt both sides if you control the distance.",outdoor:"Weather changes sight-lines; cover can matter more than speed.",threshold:"A side route may trade safety for a stronger reward.",sanctuary:"Talk to specialists before committing rare loot to a build."};
    return {token:state.rumours[key].token,text:hints[tag]||"Rare rooms often announce themselves through unusual scenery.",revealed:state.rumours[key].revealed};
  }
  function talk(id,ctx={}){
    const npc=NPCS[id],ns=npcState(id);if(!npc||!ns)return null;
    const index=stableIndex(id,ctx,npc.lines.length);ns.met=true;ns.talks+=1;ns.lastRoom=String(ctx.roomKey||"");ns.lastLine=index;state.sequence+=1;
    const rumour=rumourFor(id,ctx);if(rumour&&!state.rumours[rumour.token.slice(7)]?.revealed){const key=rumour.token.slice(7);if(state.rumours[key])state.rumours[key].revealed=true}
    return {npcId:id,name:npc.name,role:npc.role,text:npc.lines[index],hook:npc.hook,rumour:{...rumour,revealed:true},sequence:state.sequence};
  }
  function rescue(id,ctx={}){
    const ns=npcState(id);if(!ns||NPCS[id].role!=="rescued-survivor")return {accepted:false,reason:"not-rescuable"};
    if(ns.rescued)return {accepted:false,reason:"already-rescued",token:`rescue:${id}`};
    ns.rescued=true;ns.met=true;ns.lastRoom=String(ctx.roomKey||"");state.flags[`rescued:${id}`]=true;state.sequence+=1;
    return {accepted:true,token:`rescue:${id}`,sanctuaryReturn:true,hook:"alternate-route-hint",sequence:state.sequence};
  }
  function questSpec(id,ctx={}){
    const npc=NPCS[id];if(!npc)return null;
    const specs={
      scout_mara:{kind:"discover-route",target:"alternate-route",rewardFocus:"dossier"},
      archivist_orin:{kind:"recover-record",target:"c64-dossier",rewardFocus:"artefact-lore"},
      quartermaster_bex:{kind:"prove-build",target:"elite-clear",rewardFocus:"equipment"},
      collector_nix:{kind:"complete-set",target:"artefact-set",rewardFocus:"rare-cache"},
      survivor_elin:{kind:"escort-intel",target:"sanctuary-return",rewardFocus:"secret-route"},
      crypt_keeper:{kind:"quiet-the-crypt",target:"bone-totems",rewardFocus:"reliquary"},
      ember_runner:{kind:"control-the-surge",target:"ember-hazard",rewardFocus:"supplies"},
      weather_warden:{kind:"weather-route",target:"outdoor-route",rewardFocus:"route-cache"}
    };
    const spec=specs[id];return spec?{id:`quest:${id}`,npcId:id,...spec,roomKey:String(ctx.roomKey||""),optional:true}:null;
  }
  function acceptQuest(id,ctx={}){
    const spec=questSpec(id,ctx);if(!spec)return {accepted:false,reason:"unknown-npc"};
    const existing=state.quests[spec.id];if(existing)return {accepted:false,reason:existing.completed?"completed":"already-active",quest:clone(existing)};
    state.quests[spec.id]={...spec,accepted:true,progress:0,completed:false,rewardClaimed:false};state.sequence+=1;
    return {accepted:true,quest:clone(state.quests[spec.id]),sequence:state.sequence};
  }
  function advanceQuest(id,amount=1){
    const key=id.startsWith("quest:")?id:`quest:${id}`,quest=state.quests[key];if(!quest||quest.completed)return {accepted:false,reason:quest?"completed":"missing"};
    quest.progress=Math.max(0,quest.progress+(Number.isFinite(amount)?Math.max(0,amount):0));if(quest.progress>=1)quest.completed=true;state.sequence+=1;
    return {accepted:true,quest:clone(quest),sequence:state.sequence};
  }
  function claimQuestReward(id){
    const key=id.startsWith("quest:")?id:`quest:${id}`,quest=state.quests[key];if(!quest||!quest.completed)return {accepted:false,reason:"incomplete"};
    if(quest.rewardClaimed)return {accepted:false,reason:"already-claimed",token:`reward:${key}`};
    quest.rewardClaimed=true;state.sequence+=1;return {accepted:true,token:`reward:${key}`,rewardFocus:quest.rewardFocus,sequence:state.sequence};
  }
  function offerFor(id,ctx={}){
    const npc=NPCS[id];if(!npc)return null;
    const offers={quartermaster_bex:{type:"equipment-choice",choices:["damage","control","recovery"]},collector_nix:{type:"artefact-appraisal",choices:["keep-set","trade-duplicate","dossier-link"]},archivist_orin:{type:"dossier-research",choices:["identify-symbol","cross-reference-artefact","route-lore"]}};
    const offer=offers[id];return offer?{npcId:id,...clone(offer),transactionAuthority:false,roomKey:String(ctx.roomKey||"")}:null;
  }
  function snapshot(){return clone({npcs:state.npcs,flags:state.flags,quests:state.quests,rumours:state.rumours,sequence:state.sequence})}
  function restore(data){
    const src=data&&typeof data==="object"?data:{};
    for(const key of Object.keys(state.npcs))delete state.npcs[key];for(const [key,value] of Object.entries(src.npcs||{}))state.npcs[key]=clone(value);
    for(const key of Object.keys(state.flags))delete state.flags[key];Object.assign(state.flags,clone(src.flags||{}));
    for(const key of Object.keys(state.quests))delete state.quests[key];Object.assign(state.quests,clone(src.quests||{}));
    for(const key of Object.keys(state.rumours))delete state.rumours[key];Object.assign(state.rumours,clone(src.rumours||{}));
    state.sequence=Number.isFinite(src.sequence)?src.sequence:0;return snapshot();
  }

  window.CCGLostSizzlerV142R15NpcExpansion=Object.freeze({version:"V10.42-r15",npcs:NPCS,listForRoom,talk,rescue,rumourFor,questSpec,acceptQuest,advanceQuest,claimQuestReward,offerFor,snapshot,restore});
})();
