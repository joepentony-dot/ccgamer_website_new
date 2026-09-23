/* C64 Dungeon Carnage V10.42 R54 — renderer-owned visual/gameplay presentation.
 * No RAF, interval or per-entity timer ownership is introduced here. Every
 * animation frame is derived from the existing render clock and live entity state.
 */
(()=>{
  "use strict";
  if(window.CCGLostSizzlerV142R54VisualGameplay)return;

  const WALK_OFFSETS=[-2,-1,0,1,2,1,0,-1];
  const WALK_BOBS=[0,-1,-2,-1,0,-1,-2,-1];
  const IDLE_BOBS=[0,0,-1,0];
  const ATTACK_BOBS=[0,-1,-2,-1,0];
  const state={pickupDraws:0,merchantDraws:0,corridorDraws:0,chestFallbackDraws:0};

  const frameAt=(now,step,count,seed=0)=>Math.floor((Number(now||0)+Number(seed||0))/Math.max(1,step))%Math.max(1,count);
  const px=(ctx,x,y,w,h,fill)=>{ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  const strokePixelRect=(ctx,x,y,w,h,fill,stroke,line=2)=>{
    ctx.fillStyle=fill;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1)
  };

  function pickupLabel(i){
    if(!i)return"ITEM";
    if(i.kind==="loot")return i.loot?.weapon?.displayName||i.loot?.name||"LOOT";
    if(i.kind==="game")return i.title||"C64 GAME";
    if(i.kind==="weapon")return i.generatedWeapon?.displayName||"WEAPON CACHE";
    return({health:"POTION",mana:"AMMO",ammo:"AMMO",credits:"SCORE COIN",xpOrb:"10 XP",torch:"TORCH",teleport:"TELEPORT SPELL",banishment:"BANISHMENT FLASK",armour:"ARMOUR +1",potion:"RESTORATION POTION",rapid:"RAPID FIRE",bronze:"BRONZE KEY",exitSigil:"EXIT SIGIL",key:"MAIN VAULT KEY",inventorySlot:"INVENTORY SLOT"}[i.kind]||String(i.kind||"ITEM").toUpperCase())
  }

  function drawPickupGlyph(ctx,i,col,P){
    if(!ctx||!i)return false;
    const k=String(i.kind||"");
    if(i?.customVisual)return false;
    state.pickupDraws++;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.lineCap="square";ctx.lineJoin="miter";
    ctx.shadowColor=col;ctx.shadowBlur=8;
    // Dark pixel-outline plate gives every pickup a deliberate sprite silhouette.
    if(k==="health"||k==="potion"){
      px(ctx,-7,-12,14,4,"#171019");px(ctx,-9,-8,18,18,"#171019");
      px(ctx,-5,-11,10,4,"#c7d2d8");px(ctx,-7,-7,14,15,"#3b7548");px(ctx,-5,-5,10,10,"#6dd58a");
      px(ctx,-4,-3,8,3,"#d8ffe0");px(ctx,-2,-7,4,2,"#ffffff");px(ctx,-3,4,6,2,"#285537");
    }else if(k==="mana"||k==="ammo"){
      px(ctx,-13,-8,26,16,"#11141a");px(ctx,-11,-6,22,12,"#48525f");px(ctx,-9,-4,18,8,"#202a33");
      for(const x of [-7,-1,5]){px(ctx,x,-3,4,8,"#9c7130");px(ctx,x+1,-4,2,2,"#f4cf74")}
      px(ctx,-10,7,20,2,col);
    }else if(k==="armour"){
      ctx.fillStyle="#11151c";ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(13,-8);ctx.lineTo(10,7);ctx.lineTo(0,14);ctx.lineTo(-10,7);ctx.lineTo(-13,-8);ctx.closePath();ctx.fill();
      ctx.fillStyle="#667687";ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(10,-6);ctx.lineTo(7,5);ctx.lineTo(0,10);ctx.lineTo(-7,5);ctx.lineTo(-10,-6);ctx.closePath();ctx.fill();
      ctx.fillStyle="#a9c8df";ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(2,5);ctx.lineTo(-4,7);ctx.lineTo(-7,-4);ctx.closePath();ctx.fill();
      px(ctx,-2,-5,4,10,col);px(ctx,-5,-2,10,4,col);
    }else if(k==="xpOrb"){
      const g=ctx.createRadialGradient(-4,-5,1,0,0,13);g.addColorStop(0,"#ffffff");g.addColorStop(.25,"#bdf7ff");g.addColorStop(.58,col);g.addColorStop(1,"#1a1f67");
      ctx.fillStyle="#101128";ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();
      px(ctx,-5,-2,10,5,"rgba(5,18,38,.82)");ctx.fillStyle="#fff";ctx.font='bold 7px "Courier New"';ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("XP",0,1);
    }else if(k==="bronze"||k==="key"||k==="exitSigil"){
      const metal=k==="bronze"?"#c77a30":k==="exitSigil"?"#e7c65c":"#d8ad45";
      ctx.strokeStyle="#161017";ctx.lineWidth=6;ctx.beginPath();ctx.arc(-6,-3,7,0,Math.PI*2);ctx.moveTo(0,-3);ctx.lineTo(13,-3);ctx.lineTo(13,4);ctx.moveTo(8,-3);ctx.lineTo(8,3);ctx.stroke();
      ctx.strokeStyle=metal;ctx.lineWidth=3;ctx.beginPath();ctx.arc(-6,-3,7,0,Math.PI*2);ctx.moveTo(0,-3);ctx.lineTo(13,-3);ctx.lineTo(13,4);ctx.moveTo(8,-3);ctx.lineTo(8,3);ctx.stroke();
      px(ctx,-8,-5,4,4,"#f6d98d");if(k==="exitSigil"){ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(-13,-11,26,22)}
    }else if(k==="weapon"){
      // Weapon cache reads as an actual firearm silhouette rather than a letter.
      px(ctx,-14,-7,23,5,"#11131a");px(ctx,-12,-5,22,8,"#303a49");px(ctx,-9,-4,15,3,"#8192a8");
      px(ctx,8,-4,7,4,"#161b23");px(ctx,-4,2,7,10,"#181b22");px(ctx,-2,3,5,8,"#79532e");px(ctx,-11,3,8,3,col);
      px(ctx,11,-3,5,2,"#dcecff");px(ctx,-13,-6,4,2,"#ffffff");
    }else if(k==="torch"){
      px(ctx,-3,-1,6,14,"#3c2518");px(ctx,-1,0,2,13,"#b47a35");
      ctx.fillStyle="#8b231d";ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-8,-5);ctx.lineTo(-4,1);ctx.lineTo(0,-2);ctx.lineTo(5,1);ctx.lineTo(8,-6);ctx.closePath();ctx.fill();
      ctx.fillStyle="#ff8b32";ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-4,-5);ctx.lineTo(0,-1);ctx.lineTo(4,-5);ctx.closePath();ctx.fill();px(ctx,-1,-9,2,5,"#fff2a0");
    }else if(k==="teleport"){
      ctx.strokeStyle="#171225";ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,12,.2,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,11,.2,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(8,-10);ctx.lineTo(14,-5);ctx.lineTo(6,-3);ctx.stroke();
      px(ctx,-2,-8,4,16,"#d9ccff");px(ctx,-8,-2,16,4,"#d9ccff");
    }else if(k==="banishment"){
      px(ctx,-8,-12,16,5,"#161019");px(ctx,-10,-8,20,19,"#17101d");px(ctx,-6,-11,12,5,"#c8b3dd");px(ctx,-7,-6,14,14,"#5b347c");px(ctx,-5,-4,10,10,"#a45ce2");
      ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,1);ctx.lineTo(-1,5);ctx.lineTo(6,-4);ctx.stroke();
    }else if(k==="credits"){
      ctx.fillStyle="#6f4714";ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.fillStyle="#e8b94b";ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#ffe79c";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#49300d";ctx.font='bold 10px "Courier New"';ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("+",0,1);
    }else if(k==="rapid"){
      ctx.fillStyle="#161017";ctx.beginPath();ctx.moveTo(3,-14);ctx.lineTo(-9,1);ctx.lineTo(-2,1);ctx.lineTo(-6,14);ctx.lineTo(10,-4);ctx.lineTo(3,-4);ctx.closePath();ctx.fill();
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(2,-11);ctx.lineTo(-5,0);ctx.lineTo(0,0);ctx.lineTo(-3,9);ctx.lineTo(7,-3);ctx.lineTo(2,-3);ctx.closePath();ctx.fill();
    }else if(k==="inventorySlot"){
      strokePixelRect(ctx,-13,-11,26,22,"#16131c",col,2);for(const [x,y] of [[-9,-7],[2,-7],[-9,2],[2,2]])strokePixelRect(ctx,x,y,7,7,"#2a2633","#ada3bc",1);
    }else if(k==="game"){
      // The only floor pickup that intentionally retains a C64 title.
      strokePixelRect(ctx,-14,-10,28,20,"#15101d",col,2);px(ctx,-11,-7,22,4,col);strokePixelRect(ctx,-10,-1,20,7,"#08070b",col,1);
      ctx.fillStyle=col;ctx.font='bold 5px "Courier New"';ctx.textAlign="center";ctx.fillText("C64",0,-4);px(ctx,-11,8,22,2,col);
    }else if(k==="loot"){
      ctx.fillStyle="#16101d";ctx.beginPath();for(let n=0;n<8;n++){const a=-Math.PI/2+n*Math.PI/4,r=n%2?6:14,nx=Math.cos(a)*r,ny=Math.sin(a)*r;if(n===0)ctx.moveTo(nx,ny);else ctx.lineTo(nx,ny)}ctx.closePath();ctx.fill();
      ctx.fillStyle=col;ctx.beginPath();for(let n=0;n<8;n++){const a=-Math.PI/2+n*Math.PI/4,r=n%2?4:10,nx=Math.cos(a)*r,ny=Math.sin(a)*r;if(n===0)ctx.moveTo(nx,ny);else ctx.lineTo(nx,ny)}ctx.closePath();ctx.fill();px(ctx,-2,-7,4,5,"#fff");
    }else{
      ctx.restore();return false
    }
    ctx.restore();return true
  }

  function playerFrame({now=0,moving=false,swingActive=false,swingAge=0,swingMs=260,hurt=false,seed=0}={}){
    if(hurt)return{frame:0,column:5,dx:0,dy:0,scaleX:1,scaleY:1,state:"hurt"};
    if(swingActive){
      const count=5,frame=Math.max(0,Math.min(count-1,Math.floor((Math.max(0,swingAge)/Math.max(1,swingMs))*count)));
      return{frame,column:frame<2?3:4,dx:[0,1,2,1,0][frame],dy:ATTACK_BOBS[frame],scaleX:[1,1.02,1.04,1.02,1][frame],scaleY:[1,1,.97,1,1][frame],state:"attack"}
    }
    if(moving){
      const frame=frameAt(now,78,8,seed),source=[1,1,2,2,1,1,2,2][frame];
      return{frame,column:source,dx:WALK_OFFSETS[frame]*.35,dy:WALK_BOBS[frame],scaleX:[1,.99,1.01,1,1,.99,1.01,1][frame],scaleY:[1,1.01,.99,1,1,1.01,.99,1][frame],state:"walk"}
    }
    const frame=frameAt(now,360,4,seed);
    return{frame,column:0,dx:0,dy:IDLE_BOBS[frame],scaleX:1,scaleY:[1,1,1.01,1][frame],state:"idle"}
  }

  function enemyFrame({now=0,walking=false,hit=false,attacking=false,seed=0}={}){
    const stateName=hit?"hit":attacking?"attack":walking?"walk":"idle";
    const counts={idle:4,walk:6,attack:5,hit:3},steps={idle:320,walk:92,attack:78,hit:72};
    const frame=frameAt(now,steps[stateName],counts[stateName],seed%197);
    const gait=[-2,-1,1,2,1,-1][frame%6],attack=[0,1,3,1,0][frame%5],idle=[0,0,1,0][frame%4];
    return{
      state:stateName,frame,
      stride:stateName==="walk"?gait:stateName==="attack"?attack*.65:stateName==="hit"?0:idle*.15,
      bob:stateName==="walk"?[-1,-2,-1,0,-1,-2][frame%6]:stateName==="attack"?[-1,-2,-2,-1,0][frame%5]:stateName==="hit"?-1:[0,0,-1,0][frame%4],
      attackPulse:stateName==="attack"?attack:0,
      phase:(frame/counts[stateName])*Math.PI*2
    }
  }

  function drawCorridorTile(ctx,{s,x,y,hash,theme,C,floor=1}={}){
    if(!ctx||!s||!C)return false;
    state.corridorDraws++;
    const style=(Number(floor||1)+Number(hash||0))%4,accent=theme?.accent||"#6cecff",hi=theme?.hi||"#8376dc",cx=s.x+C.tile/2,cy=s.y+C.tile/2;
    ctx.save();ctx.globalAlpha=.72;ctx.lineCap="square";
    if(style===0){
      ctx.strokeStyle="rgba(8,5,12,.68)";ctx.lineWidth=3;ctx.strokeRect(s.x+4,s.y+4,C.tile-8,C.tile-8);
      ctx.strokeStyle=accent+"66";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+7,cy);ctx.lineTo(s.x+C.tile-7,cy);ctx.stroke();
      for(const q of [-1,1]){ctx.fillStyle=hi+"55";ctx.fillRect(cx+q*12-1,s.y+7,2,C.tile-14)}
    }else if(style===1){
      ctx.fillStyle="rgba(8,7,13,.25)";ctx.fillRect(s.x+4,cy-7,C.tile-8,14);
      ctx.strokeStyle=accent+"70";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+3,cy-8);ctx.lineTo(s.x+C.tile-3,cy-8);ctx.moveTo(s.x+3,cy+8);ctx.lineTo(s.x+C.tile-3,cy+8);ctx.stroke();
      const node=((x*5+y*7)%3+3)%3;ctx.fillStyle=accent+"88";ctx.fillRect(s.x+9+node*8,cy-2,4,4)
    }else if(style===2){
      ctx.strokeStyle="rgba(11,7,8,.58)";ctx.lineWidth=2;for(const off of [8,C.tile-8]){ctx.beginPath();ctx.moveTo(s.x+off,s.y+4);ctx.lineTo(s.x+off,s.y+C.tile-4);ctx.stroke()}
      ctx.fillStyle=hi+"33";ctx.fillRect(cx-6,s.y+4,12,C.tile-8);ctx.fillStyle=accent+"4d";ctx.fillRect(cx-1,s.y+6,2,C.tile-12)
    }else{
      ctx.strokeStyle=hi+"45";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+5,s.y+5);ctx.lineTo(s.x+C.tile-5,s.y+C.tile-5);ctx.moveTo(s.x+C.tile-5,s.y+5);ctx.lineTo(s.x+5,s.y+C.tile-5);ctx.stroke();
      ctx.fillStyle=accent+"38";ctx.fillRect(cx-3,cy-3,6,6);ctx.fillStyle="rgba(0,0,0,.25)";ctx.fillRect(s.x+3,s.y+3,4,4);ctx.fillRect(s.x+C.tile-7,s.y+C.tile-7,4,4)
    }
    ctx.restore();return true
  }

  function drawMerchant(ctx,shop,s,col,entrance,P,C,now=performance.now()){
    if(!ctx||!shop||!s)return false;
    state.merchantDraws++;
    const id=String(shop.stage7NpcId||""),frame=frameAt(now,260,4,String(shop.id||"").length*31),bob=[0,-1,0,1][frame],cx=s.x+C.tile/2,cy=s.y+C.tile/2+bob;
    const palette=id==="quartermaster_bex"?{coat:"#426b77",trim:"#80d8e9",skin:"#c69a78",hair:"#3b2a28",gear:"#d7b35a"}:id==="collector_nix"?{coat:"#62436f",trim:"#d388e8",skin:"#bb8b71",hair:"#201725",gear:"#e4bc55"}:{coat:"#495174",trim:"#9ab1ef",skin:"#c79c7b",hair:"#d2c3a5",gear:"#67dce8"};
    ctx.save();ctx.translate(cx,cy);ctx.imageSmoothingEnabled=false;ctx.shadowColor=col;ctx.shadowBlur=10;
    // Ground marker/counter remains environmental; the NPC is now the focal object.
    ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();ctx.ellipse(0,17,14,4,0,0,Math.PI*2);ctx.fill();
    px(ctx,-6,-17,12,4,palette.hair);px(ctx,-7,-13,14,10,palette.skin);px(ctx,-5,-12,3,2,"#151019");px(ctx,2,-12,3,2,"#151019");
    px(ctx,-10,-5,20,18,palette.coat);px(ctx,-7,-3,14,4,palette.trim);px(ctx,-2,-1,4,11,palette.gear);
    const arm=[-1,0,1,0][frame];px(ctx,-14,-4+arm,5,13,palette.skin);px(ctx,9,-4-arm,5,13,palette.skin);
    px(ctx,-8,12,6,7,"#1b2028");px(ctx,2,12,6,7,"#1b2028");
    if(id==="quartermaster_bex"){px(ctx,10,-1,8,4,"#586674");px(ctx,15,-3,4,8,palette.gear);px(ctx,-13,5,7,5,"#7d532d")}
    else if(id==="collector_nix"){ctx.strokeStyle=palette.gear;ctx.lineWidth=2;ctx.beginPath();ctx.arc(13,1,6,0,Math.PI*2);ctx.stroke();px(ctx,-15,2,7,7,"#75475d")}
    else{px(ctx,10,-4,9,12,"#28283a");px(ctx,12,-2,5,2,palette.trim);px(ctx,12,2,5,2,palette.trim);px(ctx,-14,1,6,8,"#8d774b")}
    ctx.fillStyle=col;ctx.font='bold 5px "Courier New"';ctx.textAlign="center";ctx.fillText(entrance?"SUPPLY":"TRADER",0,7);
    ctx.restore();return true
  }

  function drawChestFallback(ctx,{s,c,col,C,anim=0,pulse=.5}={}){
    if(!ctx||!s||!c||!C)return false;
    state.chestFallbackDraws++;
    const cx=s.x+C.tile/2,locked=Boolean(c.locked),metal=locked?"#e1b84e":/ZZAP|GOLD|SIZZLER/i.test(String(c.loot?.rarity||""))?"#d7bd62":"#8c98a4";
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowColor=locked?"#ffd85a":col;ctx.shadowBlur=9+pulse*7;
    ctx.fillStyle="rgba(0,0,0,.5)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,15,4,0,0,Math.PI*2);ctx.fill();
    // Raised feet and dark outline.
    px(ctx,s.x+5,s.y+30,5,5,"#151018");px(ctx,s.x+C.tile-10,s.y+30,5,5,"#151018");
    strokePixelRect(ctx,s.x+4,s.y+17,C.tile-8,16,"#4a2b1b","#160f12",2);
    px(ctx,s.x+7,s.y+19,C.tile-14,10,"#875028");px(ctx,s.x+8,s.y+20,C.tile-16,3,"#b8763c");
    // Reinforced bands and lock.
    px(ctx,s.x+5,s.y+17,3,16,metal);px(ctx,s.x+C.tile-8,s.y+17,3,16,metal);px(ctx,cx-2,s.y+17,4,16,metal);
    px(ctx,cx-5,s.y+20,10,9,"#151018");px(ctx,cx-3,s.y+21,6,6,metal);px(ctx,cx-1,s.y+23,2,4,"#171018");
    // Arched lid with opening motion.
    ctx.save();ctx.translate(cx,s.y+17);ctx.rotate(-Math.max(0,Math.min(1,anim))*.68);
    ctx.fillStyle="#1a1112";ctx.beginPath();ctx.moveTo(-18,1);ctx.lineTo(-16,-8);ctx.quadraticCurveTo(0,-19,16,-8);ctx.lineTo(18,1);ctx.closePath();ctx.fill();
    ctx.fillStyle="#6c3b20";ctx.beginPath();ctx.moveTo(-15,-1);ctx.lineTo(-13,-7);ctx.quadraticCurveTo(0,-15,13,-7);ctx.lineTo(15,-1);ctx.closePath();ctx.fill();
    ctx.strokeStyle=metal;ctx.lineWidth=2;ctx.stroke();px(ctx,-2,-14,4,13,metal);px(ctx,-12,-6,24,3,"rgba(255,255,255,.12)");ctx.restore();
    if(c.active){ctx.globalAlpha=.35+pulse*.3;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(s.x+2,s.y+3,C.tile-4,C.tile-6)}
    if(anim>0){ctx.globalAlpha=1-anim*.25;for(let n=0;n<8;n++){const a=n*.9+anim*4,r=7+anim*(8+n%3*3);px(ctx,cx+Math.cos(a)*r,s.y+9+Math.sin(a)*r*.55,2,2,n%2?col:"#fff0a8")}}
    ctx.restore();return true
  }

  const api=Object.freeze({state,pickupLabel,drawPickupGlyph,playerFrame,enemyFrame,drawCorridorTile,drawMerchant,drawChestFallback});
  window.CCGLostSizzlerV142R54VisualGameplay=api;
})();
