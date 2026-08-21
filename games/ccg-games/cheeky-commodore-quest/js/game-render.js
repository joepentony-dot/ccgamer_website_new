function camFor(p,v){let c=cameras.get(p.id)||{x:0,y:0};const tx=Math.max(0,Math.min(C.worldWidth*C.tile-v.w,p.rx*C.tile+C.tile/2-v.w/2)),ty=Math.max(0,Math.min(C.worldHeight*C.tile-v.h,p.ry*C.tile+C.tile/2-v.h/2));c.x=tx;c.y=ty;cameras.set(p.id,c);return c}
function ws(x,y){return{x:view.x+x*C.tile-cam.x+renderShake.x,y:view.y+y*C.tile-cam.y+renderShake.y}}
function drawTile(x,y){
  const s=ws(x,y),th=W.themeAt(world,x,y),wall=world.map[y][x]!==0,roomId=W.roomAt(world,x,y),room=world.rooms[roomId],variant=room?.variant||0;
  if(wall){
    ctx.fillStyle=th.wall;ctx.fillRect(s.x,s.y,C.tile,C.tile);ctx.fillStyle=th.hi;ctx.fillRect(s.x+2,s.y+2,C.tile-4,4);
    ctx.fillStyle="rgba(0,0,0,.27)";ctx.fillRect(s.x+C.tile-4,s.y+5,4,C.tile-5);ctx.fillRect(s.x+5,s.y+C.tile-4,C.tile-5,4);
    if((x*13+y*7+variant)%19===0){ctx.fillStyle=th.accent+"30";ctx.fillRect(s.x+5,s.y+9,C.tile-10,2)}
    return;
  }
  ctx.fillStyle=(x+y+variant)%2?th.floor:th.alt;ctx.fillRect(s.x,s.y,C.tile,C.tile);
  // Layered flagstones: bevels, joins and occasional wear give floors more depth
  // while retaining the current room palette and keeping hazards readable.
  ctx.strokeStyle="rgba(255,255,255,.035)";ctx.lineWidth=1;ctx.strokeRect(s.x+.5,s.y+.5,C.tile-1,C.tile-1);ctx.fillStyle="rgba(0,0,0,.11)";ctx.fillRect(s.x,s.y+C.tile-3,C.tile,3);ctx.fillRect(s.x+C.tile-3,s.y,3,C.tile);
  if((x*19+y*23+variant*5)%17===0){ctx.strokeStyle=th.accent+"28";ctx.beginPath();ctx.moveTo(s.x+6,s.y+C.tile-8);ctx.lineTo(s.x+14,s.y+C.tile-13);ctx.lineTo(s.x+21,s.y+C.tile-9);ctx.stroke()}
  ctx.fillStyle=th.accent+"16";
  const code=(x*31+y*17+roomId*7+variant*11)%41;
  if(variant===0&&code%11===0)ctx.fillRect(s.x+4,s.y+C.tile/2,C.tile-8,1);
  if(variant===1&&code%9===0){ctx.strokeStyle=th.accent+"22";ctx.strokeRect(s.x+5,s.y+5,C.tile-10,C.tile-10)}
  if(variant===2&&code%7===0){ctx.fillRect(s.x+6,s.y+6,3,3);ctx.fillRect(s.x+C.tile-9,s.y+C.tile-9,3,3)}
  if(variant===3&&code%13===0){ctx.fillRect(s.x+3,s.y+3,C.tile-6,2);ctx.fillRect(s.x+3,s.y+C.tile-5,C.tile-6,2)}
  if(variant===4&&code%8===0){ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,5,0,Math.PI*2);ctx.fill()}
  if(variant===5&&code%10===0){ctx.fillRect(s.x+C.tile/2-1,s.y+4,2,C.tile-8);ctx.fillRect(s.x+4,s.y+C.tile/2-1,C.tile-8,2)}
  if(variant===6&&code%12===0){ctx.fillRect(s.x+5,s.y+5,4,4);ctx.fillRect(s.x+C.tile-9,s.y+5,4,4)}
  if(room){
    const tint=room.sigilRoom?"rgba(185,120,255,.105)":room.voidRoom?"rgba(22,12,34,.22)":room.traderRoom?"rgba(255,216,90,.075)":room.sanctuary?"rgba(114,255,155,.065)":room.dangerous?"rgba(255,104,104,.055)":room.verminRoom?"rgba(155,97,52,.06)":null;if(tint){ctx.fillStyle=tint;ctx.fillRect(s.x,s.y,C.tile,C.tile)}
    const edge=x<=room.x+1||x>=room.x+room.w-2||y<=room.y+1||y>=room.y+room.h-2;if(edge){ctx.fillStyle="rgba(0,0,0,.12)";ctx.fillRect(s.x,s.y,C.tile,C.tile)}
    if(room.grandHall){const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),onCarpet=room.grandHallAxis==="horizontal"?Math.abs(y-cy)<=1:Math.abs(x-cx)<=1;if(onCarpet){ctx.fillStyle=((x+y)%2)?"#651527":"#76182d";ctx.fillRect(s.x+2,s.y+2,C.tile-4,C.tile-4);ctx.fillStyle="#b48832";if(room.grandHallAxis==="horizontal"){ctx.fillRect(s.x+2,s.y+2,C.tile-4,2);ctx.fillRect(s.x+2,s.y+C.tile-4,C.tile-4,2)}else{ctx.fillRect(s.x+2,s.y+2,2,C.tile-4);ctx.fillRect(s.x+C.tile-4,s.y+2,2,C.tile-4)}ctx.fillStyle="rgba(255,215,100,.10)";for(let py=7;py<C.tile-5;py+=8)for(let px=7;px<C.tile-5;px+=8)if((px+py+x+y)%3===0)ctx.fillRect(s.x+px,s.y+py,2,2)}}
  }
  // Every room gets a deterministic floor signature so even rooms sharing a theme are visually distinct.
  if(room){
    const cx=Math.floor(room.x+room.w/2),cy=Math.floor(room.y+room.h/2),sig=room.signature??room.id;
    const dx=x-cx,dy=y-cy;
    if(Math.abs(dx)<=1&&Math.abs(dy)<=1){
      ctx.fillStyle=th.accent+((sig%3===0)?"26":"1c");
      if((sig+dx*7+dy*11)%2===0)ctx.fillRect(s.x+4,s.y+4,C.tile-8,C.tile-8);
      ctx.strokeStyle=th.accent+"42";ctx.lineWidth=1;
      if(sig%4===0)ctx.strokeRect(s.x+6,s.y+6,C.tile-12,C.tile-12);
      else if(sig%4===1){ctx.beginPath();ctx.moveTo(s.x+4,s.y+C.tile/2);ctx.lineTo(s.x+C.tile-4,s.y+C.tile/2);ctx.stroke()}
      else if(sig%4===2){ctx.beginPath();ctx.moveTo(s.x+C.tile/2,s.y+4);ctx.lineTo(s.x+C.tile/2,s.y+C.tile-4);ctx.stroke()}
      else{ctx.beginPath();ctx.moveTo(s.x+5,s.y+5);ctx.lineTo(s.x+C.tile-5,s.y+C.tile-5);ctx.moveTo(s.x+C.tile-5,s.y+5);ctx.lineTo(s.x+5,s.y+C.tile-5);ctx.stroke()}
    }
  }
}
function secretWallTheme(d){
  // A hidden passage must visually continue the solid masonry beside it. Prefer
  // wall cells on the same wall run; only fall back to a room theme if no solid
  // neighbour exists (an unusual generation edge case).
  const along=d.orientation==="horizontal"?[[1,0],[-1,0]]:[[0,1],[0,-1]],all=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of [...along,...all]){const x=d.x+dx,y=d.y+dy;if(world.map[y]?.[x]===1)return W.themeAt(world,x,y)}
  const candidates=[];for(const [dx,dy] of all){const x=d.x+dx,y=d.y+dy;if(world.map[y]?.[x]!==0)continue;const roomId=W.roomAt(world,x,y),room=world.rooms[roomId];candidates.push({x,y,score:room&&!room.optional?0:room?1:2})}
  candidates.sort((a,b)=>a.score-b.score);const q=candidates[0];return q?W.themeAt(world,q.x,q.y):W.themes.WARP_GALLERY
}
function drawSecretWall(d,s){
  const th=secretWallTheme(d);ctx.fillStyle=th.wall;ctx.fillRect(s.x,s.y,C.tile,C.tile);ctx.fillStyle=th.hi;ctx.fillRect(s.x+2,s.y+2,C.tile-4,4);ctx.fillStyle="rgba(0,0,0,.27)";ctx.fillRect(s.x+C.tile-4,s.y+5,4,C.tile-5);ctx.fillRect(s.x+5,s.y+C.tile-4,C.tile-5,4);
  // Secret masonry uses the exact neighbouring wall palette. Only these hairline cracks betray it.
  ctx.save();ctx.globalAlpha=.52;ctx.strokeStyle="rgba(12,8,16,.9)";ctx.lineWidth=1.35;ctx.lineCap="round";ctx.shadowColor="rgba(220,184,255,.32)";ctx.shadowBlur=2;ctx.beginPath();const cx=s.x+C.tile/2,cy=s.y+C.tile/2;
  if(d.orientation==="horizontal"){ctx.moveTo(s.x+8,cy-3);ctx.lineTo(cx-7,cy);ctx.lineTo(cx-3,cy-4);ctx.moveTo(cx+2,cy+3);ctx.lineTo(cx+6,cy-1);ctx.lineTo(s.x+C.tile-8,cy+1)}
  else{ctx.moveTo(cx-3,s.y+8);ctx.lineTo(cx,cy-7);ctx.lineTo(cx-4,cy-3);ctx.moveTo(cx+3,cy+2);ctx.lineTo(cx-1,cy+6);ctx.lineTo(cx+1,s.y+C.tile-8)}
  ctx.stroke();ctx.restore()
}
function drawDoors(){
  const now=performance.now();
  for(const d of host.doors||[]){
    const s=ws(d.x,d.y);
    // Closed secret doors remain ordinary wall masonry whether hidden, discovered or unlocked.
    if(d.type==="secret"&&!d.open&&!d.opening){drawSecretWall(d,s);continue}
    const duration=Math.max(1,(d.openAt||0)-(d.openingStart||0)),progress=d.open?1:d.opening?Math.max(0,Math.min(1,(now-(d.openingStart||now))/duration)):0,eased=.5-Math.cos(progress*Math.PI)/2,lockedCol=d.sigilGate?P.purple:d.type==="switch"?P.cyan:d.type==="bronze"?P.gold:"#c05d84";
    const base=d.type==="room"?"#8b527f":d.type==="switch"?"#476786":d.type==="secret"?"#50405c":"#936536";ctx.save();ctx.shadowColor=d.locked?lockedCol:"rgba(185,120,255,.3)";ctx.shadowBlur=d.locked?10:5;ctx.lineCap="square";
    if(d.type==="secret"){
      const slide=(C.tile-5)*eased,th=secretWallTheme(d);ctx.fillStyle=th.wall;ctx.strokeStyle=th.hi;ctx.lineWidth=2;
      if(d.orientation==="horizontal"){const y=d.side==="north"?s.y+1:d.side==="south"?s.y+C.tile-8:s.y+C.tile/2-4,dir=d.side==="north"?-1:d.side==="south"?1:(((d.x+d.y)%2)?1:-1);ctx.fillRect(s.x+3,y+dir*slide,C.tile-6,8);ctx.strokeRect(s.x+3,y+dir*slide,C.tile-6,8)}
      else{const x=d.side==="west"?s.x+1:d.side==="east"?s.x+C.tile-8:s.x+C.tile/2-4,dir=d.side==="west"?-1:d.side==="east"?1:(((d.x+d.y)%2)?1:-1);ctx.fillRect(x+dir*slide,s.y+3,8,C.tile-6);ctx.strokeRect(x+dir*slide,s.y+3,8,C.tile-6)}
    }else{
      const horizontal=d.orientation==="horizontal",hingeAtStart=((d.id?.length||0)+d.x+d.y)%2===0,leafLen=C.tile-7,closedAngle=horizontal?0:Math.PI/2;let swingSign;if(horizontal)swingSign=d.side==="north"?1:d.side==="south"?-1:(hingeAtStart?1:-1);else swingSign=d.side==="west"?-1:d.side==="east"?1:(hingeAtStart?-1:1);const angle=closedAngle+swingSign*eased*Math.PI/2,hx=horizontal?(hingeAtStart?s.x+4:s.x+C.tile-4):(d.side==="west"?s.x+3:d.side==="east"?s.x+C.tile-3:s.x+C.tile/2),hy=horizontal?(d.side==="north"?s.y+3:d.side==="south"?s.y+C.tile-3:s.y+C.tile/2):(hingeAtStart?s.y+4:s.y+C.tile-4),dir=hingeAtStart?1:-1;
      ctx.strokeStyle=d.locked?lockedCol:"#d1b2df";ctx.lineWidth=3;if(horizontal){const fy=d.side==="north"?s.y+2:d.side==="south"?s.y+C.tile-2:s.y+C.tile/2;ctx.beginPath();ctx.moveTo(s.x+1,fy);ctx.lineTo(s.x+C.tile-1,fy);ctx.stroke()}else{const fx=d.side==="west"?s.x+2:d.side==="east"?s.x+C.tile-2:s.x+C.tile/2;ctx.beginPath();ctx.moveTo(fx,s.y+1);ctx.lineTo(fx,s.y+C.tile-1);ctx.stroke()}
      ctx.save();ctx.translate(hx,hy);ctx.rotate(angle);const leafX=dir>0?0:-leafLen;ctx.fillStyle=base;ctx.strokeStyle=d.locked?lockedCol:"#e0c2ec";ctx.lineWidth=2;ctx.fillRect(leafX,-6,leafLen,12);ctx.strokeRect(leafX,-6,leafLen,12);ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(leafX+2,-4,Math.max(2,leafLen-4),2);const handleLocal=dir>0?leafLen-5:-leafLen+5;ctx.fillStyle="#f0d16a";ctx.beginPath();ctx.arc(handleLocal,0,3,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle="#c9a9d7";ctx.beginPath();ctx.arc(hx,hy,3,0,Math.PI*2);ctx.fill();if(d.opening){ctx.globalAlpha=.45;ctx.strokeStyle=P.cyan;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(hx,hy,leafLen,Math.min(closedAngle,angle),Math.max(closedAngle,angle));ctx.stroke();ctx.globalAlpha=1}
    }
    if(d.locked){ctx.fillStyle=lockedCol;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,3.5,0,Math.PI*2);ctx.fill()}ctx.restore();if(md(d,focus)<=2){const text=d.sigilGate&&d.locked?"REINFORCED SIGIL GATE":d.locked?(d.type==="switch"?"SWITCH GATE":d.type==="bronze"?"LOCKED BRONZE DOOR":"SEALED DOOR"):d.open?(d.type==="secret"?"SECRET PASSAGE OPEN":"OPEN DOOR"):d.opening?(d.type==="secret"?"WALL RETRACTING…":"DOOR SWINGING OPEN…"):"CLOSED DOOR";label(text,{x:s.x,y:s.y-2},d.locked?lockedCol:d.open?P.green:P.cyan)}
  }
}
function drawExit(){
  const s=ws(world.exit.x,world.exit.y),t=performance.now()/220,ready=Boolean(host.exitOpen);
  ctx.save();ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.strokeStyle=ready?P.purple:"#66586e";ctx.lineWidth=3;ctx.shadowColor=ready?P.purple:"transparent";ctx.shadowBlur=ready?15:0;ctx.strokeRect(-10,-12,20,24);ctx.strokeRect(-5,-7,10,14);
  if(ready){ctx.rotate(t);ctx.beginPath();ctx.arc(0,0,18,-.4,1.5);ctx.stroke()}else{ctx.fillStyle="#2a2230";ctx.fillRect(-3,-5,6,10);ctx.fillStyle=host.exitSigilCollected?P.green:P.gold;ctx.fillRect(-1,-2,2,4)}
  ctx.restore();
  if(md(world.exit,focus)<4){const text=ready?(run.floor<C.maxFloors?"DESCENT":"FINAL EXIT"):host.objective?.complete&&!host.exitSigilCollected?"NEEDS EXIT SIGIL":!host.objective?.complete?"OBJECTIVE LOCKED":"SEALED EXIT";label(text,{x:s.x,y:s.y-1},ready?P.purple:P.gold)}
}
function itemInfo(i){if(i.kind==="loot")return["★",i.loot?.rarity==="GOLD MEDAL"?P.gold:i.loot?.rarity==="ZZAP! 97%"?P.pink:P.cyan];return{key:["KEY",P.gold],exitSigil:["SIG",P.gold],health:["+",P.green],mana:["AM",P.cyan],ammo:["AM",P.cyan],game:["C64",P.white],credits:["COIN",P.gold],xpOrb:["XP",P.cyan],torch:["T",P.gold],teleport:["WARP",P.purple],banishment:["B",P.purple],inventorySlot:["SLOT",P.gold],armour:["A",P.blue],potion:["P",P.green],weapon:["W",P.orange],rapid:["RF",P.orange],bronze:["BK",P.gold]}[i.kind]||["?",P.white]}
function drawPickupGlyph(i,col){
  ctx.save();ctx.lineWidth=2;ctx.strokeStyle=col;ctx.fillStyle=col;
  const k=i.kind;
  const custom=pickupOverrideImages.get(k);if(custom?.complete&&custom.naturalWidth){ctx.drawImage(custom,-14,-14,28,28);ctx.restore();return}
  if(k==="health"){ctx.fillRect(-3,-10,6,20);ctx.fillRect(-10,-3,20,6)}
  else if(k==="mana"||k==="ammo"){ctx.strokeRect(-11,-7,22,14);ctx.fillRect(-7,-3,5,6);ctx.fillRect(2,-3,5,6)}
  else if(k==="potion"){ctx.strokeRect(-7,-5,14,14);ctx.fillRect(-4,-10,8,5);ctx.fillRect(-5,1,10,6)}
  else if(k==="banishment"){ctx.strokeRect(-8,-6,16,15);ctx.fillRect(-4,-11,8,5);ctx.beginPath();ctx.moveTo(-5,1);ctx.lineTo(-1,5);ctx.lineTo(6,-4);ctx.stroke()}
  else if(k==="torch"){ctx.fillRect(-2,-1,4,12);ctx.beginPath();ctx.moveTo(0,-12);ctx.quadraticCurveTo(-9,-4,0,1);ctx.quadraticCurveTo(9,-5,0,-12);ctx.fill()}
  else if(k==="teleport"){ctx.beginPath();ctx.arc(0,0,11,.4,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(7,-9);ctx.lineTo(12,-3);ctx.lineTo(4,-2);ctx.stroke();ctx.fillRect(-2,-7,4,14);ctx.fillRect(-7,-2,14,4)}
  else if(k==="armour"){ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(10,-6);ctx.lineTo(8,5);ctx.lineTo(0,11);ctx.lineTo(-8,5);ctx.lineTo(-10,-6);ctx.closePath();ctx.stroke()}
  else if(k==="key"||k==="bronze"||k==="exitSigil"){ctx.beginPath();ctx.arc(-5,-2,5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(11,-2);ctx.lineTo(11,3);ctx.moveTo(7,-2);ctx.lineTo(7,3);ctx.stroke();if(k==="exitSigil"){ctx.beginPath();ctx.arc(-5,-2,9,0,Math.PI*2);ctx.stroke()}}
  else if(k==="weapon"){ctx.fillRect(-11,-4,15,7);ctx.fillRect(2,-1,9,3);ctx.fillRect(-5,3,5,7)}
  else if(k==="rapid"){ctx.beginPath();ctx.moveTo(3,-12);ctx.lineTo(-7,1);ctx.lineTo(-1,1);ctx.lineTo(-4,12);ctx.lineTo(8,-3);ctx.lineTo(2,-3);ctx.closePath();ctx.fill()}
  else if(k==="game"){ctx.save();ctx.shadowColor=col;ctx.shadowBlur=10;ctx.fillStyle="rgba(10,5,16,.82)";ctx.fillRect(-13,-9,26,18);ctx.strokeStyle=col;ctx.strokeRect(-13,-9,26,18);ctx.fillStyle=col;ctx.fillRect(-10,-6,20,3);ctx.strokeRect(-9,-1,18,6);ctx.beginPath();ctx.arc(-4,2,2,0,Math.PI*2);ctx.arc(4,2,2,0,Math.PI*2);ctx.stroke();ctx.font='bold 5px "Courier New"';ctx.textAlign="center";ctx.fillText("C64",0,-3);ctx.fillRect(-10,7,20,2);ctx.restore()}
  else if(k==="credits"){ctx.fillStyle="#9a6718";ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#51350c";ctx.font='bold 11px Consolas';ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("S",0,1)}
  else if(k==="xpOrb"){const g=ctx.createRadialGradient(-3,-3,1,0,0,12);g.addColorStop(0,"#fff");g.addColorStop(.35,P.cyan);g.addColorStop(1,"#2d3ea0");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#08101d";ctx.font='bold 9px Consolas';ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("XP",0,1)}
  else if(k==="inventorySlot"){ctx.strokeRect(-11,-9,22,18);ctx.strokeRect(-7,-5,6,6);ctx.strokeRect(2,-5,6,6);ctx.strokeRect(-7,3,6,6);ctx.strokeRect(2,3,6,6)}
  else if(k==="loot"){ctx.beginPath();for(let n=0;n<8;n++){const a=-Math.PI/2+n*Math.PI/4,r=n%2?4:11,x=Math.cos(a)*r,y=Math.sin(a)*r;if(n===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fill()}
  else{ctx.fillRect(-8,-8,16,16)}ctx.restore()
}
function drawItem(i){
  if(!i.active||!visibleTo(focus,i.x,i.y))return;const s=ws(i.x,i.y),[txt,col]=itemInfo(i),pulse=1+Math.sin(performance.now()/155+i.x)*.08;
  ctx.save();ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.scale(pulse,pulse);ctx.shadowColor=col;ctx.shadowBlur=11;drawPickupGlyph(i,col);ctx.restore();
  if(md(i,focus)<=3)label(i.title||({health:"HEALTH PACK",ammo:"AMMO PACK",exitSigil:"EXIT SIGIL",key:"MAIN KEY",game:"C64 GAME",credits:"GOLD SCORE COIN",xpOrb:"XP ORB",torch:"TORCH",teleport:"TELEPORT SPELL",armour:"ARMOUR",potion:"POTION",bronze:"BRONZE KEY",weapon:"WEAPON",rapid:"RAPID FIRE"}[i.kind]||i.kind.toUpperCase()),{x:s.x,y:s.y-1},col)
}
function drawChests(){
  const now=performance.now();
  for(const c of host.chests||[]){
    const anim=c.openedAt?Math.max(0,Math.min(1,(now-c.openedAt)/650)):0;if(!c.active&&!(c.openedAt&&anim<1))continue;if(!visibleTo(focus,c.x,c.y))continue;
    const s=ws(c.x,c.y),rar=c.loot?.rarity,col=PGR.colourForRarity(rar),cx=s.x+C.tile/2;
    ctx.save();ctx.shadowColor=col;ctx.shadowBlur=c.active?8:14;ctx.imageSmoothingEnabled=false;
    // chunky traditional wooden chest body
    ctx.fillStyle="#3b2115";ctx.fillRect(s.x+5,s.y+17,C.tile-10,16);ctx.fillStyle="#75431f";ctx.fillRect(s.x+7,s.y+18,C.tile-14,12);ctx.fillStyle="#9a5d2b";ctx.fillRect(s.x+7,s.y+19,C.tile-14,3);
    ctx.fillStyle="#c39a46";ctx.fillRect(s.x+5,s.y+17,3,16);ctx.fillRect(s.x+C.tile-8,s.y+17,3,16);ctx.fillRect(cx-2,s.y+17,4,16);ctx.fillRect(s.x+5,s.y+30,C.tile-10,3);
    // arched lid swings upward during the opening animation
    ctx.save();ctx.translate(cx,s.y+17);ctx.rotate(-anim*.62);ctx.fillStyle="#4a2918";ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-14,-8);ctx.quadraticCurveTo(0,-17,14,-8);ctx.lineTo(16,0);ctx.closePath();ctx.fill();ctx.strokeStyle="#c39a46";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#9a5d2b";ctx.fillRect(-12,-7,24,4);ctx.restore();
    ctx.fillStyle=c.locked?P.gold:col;ctx.fillRect(cx-3,s.y+20,6,7);ctx.fillStyle="#1c1010";ctx.fillRect(cx-1,s.y+23,2,3);
    if(anim>0){ctx.globalAlpha=1-anim*.45;ctx.fillStyle=col;for(let n=0;n<5;n++){const a=n*1.4+now/220;ctx.fillRect(cx+Math.cos(a)*(7+anim*12),s.y+10+Math.sin(a)*(4+anim*8),2,2)}}
    ctx.restore();if(md(c,focus)<=2)label(c.active?(c.locked?"LOCKED DUNGEON CHEST":`${rar||"COMMON"} CHEST`):"CHEST OPENED",{x:s.x,y:s.y-1},c.locked?P.gold:col)
  }
}
function label(text,s,col=P.white){ctx.save();ctx.font='bold 14px Consolas, "Courier New"';const w=Math.min(260,ctx.measureText(text).width+16);ctx.fillStyle="rgba(5,3,8,.94)";ctx.fillRect(s.x+C.tile/2-w/2,s.y-21,w,20);ctx.fillStyle=col;ctx.textAlign="center";ctx.fillText(text,s.x+C.tile/2,s.y-6);ctx.restore()}
function drawTransientHealth(ent,s,col=P.green){
  if(!(ent?.hpBarMs>0))return;
  const hp=Number(ent.health??ent.hp),max=Number(ent.maxHealth??ent.maxHp);if(!(max>0))return;
  const pct=Math.max(0,Math.min(1,hp/max)),arm=Number(ent.armor||0),maxArm=Number(ent.maxArmor||0),hasArm=maxArm>0,w=Math.max(C.tile,48),x=s.x+C.tile/2-w/2,y=s.y-(hasArm?36:28);
  ctx.save();ctx.fillStyle="rgba(4,2,8,.94)";ctx.fillRect(x-2,y-12,w+4,hasArm?31:22);ctx.strokeStyle="#efe6ff";ctx.lineWidth=1;ctx.strokeRect(x,y,w,8);
  ctx.fillStyle=pct>.5?P.green:pct>.25?P.gold:P.red;ctx.fillRect(x+1,y+1,(w-2)*pct,6);
  ctx.fillStyle=col;ctx.font='bold 10px Consolas, "Courier New"';ctx.textAlign="center";ctx.fillText(`${Math.max(0,Math.ceil(hp))}/${Math.ceil(max)} HP`,s.x+C.tile/2,y-3);
  if(hasArm){const ap=Math.max(0,Math.min(1,arm/maxArm));ctx.strokeStyle=P.cyan;ctx.strokeRect(x,y+12,w,6);ctx.fillStyle=P.blue;ctx.fillRect(x+1,y+13,(w-2)*ap,4);ctx.fillStyle=P.cyan;ctx.fillText(`ARM ${Math.ceil(arm)}`,s.x+C.tile/2,y+29)}ctx.restore();
}
function enemyScreen(e){let v=enemyVisuals.get(e.id);if(!v){v={rx:e.x,ry:e.y};enemyVisuals.set(e.id,v)}const rate=e.aiState==="chase"?.26:.14;v.rx+=(e.x-v.rx)*rate;v.ry+=(e.y-v.ry)*rate;return ws(v.rx,v.ry)}
function px(cx,cy,x,y,w,h,col){ctx.fillStyle=col;ctx.fillRect(Math.round(cx+x),Math.round(cy+y),w,h)}
function drawPixelEnemySprite(e,cx,cy){
  const f=e.follower,k=f?.kind||e.kind,isDeath=Boolean(e.deathStalker&&e.voidStalker),elite=Boolean(f||e.champion||e.guardian||e.exitWarden),outline=isDeath?"#352640":"#17101e",main=isDeath?"#09070c":e.exitWarden?"#6a3488":e.guardian?"#8d263f":k==="hunter"?"#d09d32":k==="charger"?"#3d8ea3":k==="ranger"?"#4069a7":k==="root"?"#4f8f43":k==="cook"?"#b46a35":k==="firebreather"?"#4d8c52":k==="guard"?"#8d3a44":k==="scout"?"#7c5daf":k==="ambusher"?"#a64d83":k==="treasure"?"#c99b35":"#756283",hi=elite?P.gold:"#ded3e7";
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowColor=isDeath?"#140c18":elite?P.gold:main;ctx.shadowBlur=isDeath?5:elite?8:4;
  // pixel-outline body shared by humanoid enemies
  if(isDeath){ctx.shadowColor="#ff183f";ctx.shadowBlur=24;px(cx,cy,-15,-16,30,5,"#170b1c");px(cx,cy,-18,-11,36,22,outline);px(cx,cy,-14,11,10,11,outline);px(cx,cy,4,11,10,11,outline);px(cx,cy,-13,-14,26,25,main);px(cx,cy,-18,0,7,15,"#08050b");px(cx,cy,11,0,7,15,"#08050b");px(cx,cy,-8,-7,6,4,"#ff173d");px(cx,cy,2,-7,6,4,"#ff173d");px(cx,cy,-6,-6,3,2,"#fff1f3");px(cx,cy,3,-6,3,2,"#fff1f3");ctx.strokeStyle="#ff294b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,22,0,Math.PI*2);ctx.stroke();ctx.restore();return}
  if(k==="scout"){
    // Tape Scout: walking cassette robot
    px(cx,cy,-12,-9,24,17,outline);px(cx,cy,-10,-7,20,13,main);px(cx,cy,-7,-4,14,4,"#18131e");px(cx,cy,-6,1,4,4,hi);px(cx,cy,2,1,4,4,hi);px(cx,cy,-9,7,5,6,main);px(cx,cy,4,7,5,6,main);px(cx,cy,-15,-2,4,8,hi);px(cx,cy,11,-2,4,8,hi)
  }else if(k==="hunter"){
    // Joystick Hunter: armoured figure carrying a very obvious joystick lance
    px(cx,cy,-6,-12,12,7,outline);px(cx,cy,-5,-11,10,6,main);px(cx,cy,-9,-5,18,15,outline);px(cx,cy,-7,-4,14,13,main);px(cx,cy,-6,10,5,6,main);px(cx,cy,1,10,5,6,main);px(cx,cy,8,-5,3,15,hi);px(cx,cy,6,-8,7,4,hi);px(cx,cy,9,8,5,3,"#9b334f")
  }else if(k==="ambusher"){
    // Raster Ambusher: glitching horizontal bars
    for(let y=-11;y<=9;y+=5){const off=((y+e.id.length)%3)*2;px(cx,cy,-12+off,y,24-off*2,3,y%10?main:hi)}px(cx,cy,-5,-4,3,3,"#fff");px(cx,cy,3,-4,3,3,"#fff")
  }else if(k==="guard"){
    // 1541 Guard: disk-drive armour and shield
    px(cx,cy,-10,-11,20,22,outline);px(cx,cy,-8,-9,16,18,main);px(cx,cy,-5,-6,10,3,"#1e1820");px(cx,cy,-4,0,8,3,hi);px(cx,cy,-15,-4,6,13,"#59404a");px(cx,cy,9,-3,5,12,hi);px(cx,cy,-6,10,5,6,main);px(cx,cy,1,10,5,6,main)
  }else if(k==="charger"){
    px(cx,cy,-14,-7,28,17,outline);px(cx,cy,-10,-9,20,19,main);px(cx,cy,-17,-5,6,9,hi);px(cx,cy,11,-5,6,9,hi);px(cx,cy,-6,10,5,6,main);px(cx,cy,1,10,5,6,main);px(cx,cy,-4,-6,3,3,"#fff");px(cx,cy,2,-6,3,3,"#fff")
  }else if(k==="ranger"){
    // hooded ranger with long blaster
    px(cx,cy,-8,-12,16,8,outline);px(cx,cy,-6,-10,12,7,main);px(cx,cy,-7,-4,14,15,main);px(cx,cy,-11,0,6,10,outline);px(cx,cy,5,-1,13,4,hi);px(cx,cy,14,-3,4,8,main);px(cx,cy,-5,11,4,5,main);px(cx,cy,1,11,4,5,main)
  }else if(k==="root"){
    px(cx,cy,-6,-12,12,9,main);px(cx,cy,-9,-4,18,13,main);px(cx,cy,-13,1,5,10,"#315c2c");px(cx,cy,8,1,5,10,"#315c2c");px(cx,cy,-8,8,5,8,"#315c2c");px(cx,cy,3,8,5,8,"#315c2c");px(cx,cy,-4,-7,3,3,"#d9e7b0");px(cx,cy,2,-7,3,3,"#d9e7b0")
  }else if(k==="cook"){
    // chef / CPU: hat, apron, pan
    px(cx,cy,-10,-15,20,5,"#ede7d8");px(cx,cy,-7,-18,5,5,"#ede7d8");px(cx,cy,1,-18,5,5,"#ede7d8");px(cx,cy,-7,-10,14,8,main);px(cx,cy,-9,-2,18,14,main);px(cx,cy,-4,1,8,10,"#ece6d6");px(cx,cy,8,-1,10,3,hi);px(cx,cy,15,-4,3,9,hi)
  }else if(k==="firebreather"){
    // little dungeon dragon
    px(cx,cy,-13,-6,20,15,main);px(cx,cy,-8,-11,16,9,main);px(cx,cy,6,-7,9,8,main);px(cx,cy,13,-4,5,3,P.orange);px(cx,cy,-15,6,8,4,main);px(cx,cy,-18,9,7,3,main);px(cx,cy,-5,9,4,6,main);px(cx,cy,3,9,4,6,main);px(cx,cy,2,-8,3,3,"#fff")
  }else if(k==="treasure"){
    px(cx,cy,-7,-10,14,9,"#698347");px(cx,cy,-9,-2,18,13,"#698347");px(cx,cy,6,0,10,11,P.gold);px(cx,cy,-5,10,4,5,"#4d6336");px(cx,cy,2,10,4,5,"#4d6336")
  }else{
    // guardian/champion/generic armoured dungeon fighter
    px(cx,cy,-7,-13,14,8,outline);px(cx,cy,-6,-11,12,7,main);px(cx,cy,-10,-5,20,16,outline);px(cx,cy,-8,-4,16,14,main);px(cx,cy,-14,-3,5,11,hi);px(cx,cy,9,-3,5,11,hi);px(cx,cy,-6,10,5,6,main);px(cx,cy,1,10,5,6,main)
  }
  if(f){const portrait=avatarImages?.get?.(f.name);if(portrait?.complete&&portrait.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowBlur=0;ctx.globalAlpha=.96;ctx.drawImage(portrait,cx-7,cy-13,14,14);ctx.strokeStyle="#f6d56a";ctx.lineWidth=1;ctx.strokeRect(cx-8,cy-14,16,16);ctx.restore()}ctx.fillStyle=P.gold;ctx.font='bold 5px "Courier New"';ctx.textAlign="center";ctx.fillText(f.initials||f.name.slice(0,2).toUpperCase(),cx,cy+8)}
  if(elite){ctx.strokeStyle=P.gold;ctx.lineWidth=1;ctx.strokeRect(cx-12,cy-14,24,28)}
  if((e.hitStunMs||0)>0){ctx.fillStyle=P.cyan;px(cx,cy,-12,-18,4,3,P.cyan);px(cx,cy,8,-17,4,3,P.cyan);px(cx,cy,-2,-20,4,3,P.cyan)}
  ctx.restore()
}
function drawEnemy(e){
  if(!e.alive||!visibleTo(focus,e.x,e.y))return;const s=enemyScreen(e),f=e.follower,isDeathStalker=Boolean(e.deathStalker&&e.voidStalker),cx=s.x+C.tile/2,cy=s.y+C.tile/2;
  if(f){const r=(C.enemy.followerLightRadius||5)*C.tile,g=ctx.createRadialGradient(cx,cy,8,cx,cy,r);g.addColorStop(0,"rgba(255,213,112,.13)");g.addColorStop(.45,"rgba(255,160,70,.05)");g.addColorStop(1,"rgba(255,140,50,0)");ctx.fillStyle=g;ctx.fillRect(s.x-r,s.y-r,r*2,r*2)}
  if(isDeathStalker){const aura=ctx.createRadialGradient(cx,cy,5,cx,cy,C.tile*.85);aura.addColorStop(0,"rgba(255,25,62,.22)");aura.addColorStop(1,"rgba(255,25,62,0)");ctx.fillStyle=aura;ctx.fillRect(cx-C.tile,cy-C.tile,C.tile*2,C.tile*2)}ctx.fillStyle="rgba(0,0,0,.42)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,isDeathStalker?19:13,isDeathStalker?6:4,0,0,Math.PI*2);ctx.fill();drawPixelEnemySprite(e,cx,cy);
  const name=e.exitWarden?"SIGIL WARDEN":e.guardian?"FLOOR GUARDIAN":isDeathStalker?"DEATH STALKER":e.champion?e.championName:e.treasureGoblin?"TREASURE GOBLIN":f?.name||({scout:"Tape Scout",hunter:"Joystick Hunter",ambusher:"Raster Ambusher",guard:"1541 Guard",ghost:"Ghost Byte",charger:"Charger",ranger:"Ranger",root:"Root Crawler",cook:"CPU Cook",firebreather:"Firebreather"}[e.kind]||"Enemy");
  label(isDeathStalker?`${name} — INDESTRUCTIBLE`:name,s,isDeathStalker?P.red:e.exitWarden?P.gold:e.guardian?P.red:e.champion?P.cyan:f?P.gold:P.white);if(!isDeathStalker)drawTransientHealth(e,s,f?P.gold:P.white);
  if((e.hitStunMs||0)>0){ctx.font='bold 9px "Courier New"';ctx.textAlign="center";ctx.fillStyle=P.cyan;ctx.fillText("STUNNED",cx,s.y-25)}else if(e.aiState==="chase"||e.aiState==="search"){ctx.font='bold 14px "Courier New"';ctx.textAlign="center";ctx.fillStyle=e.aiState==="chase"?P.red:P.gold;ctx.fillText(e.aiState==="chase"?"!":"?",cx,s.y-25)}
  if(e.champion||e.guardian){const pct=Math.max(0,e.hp/e.maxHp);ctx.fillStyle="#1a0b12";ctx.fillRect(s.x+3,s.y+C.tile+2,C.tile-6,3);ctx.fillStyle=e.guardian?P.red:P.cyan;ctx.fillRect(s.x+3,s.y+C.tile+2,(C.tile-6)*pct,3)}
}
function drawStalker(){const s=host.stalker;if(!s?.awake||!visibleTo(focus,s.x,s.y))return;const q=ws(s.x,s.y),pulse=.7+.3*Math.sin(performance.now()/260),v=s.vulnerableMs>0;ctx.save();ctx.shadowColor=v?P.purple:"#ff314f";ctx.shadowBlur=v?24:18;ctx.fillStyle="#080409";ctx.beginPath();ctx.moveTo(q.x+C.tile/2,q.y+2);ctx.lineTo(q.x+C.tile-4,q.y+C.tile-5);ctx.lineTo(q.x+C.tile/2,q.y+C.tile-10);ctx.lineTo(q.x+4,q.y+C.tile-5);ctx.closePath();ctx.fill();ctx.fillStyle="#f4ecff";ctx.fillRect(q.x+9,q.y+7,C.tile-18,8);ctx.fillStyle=v?P.purple:"#ff314f";ctx.fillRect(q.x+10,q.y+10,3,2);ctx.fillRect(q.x+C.tile-13,q.y+10,3,2);ctx.globalAlpha=pulse;ctx.strokeStyle=v?P.purple:"#7d0d22";ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x+C.tile/2,q.y+C.tile/2,13,0,Math.PI*2);ctx.stroke();ctx.restore();label(v?`${C.stalker.name.toUpperCase()} — VULNERABLE`:C.stalker.name.toUpperCase(),q,v?P.purple:P.red);if(v)drawTransientHealth(s,q,P.purple)}
function drawPlayerResources(p,s,col,kind){if(kind==="remote"||!p||!(p.ammoFlashMs>0))return;ctx.save();ctx.font='bold 13px Consolas, "Courier New"';ctx.textAlign="center";ctx.fillStyle=P.gold;ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(`AMMO ${Math.max(0,p.mana)}`,s.x+C.tile/2,s.y-30);ctx.restore()}
function drawPlayer(p,kind="p1"){
  const s=ws(p.rx,p.ry),col=kind==="p2"?P.green:kind==="remote"?P.cyan:P.gold,cx=s.x+C.tile/2,cy=s.y+C.tile/2,d=p.dir||{x:1,y:0};ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,13,4,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=col;ctx.shadowBlur=p.torchMs>0?13:6;
  // Chunkier CCG dungeon adventurer: hair/face, shoulder armour, backpack, jacket, badge and boots.
  px(cx,cy,-8,-15,16,3,"#21182a");px(cx,cy,-7,-12,14,7,"#c49372");px(cx,cy,-6,-13,12,3,"#392641");px(cx,cy,-5,-9,2,2,"#1a111b");px(cx,cy,3,-9,2,2,"#1a111b");
  px(cx,cy,-11,-6,4,15,"#32233d");px(cx,cy,7,-6,4,15,"#32233d");px(cx,cy,-9,-6,18,17,"#56366e");px(cx,cy,-8,-5,4,13,"#79509b");px(cx,cy,4,-5,4,13,"#79509b");
  px(cx,cy,-12,-4,4,7,"#a5863d");px(cx,cy,8,-4,4,7,"#a5863d");px(cx,cy,-8,10,6,7,"#25202b");px(cx,cy,2,10,6,7,"#25202b");px(cx,cy,-8,15,6,2,"#111015");px(cx,cy,2,15,6,2,"#111015");
  px(cx,cy,-5,-2,10,8,"#17101e");ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(cx-5,cy-2,10,8);ctx.fillStyle=col;ctx.font='bold 6px "Courier New"';ctx.textAlign="center";ctx.fillText("CCG",cx,cy+4);
  const gx=d.x?d.x*10:0,gy=d.y?d.y*10:0;ctx.fillStyle=P.cyan;ctx.fillRect(cx+gx-3-(d.x<0?5:0),cy+gy-2-(d.y<0?5:0),d.x?8:5,d.y?8:5);ctx.fillStyle="#dcefff";ctx.fillRect(cx+gx+(d.x>0?4:d.x<0?-5:-1),cy+gy+(d.y>0?4:d.y<0?-5:-1),2,2);
  if(p.torchMs>0){const tx=cx-d.y*12-d.x*5,ty=cy+d.x*12-d.y*5;ctx.fillStyle="#76512a";ctx.fillRect(tx-1,ty-1,3,10);ctx.fillStyle=P.orange;ctx.fillRect(tx-4,ty-9,8,8);ctx.fillStyle=P.gold;ctx.fillRect(tx-2,ty-11,4,8)}
  if((p.hitStunMs||0)>0){ctx.fillStyle=P.cyan;ctx.fillRect(cx-12,cy-19,4,3);ctx.fillRect(cx+8,cy-18,4,3)}ctx.restore();if(kind==="remote")label(p.name,{x:s.x,y:s.y-2},col);drawTransientHealth(p,s,col);drawPlayerResources(p,s,col,kind)
}
function drawWallLights(){for(const l of world.wallLights||[]){if(!visibleTo(focus,l.x,l.y)&&md(focus,l)>12)continue;const s=ws(l.x,l.y),f=3+Math.sin(performance.now()/70+l.x)*2;ctx.save();ctx.shadowColor=P.orange;ctx.shadowBlur=18;ctx.fillStyle="#6b4b2a";ctx.fillRect(s.x+C.tile/2-2,s.y+10,4,13);ctx.fillStyle=P.orange;ctx.beginPath();ctx.moveTo(s.x+C.tile/2,s.y+11);ctx.quadraticCurveTo(s.x+C.tile/2-f,s.y-4,s.x+C.tile/2,s.y-8);ctx.quadraticCurveTo(s.x+C.tile/2+f,s.y-3,s.x+C.tile/2,s.y+11);ctx.fill();ctx.fillStyle=P.gold;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+4,4,0,Math.PI*2);ctx.fill();ctx.restore()}}
function drawFurniture(){
  for(const d of world.decor||[]){
    if(!visibleTo(focus,d.x,d.y))continue;const q=ws(d.x,d.y),th=W.themeAt(world,d.x,d.y),dark="#241c2c",wood="#6f482b",woodHi="#a66a37",metal="#65707a",glow=th.accent;ctx.save();ctx.globalAlpha=.96;ctx.imageSmoothingEnabled=false;
    if(["shelf","bookcase","tapeStack","slotRack","rack"].includes(d.type)){
      ctx.fillStyle="#3e2418";ctx.fillRect(q.x+3,q.y+3,C.tile-6,C.tile-5);ctx.fillStyle=woodHi;ctx.fillRect(q.x+5,q.y+5,3,C.tile-9);ctx.fillRect(q.x+C.tile-8,q.y+5,3,C.tile-9);for(let y=8;y<C.tile-6;y+=7){ctx.fillStyle="#9a6937";ctx.fillRect(q.x+6,q.y+y,C.tile-12,2);for(let x=8;x<C.tile-9;x+=5){ctx.fillStyle=[P.red,P.cyan,P.gold,P.green,"#a97be0"][(x+y+d.variant)%5];ctx.fillRect(q.x+x,q.y+y-4,3,4)}}
    }else if(["desk","readingDesk","table","bench","counter","driveBench"].includes(d.type)){
      ctx.fillStyle=woodHi;ctx.fillRect(q.x+3,q.y+10,C.tile-6,8);ctx.fillStyle=wood;ctx.fillRect(q.x+6,q.y+18,4,10);ctx.fillRect(q.x+C.tile-10,q.y+18,4,10);ctx.fillStyle="#c58b4a";ctx.fillRect(q.x+6,q.y+11,C.tile-12,2)
    }else if(d.type==="roundChair"){
      ctx.fillStyle="#4b2a24";ctx.beginPath();ctx.arc(q.x+C.tile/2,q.y+15,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#b17745";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=wood;ctx.fillRect(q.x+C.tile/2-7,q.y+23,3,8);ctx.fillRect(q.x+C.tile/2+4,q.y+23,3,8)
    }else if(d.type==="pool"){
      ctx.fillStyle="#092235";ctx.fillRect(q.x+3,q.y+5,C.tile-6,C.tile-10);ctx.fillStyle="#14506c";ctx.fillRect(q.x+5,q.y+7,C.tile-10,C.tile-14);ctx.fillStyle="#45b3c9";ctx.fillRect(q.x+9,q.y+11,9,2);ctx.fillRect(q.x+22,q.y+20,10,2);ctx.fillStyle="#0d3449";ctx.fillRect(q.x+12,q.y+26,16,3)
    }else if(d.type==="pillar"){
      ctx.fillStyle="#8d7a71";ctx.fillRect(q.x+10,q.y+4,C.tile-20,C.tile-8);ctx.fillStyle="#c2ada0";ctx.fillRect(q.x+8,q.y+4,C.tile-16,5);ctx.fillRect(q.x+7,q.y+C.tile-9,C.tile-14,5);ctx.fillStyle="#b48b32";ctx.fillRect(q.x+9,q.y+10,3,C.tile-20);ctx.fillRect(q.x+C.tile-12,q.y+10,3,C.tile-20)
    }else if(d.type==="candleSconce"){
      ctx.fillStyle="#8b6a3d";ctx.fillRect(q.x+C.tile/2-6,q.y+14,12,3);ctx.fillRect(q.x+C.tile/2-1,q.y+10,3,10);ctx.shadowColor=P.orange;ctx.shadowBlur=8;ctx.fillStyle=P.orange;ctx.fillRect(q.x+C.tile/2-3,q.y+5,6,7);ctx.fillStyle=P.gold;ctx.fillRect(q.x+C.tile/2-1,q.y+4,2,5)
    }else if(["terminal","console","oven"].includes(d.type)){
      ctx.fillStyle=metal;ctx.fillRect(q.x+5,q.y+5,C.tile-10,C.tile-8);ctx.fillStyle="#071017";ctx.fillRect(q.x+8,q.y+8,C.tile-16,10);ctx.fillStyle=glow;ctx.fillRect(q.x+10,q.y+10,5,3);ctx.fillRect(q.x+C.tile-15,q.y+12,4,3);ctx.fillStyle="#28303a";ctx.fillRect(q.x+9,q.y+22,C.tile-18,8)
    }else if(["reactor","coil","obelisk","statue","pedestal"].includes(d.type)){
      ctx.fillStyle=metal;ctx.fillRect(q.x+C.tile/2-6,q.y+5,12,C.tile-9);ctx.strokeStyle=glow;ctx.shadowColor=glow;ctx.shadowBlur=8;ctx.strokeRect(q.x+C.tile/2-8,q.y+7,16,C.tile-13);ctx.fillStyle=glow+"88";ctx.fillRect(q.x+C.tile/2-3,q.y+12,6,C.tile-23)
    }else if(["sofa","display","bin","chestPile"].includes(d.type)){
      ctx.fillStyle=d.type==="sofa"?"#5d315f":wood;ctx.fillRect(q.x+4,q.y+11,C.tile-8,13);ctx.fillStyle=glow+"66";ctx.fillRect(q.x+6,q.y+8,C.tile-12,5);ctx.fillStyle="#2c1b31";ctx.fillRect(q.x+7,q.y+24,5,5);ctx.fillRect(q.x+C.tile-12,q.y+24,5,5)
    }else if(["speaker","lightBar","arch"].includes(d.type)){
      ctx.fillStyle=dark;ctx.fillRect(q.x+6,q.y+4,C.tile-12,C.tile-6);ctx.fillStyle=glow;ctx.globalAlpha=.55;ctx.fillRect(q.x+9,q.y+7,C.tile-18,3);ctx.fillRect(q.x+9,q.y+C.tile-10,C.tile-18,3)
    }else if(d.type==="shield"){
      ctx.fillStyle="#2c3440";ctx.beginPath();ctx.moveTo(q.x+C.tile/2,q.y+5);ctx.lineTo(q.x+C.tile-7,q.y+10);ctx.lineTo(q.x+C.tile-10,q.y+26);ctx.lineTo(q.x+C.tile/2,q.y+34);ctx.lineTo(q.x+10,q.y+26);ctx.lineTo(q.x+7,q.y+10);ctx.closePath();ctx.fill();ctx.strokeStyle=P.gold;ctx.stroke()
    }else{
      ctx.fillStyle=wood;ctx.fillRect(q.x+6,q.y+7,C.tile-12,C.tile-10);ctx.strokeStyle=woodHi;ctx.strokeRect(q.x+6,q.y+7,C.tile-12,C.tile-10);ctx.beginPath();ctx.moveTo(q.x+7,q.y+8);ctx.lineTo(q.x+C.tile-7,q.y+C.tile-8);ctx.stroke()
    }
    if(d.blocking){ctx.fillStyle="rgba(0,0,0,.18)";ctx.fillRect(q.x+4,q.y+C.tile-5,C.tile-8,3)}ctx.restore()
  }
}
function drawGenerators(){
  for(const g of host.generators||[]){
    if(!g.alive||!visibleTo(focus,g.x,g.y))continue;const s=ws(g.x,g.y),t=performance.now()/130,powered=Boolean(g.powered),col=powered?P.red:"#62596a";
    ctx.save();ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.rotate(powered?t:t*.15);ctx.strokeStyle=col;ctx.lineWidth=3;ctx.shadowColor=powered?P.red:"transparent";ctx.shadowBlur=powered?10:0;ctx.strokeRect(-9,-9,18,18);ctx.rotate(powered?-t*2:0);ctx.strokeStyle=powered?P.orange:"#403847";ctx.strokeRect(-5,-5,10,10);ctx.restore();
    if(g.hpBarMs>0)drawTransientHealth(g,s,P.orange);if(md(g,focus)<3)label(powered?`GENERATOR ${g.hp}/${g.maxHp}`:`GENERATOR DORMANT — NEEDS LIGHT`,s,powered?P.red:P.grey)
  }
}
function drawShrinesSwitches(){for(const sh of host.shrines||[]){if(!sh.active||!visibleTo(focus,sh.x,sh.y))continue;const s=ws(sh.x,sh.y);ctx.save();ctx.strokeStyle=P.purple;ctx.shadowColor=P.purple;ctx.shadowBlur=12;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+C.tile/2,s.y+3);ctx.lineTo(s.x+C.tile-4,s.y+C.tile-4);ctx.lineTo(s.x+4,s.y+C.tile-4);ctx.closePath();ctx.stroke();ctx.restore();if(md(sh,focus)<2)label("SHRINE",s,P.purple)}for(const sw of host.switches||[]){if(!sw.active||!visibleTo(focus,sw.x,sw.y))continue;const s=ws(sw.x,sw.y),col=sw.revealSecret?P.purple:P.cyan;ctx.save();ctx.fillStyle="#263244";ctx.fillRect(s.x+5,s.y+5,C.tile-10,C.tile-10);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.strokeRect(s.x+6,s.y+6,C.tile-12,C.tile-12);ctx.fillStyle=col;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,5,0,Math.PI*2);ctx.fill();ctx.restore();if(md(sw,focus)<3)label(sw.revealSecret?"REMOTE SECRET SWITCH — SHOOT OR TOUCH":"WALL SWITCH — SHOOT OR TOUCH",s,col)}}
function drawTraps(){const now=performance.now();for(const t of host.traps||[]){if(!visibleTo(focus,t.x,t.y))continue;const s=ws(t.x,t.y),active=SYS.trapActive(t,now),col=t.kind==="fire"?P.orange:t.kind==="shock"?P.cyan:P.red;ctx.save();ctx.globalAlpha=active?1:.38;ctx.strokeStyle=active?col:P.green;ctx.fillStyle=active?col:P.green;ctx.lineWidth=active?3:1.5;if(t.kind==="spike"){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s.x+5+i*7,s.y+C.tile-5);ctx.lineTo(s.x+9+i*7,s.y+8);ctx.lineTo(s.x+13+i*7,s.y+C.tile-5);ctx.stroke()}}else{ctx.strokeRect(s.x+5,s.y+5,C.tile-10,C.tile-10);ctx.beginPath();ctx.moveTo(s.x+6,s.y+6);ctx.lineTo(s.x+C.tile-6,s.y+C.tile-6);ctx.moveTo(s.x+C.tile-6,s.y+6);ctx.lineTo(s.x+6,s.y+C.tile-6);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle=active?col:P.green;ctx.fillRect(s.x+3,s.y+3,6,3);ctx.restore();if(md(t,focus)<=2)label(`${t.kind.toUpperCase()} TRAP — ${active?"ACTIVE":"SAFE CYCLE"}`,s,active?col:P.green)}}
function drawBoulderTrap(){const b=host.boulderTrap;if(!b||(!b.active&&!b.triggered)||!visibleTo(focus,b.x,b.y))return;const s=ws(b.x,b.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,t=performance.now()/90;ctx.save();ctx.translate(cx,cy);ctx.rotate(t*(b.dx||b.dy||1));ctx.shadowColor=b.warningMs>0?P.red:"#6e6671";ctx.shadowBlur=b.warningMs>0?18:8;ctx.fillStyle="#403b44";ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#817887";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#242029";ctx.fillRect(-8,-8,6,5);ctx.fillRect(4,-3,7,5);ctx.fillRect(-4,6,6,5);ctx.fillStyle="#9b919f";ctx.fillRect(-7,-10,5,3);ctx.restore();if(md(b,focus)<=4)label(b.warningMs>0?"BOULDER — MOVE!":"ROLLING BOULDER",s,P.red)}
function drawSpecialObjects(){
  const shops=host.shops?.length?host.shops:[host.trader].filter(Boolean);for(const t of shops)if(t?.active&&visibleTo(focus,t.x,t.y)){t.discovered=true;const s=ws(t.x,t.y),entrance=t.shopType==="entrance",col=entrance?P.cyan:P.gold;ctx.save();ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.strokeStyle=col;ctx.fillStyle="#10222b";ctx.shadowColor=col;ctx.shadowBlur=12;ctx.lineWidth=2;ctx.fillRect(-14,-9,28,19);ctx.strokeRect(-14,-9,28,19);ctx.fillStyle=P.gold;ctx.fillRect(-12,-6,24,4);ctx.fillStyle=col;ctx.fillRect(-10,1,6,5);ctx.fillRect(4,1,6,5);ctx.font='bold 6px "Courier New"';ctx.textAlign="center";ctx.fillText("SHOP",0,9);ctx.restore();if(md(t,focus)<=3)label(entrance?"FLOOR SUPPLY DESK — STEP ON TO SHOP":`SECRET DUNGEON SHOP — TRADE OR BUY`,s,col)}
  for(const c of host.deathCaches||[])if(c.active&&visibleTo(focus,c.x,c.y)){const s=ws(c.x,c.y);ctx.save();ctx.fillStyle="#2a1c31";ctx.strokeStyle=P.red;ctx.lineWidth=2;ctx.shadowColor=P.red;ctx.shadowBlur=9;ctx.fillRect(s.x+5,s.y+8,C.tile-10,C.tile-12);ctx.strokeRect(s.x+5,s.y+8,C.tile-10,C.tile-12);ctx.fillStyle=P.white;ctx.fillRect(s.x+10,s.y+12,C.tile-20,3);ctx.fillStyle=P.red;ctx.fillRect(s.x+C.tile/2-2,s.y+18,4,5);ctx.restore();if(md(c,focus)<=3)label("DEATH CACHE — RECOVER YOUR LOOT",s,P.red)}
  const clue=host.bloodClue;if(clue&&visibleTo(focus,clue.x,clue.y)){const s=ws(clue.x,clue.y);ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle="#7f2637";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+7,s.y+10);ctx.lineTo(s.x+15,s.y+6);ctx.lineTo(s.x+21,s.y+15);ctx.lineTo(s.x+28,s.y+9);ctx.moveTo(s.x+10,s.y+27);ctx.lineTo(s.x+18,s.y+22);ctx.lineTo(s.x+25,s.y+30);ctx.lineTo(s.x+34,s.y+24);ctx.stroke();ctx.restore();if(md(clue,focus)<=2)label(clue.seen?`BLOOD CLUE — ${(clue.sequence||[]).join(" → ")}`:"FADED BLOOD MARKS",s,P.red)}
  const mem=host.memoryPuzzle;if(mem){for(const tile of mem.tiles||[]){if(!visibleTo(focus,tile.x,tile.y))continue;const s=ws(tile.x,tile.y),flash=mem.phase==="show"&&mem.flashTile===tile.index,col=mem.solved?P.green:flash?P.gold:P.cyan;ctx.save();ctx.globalAlpha=mem.solved?.58:flash?1:.42;ctx.fillStyle=flash?"rgba(255,216,90,.45)":"rgba(30,60,82,.34)";ctx.strokeStyle=col;ctx.lineWidth=flash?3:1.5;ctx.shadowColor=flash?P.gold:"transparent";ctx.shadowBlur=flash?16:0;ctx.fillRect(s.x+4,s.y+4,C.tile-8,C.tile-8);ctx.strokeRect(s.x+5,s.y+5,C.tile-10,C.tile-10);ctx.restore()}if(W.roomAt(world,focus.x,focus.y)===mem.roomId&&!mem.solved){const room=world.rooms[mem.roomId],s=ws(Math.floor(room.x+room.w/2),room.y+1);label(mem.phase==="input"?`MEMORY TILES — ${mem.inputIndex||0}/5`:"MEMORY TILES — WATCH",s,P.cyan)}}
  const tp=host.sequenceTorchPuzzle;if(tp){for(const torch of tp.torches||[]){if(!visibleTo(focus,torch.x,torch.y))continue;const s=ws(torch.x,torch.y),lit=torch.lit||tp.solved;ctx.save();ctx.fillStyle="#65452c";ctx.fillRect(s.x+C.tile/2-2,s.y+14,4,17);ctx.strokeStyle=lit?P.gold:"#6d6172";ctx.lineWidth=2;ctx.strokeRect(s.x+8,s.y+7,C.tile-16,C.tile-13);if(lit){ctx.shadowColor=P.orange;ctx.shadowBlur=16;ctx.fillStyle=P.orange;ctx.beginPath();ctx.moveTo(s.x+C.tile/2,s.y+16);ctx.quadraticCurveTo(s.x+C.tile/2-9,s.y+4,s.x+C.tile/2,s.y-2);ctx.quadraticCurveTo(s.x+C.tile/2+9,s.y+5,s.x+C.tile/2,s.y+16);ctx.fill()}ctx.fillStyle=lit?P.gold:P.grey;ctx.font='bold 10px "Courier New"';ctx.textAlign="center";ctx.fillText(torch.dir,s.x+C.tile/2,s.y+C.tile-5);ctx.restore();if(md(torch,focus)<=2)label(`${torch.dir} TORCH — ${lit?"LIT":"SHOOT OR TOUCH"}`,s,lit?P.gold:P.grey)}}
  const wb=host.weightBridge;if(wb){for(const q of wb.pitTiles||[]){if(!visibleTo(focus,q.x,q.y))continue;const s=ws(q.x,q.y);ctx.fillStyle="#020104";ctx.fillRect(s.x,s.y,C.tile,C.tile);ctx.strokeStyle="rgba(95,73,112,.32)";ctx.strokeRect(s.x+1,s.y+1,C.tile-2,C.tile-2)}for(const q of wb.bridgeTiles||[]){if(!visibleTo(focus,q.x,q.y))continue;const s=ws(q.x,q.y);ctx.fillStyle=wb.stabilized?"#725337":"#5c402d";ctx.fillRect(s.x+2,s.y+5,C.tile-4,C.tile-10);ctx.strokeStyle=wb.stabilized?P.green:"#9d7449";ctx.lineWidth=1.5;ctx.strokeRect(s.x+2,s.y+5,C.tile-4,C.tile-10);ctx.strokeStyle="rgba(20,10,7,.7)";for(let n=9;n<C.tile-6;n+=8){ctx.beginPath();ctx.moveTo(s.x+4,s.y+n);ctx.lineTo(s.x+C.tile-4,s.y+n);ctx.stroke()}}if(W.roomAt(world,focus.x,focus.y)===wb.roomId&&!wb.stabilized){const q=(wb.bridgeTiles||[])[1]||(wb.bridgeTiles||[])[0];if(q)label("ROTTEN BRIDGE — EMPTY INVENTORY ONLY",ws(q.x,q.y),P.gold)}}
}
function drawRescue(){const r=host.rescue;if(!r||r.rescued||!visibleTo(focus,r.x,r.y))return;const s=ws(r.x,r.y);ctx.fillStyle=P.green;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,9,0,Math.PI*2);ctx.fill();ctx.fillStyle=P.black;ctx.font='bold 7px "Courier New"';ctx.textAlign="center";ctx.fillText("CCG",s.x+C.tile/2,s.y+C.tile/2+2);label(r.following?"FOLLOWING":"TRAPPED SCOUT",s,P.green)}
function drawShots(){ctx.save();ctx.lineCap="round";for(const b of bullets){const s=ws(b.x,b.y),x=s.x+C.tile/2,y=s.y+C.tile/2,col=b.element==="fire"?P.orange:b.element==="shock"?P.cyan:b.element==="physical"?P.white:P.gold;ctx.strokeStyle=col;ctx.lineWidth=b.style==="shock"?5:4;ctx.shadowColor=col;ctx.shadowBlur=9;ctx.beginPath();ctx.moveTo(x-b.dx*12,y-b.dy*12);ctx.lineTo(x+b.dx*3,y+b.dy*3);ctx.stroke()}for(const b of enemyBullets){const s=ws(b.x,b.y),x=s.x+C.tile/2,y=s.y+C.tile/2,col=b.style==="food"?P.orange:b.style==="root"?P.green:b.style==="fire"?P.gold:b.style==="shock"?P.cyan:P.red;ctx.strokeStyle=col;ctx.lineWidth=b.style==="fire"?7:4;ctx.shadowColor=col;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(x-b.dx*12,y-b.dy*12);ctx.lineTo(x+b.dx*2,y+b.dy*2);ctx.stroke()}ctx.restore()}
function drawEffects(){for(const q of particles){ctx.globalAlpha=Math.max(0,q.life/360);ctx.fillStyle=q.col;ctx.fillRect(view.x+q.x-cam.x,view.y+q.y-cam.y,q.size,q.size)}ctx.globalAlpha=1;for(const r of rings){ctx.globalAlpha=Math.max(0,r.life/340);ctx.strokeStyle=r.col;ctx.lineWidth=2;ctx.beginPath();ctx.arc(view.x+r.x-cam.x,view.y+r.y-cam.y,r.r,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;for(const f of floaters){const owner=f.ownerId?localPlayers().find(p=>p.id===f.ownerId):null,age=1-Math.max(0,f.life)/Math.max(1,f.maxLife||720),scale=f.pickup?(f.startScale+(f.endScale-f.startScale)*Math.min(1,age/.62)):1,x=owner?owner.rx*C.tile+C.tile/2:f.x,y=owner?owner.ry*C.tile-11-age*18:f.y;ctx.save();ctx.globalAlpha=f.pickup?Math.min(1,age*7)*Math.min(1,f.life/300):Math.max(0,f.life/420);ctx.translate(view.x+x-cam.x,view.y+y-cam.y);ctx.scale(scale,scale);ctx.fillStyle=f.col;ctx.strokeStyle="rgba(5,2,9,.92)";ctx.lineWidth=f.pickup?4:2;ctx.shadowColor=f.col;ctx.shadowBlur=f.pickup?18:5;ctx.font=f.pickup?'bold 15px Orbitron, Consolas, "Courier New"':'bold 12px Consolas, "Courier New"';ctx.textAlign="center";ctx.textBaseline="bottom";ctx.strokeText(f.text,0,0);ctx.fillText(f.text,0,0);ctx.restore()}ctx.globalAlpha=1}
function drawHazards(){for(const h of hazards){const s=ws(h.x,h.y),t=Math.max(0,h.life/h.maxLife);ctx.globalAlpha=.45+.4*Math.abs(Math.sin(performance.now()/70));ctx.strokeStyle=P.red;ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,8+(1-t)*8,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
function drawFog(){const ex=explored.get(focus.id)||new Set(),x0=Math.max(0,Math.floor(cam.x/C.tile)-1),x1=Math.min(C.worldWidth-1,Math.ceil((cam.x+view.w)/C.tile)+1),y0=Math.max(0,Math.floor(cam.y/C.tile)-1),y1=Math.min(C.worldHeight-1,Math.ceil((cam.y+view.h)/C.tile)+1);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(visibleTo(focus,x,y))continue;const s=ws(x,y);ctx.fillStyle=ex.has(`${x},${y}`)?"rgba(0,0,0,.92)":"rgba(0,0,0,1)";ctx.fillRect(s.x,s.y,C.tile,C.tile)}if(focus.torchMs>0){const s=ws(focus.rx,focus.ry),g=ctx.createRadialGradient(s.x+C.tile/2,s.y+C.tile/2,18,s.x+C.tile/2,s.y+C.tile/2,C.player.torchRadius*C.tile);g.addColorStop(0,"rgba(255,216,90,.14)");g.addColorStop(1,"rgba(255,180,60,0)");ctx.fillStyle=g;ctx.fillRect(view.x,view.y,view.w,view.h)}for(const l of world.wallLights||[]){const s=ws(l.x,l.y),g=ctx.createRadialGradient(s.x+C.tile/2,s.y+C.tile/2,10,s.x+C.tile/2,s.y+C.tile/2,l.radius*C.tile);g.addColorStop(0,"rgba(255,195,80,.10)");g.addColorStop(1,"rgba(255,160,50,0)");ctx.fillStyle=g;ctx.fillRect(view.x,view.y,view.w,view.h)}}
let referenceGuideBuilt=false;
const radarCanvasEl=document.getElementById("radar-canvas"),radarCtx=radarCanvasEl?.getContext("2d")||null;
function buildReferenceGuide(){
  if(referenceGuideBuilt)return;referenceGuideBuilt=true;
  const named=document.getElementById("named-enemy-guide"),items=document.getElementById("item-quick-guide");
  if(named){
    for(const f of C.followerElites){
      const row=document.createElement("div");row.className="named-guide-entry";
      const img=document.createElement("img");img.src=f.avatar||"";img.alt=f.name;img.onerror=()=>{img.style.display="none"};
      const copy=document.createElement("div");copy.className="named-guide-copy";
      const title=document.createElement("b");title.textContent=f.name;
      const detail=document.createElement("span");detail.textContent=`${f.kind.toUpperCase()} · ARM ${f.armor||0}`;
      copy.append(title,detail);row.append(img,copy);named.append(row)
    }
  }
  if(items){
    const defs=[
      ["+",P.green,"HEALTH","+3 HP"],["AM",P.cyan,"AMMO","+40 shots"],["P",P.green,"POTION","E: heal + ammo"],["B",P.purple,"BANISH FLASK","B: use when prompted"],["T",P.gold,"TORCH",`${Math.round(C.player.torchRadius*2)}-tile light`],
      ["A",P.blue,"ARMOUR","absorbs hits"],["BK",P.gold,"BRONZE KEY","optional locks"],["KEY",P.gold,"MAIN KEY","floor objective"],["SIG",P.gold,"EXIT SIGIL","required to leave"],
      ["W",P.orange,"WEAPON","random upgrade"],["RF",P.orange,"RAPID FIRE","temporary boost"],["▣",P.gold,"CHEST","random loot"],["✦",P.purple,"SHRINE","blessing / risk"]
    ];
    for(const [icon,col,name,desc] of defs){
      const row=document.createElement("div");row.className="item-guide-entry";
      const ic=document.createElement("div");ic.className="item-guide-icon";ic.style.color=col;ic.textContent=icon;
      const copy=document.createElement("div");copy.className="item-guide-copy";
      const title=document.createElement("b");title.textContent=name;const detail=document.createElement("span");detail.textContent=desc;
      copy.append(title,detail);row.append(ic,copy);items.append(row)
    }
  }
}
function renderRadarPanel(p){
  if(!radarCtx||!radarCanvasEl||!world||!p)return;
  const r=radarCanvasEl.getBoundingClientRect(),rw=Math.max(260,Math.round(r.width)),rh=Math.max(140,Math.round(r.height));
  if(radarCanvasEl.width!==rw||radarCanvasEl.height!==rh){radarCanvasEl.width=rw;radarCanvasEl.height=rh}
  radarCtx.clearRect(0,0,rw,rh);radarCtx.fillStyle="#030205";radarCtx.fillRect(0,0,rw,rh);
  const pad=9,cols=Math.min(C.worldWidth,Math.max(46,Math.floor(rw/6))),rows=Math.min(C.worldHeight,Math.max(24,Math.floor(rh/5.5))),minX=Math.max(0,Math.min(C.worldWidth-cols,Math.round(p.x-cols/2))),minY=Math.max(0,Math.min(C.worldHeight-rows,Math.round(p.y-rows/2))),maxX=minX+cols,maxY=minY+rows,sc=Math.min((rw-pad*2)/cols,(rh-pad*2)/rows),mw=cols*sc,mh=rows*sc,ox=(rw-mw)/2,oy=(rh-mh)/2,ex=explored.get(p.id)||new Set(),inside=q=>q&&q.x>=minX&&q.x<maxX&&q.y>=minY&&q.y<maxY,px=q=>ox+(q.x-minX)*sc,py=q=>oy+(q.y-minY)*sc;
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){if(!ex.has(`${x},${y}`))continue;radarCtx.fillStyle=world.map[y][x]?"#292233":"#655879";radarCtx.fillRect(px({x,y}),py({x,y}),Math.max(1,sc+.15),Math.max(1,sc+.15))}
  const trail=playerTrails.get(p.id)||[];radarCtx.fillStyle="rgba(108,236,255,.72)";for(let i=Math.max(0,trail.length-420);i<trail.length;i+=3){const q=trail[i];if(inside(q))radarCtx.fillRect(px(q),py(q),Math.max(1.5,sc),Math.max(1.5,sc))}
  // Radar knowledge is earned, never globally revealed. Remember both the Exit Sigil and the reinforced Sigil Gate only after the player has actually seen their tiles.
  const sigil=(host.items||[]).find(i=>i.active&&i.kind==="exitSigil");if(sigil&&(ex.has(`${sigil.x},${sigil.y}`)||visibleTo(p,sigil.x,sigil.y)))host.radarSigilSeen={x:sigil.x,y:sigil.y};
  const sigilGate=(host.doors||[]).find(d=>d.sigilGate);if(sigilGate&&(ex.has(`${sigilGate.x},${sigilGate.y}`)||visibleTo(p,sigilGate.x,sigilGate.y)))host.radarSigilGateSeen={x:sigilGate.x,y:sigilGate.y};
  const gateNav=Boolean(host.exitSigilCollected&&host.radarSigilGateSeen),marker=gateNav?host.radarSigilGateSeen:(!host.exitSigilCollected?host.radarSigilSeen:null),legend=document.getElementById("radar-sigil-label");if(legend)legend.textContent=gateNav?"SIGIL GATE":"SIGIL";
  if(marker&&inside(marker)){const q=marker;radarCtx.save();radarCtx.fillStyle=gateNav?P.purple:P.gold;radarCtx.strokeStyle=P.white;radarCtx.lineWidth=1;radarCtx.beginPath();radarCtx.moveTo(px(q),py(q)-5);radarCtx.lineTo(px(q)+5,py(q));radarCtx.lineTo(px(q),py(q)+5);radarCtx.lineTo(px(q)-5,py(q));radarCtx.closePath();radarCtx.fill();radarCtx.stroke();if(gateNav){radarCtx.fillStyle=P.white;radarCtx.fillRect(px(q)-1,py(q)-3,2,6)}radarCtx.restore()}
  // A death cache is player knowledge: keep it marked until it has actually been recovered.
  for(const cache of host.deathCaches||[])if(cache.active&&inside(cache)){const cx=px(cache),cy=py(cache);radarCtx.save();radarCtx.strokeStyle="#ff6076";radarCtx.lineWidth=2;radarCtx.beginPath();radarCtx.moveTo(cx-3,cy-3);radarCtx.lineTo(cx+3,cy+3);radarCtx.moveTo(cx+3,cy-3);radarCtx.lineTo(cx-3,cy+3);radarCtx.stroke();radarCtx.restore()}
  for(const shop of host.shops||[])if(shop.active&&shop.discovered&&inside(shop)){const sx=px(shop),sy=py(shop);radarCtx.fillStyle=P.gold;radarCtx.strokeStyle="#fff4bb";radarCtx.fillRect(sx-4,sy-3,8,6);radarCtx.strokeRect(sx-4,sy-3,8,6);radarCtx.fillStyle=P.cyan;radarCtx.fillRect(sx-3,sy-1,2,3);radarCtx.fillRect(sx+1,sy-1,2,3)}
  if(ex.has(`${world.exit.x},${world.exit.y}`)&&inside(world.exit)){radarCtx.fillStyle=host.exitOpen?P.purple:"#71637d";radarCtx.fillRect(px(world.exit)-2,py(world.exit)-2,5,5)}
  radarCtx.strokeStyle="rgba(108,236,255,.24)";radarCtx.strokeRect(ox+.5,oy+.5,mw-1,mh-1);radarCtx.fillStyle=P.cyan;radarCtx.strokeStyle=P.white;radarCtx.lineWidth=1;radarCtx.fillRect(px(p)-3,py(p)-3,7,7);radarCtx.strokeRect(px(p)-3,py(p)-3,7,7)
}
function renderView(p,v){
  view=v;focus=p;cam=camFor(p,v);ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.w,v.h);ctx.clip();ctx.fillStyle=P.black;ctx.fillRect(v.x,v.y,v.w,v.h);const x0=Math.max(0,Math.floor(cam.x/C.tile)-1),x1=Math.min(C.worldWidth-1,Math.ceil((cam.x+v.w)/C.tile)+1),y0=Math.max(0,Math.floor(cam.y/C.tile)-1),y1=Math.min(C.worldHeight-1,Math.ceil((cam.y+v.h)/C.tile)+1);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)drawTile(x,y);drawFurniture();drawDoors();drawExit();drawWallLights();drawHazards();drawBoulderTrap();drawTraps();drawGenerators();drawShrinesSwitches();drawChests();drawSpecialObjects();host.items.forEach(drawItem);host.enemies.forEach(drawEnemy);drawStalker();drawRescue();drawShots();for(const r of remote.values())if(performance.now()-r.lastSeen<2600&&visibleTo(p,r.x,r.y))drawPlayer(r,"remote");for(const lp of localPlayers())drawPlayer(lp,lp===p2?"p2":"p1");drawEffects();drawFog();ctx.restore()
}
function render(){if(!world||!p1)return;renderShake=shake>0?{x:(Math.random()-.5)*shake,y:(Math.random()-.5)*shake}:{x:0,y:0};if(shake>0){shake*=.84;if(shake<.25)shake=0}ctx.fillStyle=P.black;ctx.fillRect(0,0,canvas.width,canvas.height);if(p2){renderView(p1,{x:0,y:0,w:canvas.width/2,h:canvas.height});renderView(p2,{x:canvas.width/2,y:0,w:canvas.width/2,h:canvas.height});ctx.fillStyle=P.purple;ctx.fillRect(canvas.width/2-2,0,4,canvas.height)}else renderView(p1,{x:0,y:0,w:canvas.width,h:canvas.height});buildReferenceGuide();renderRadarPanel(p1);if(damageFlash>0){ctx.fillStyle=`rgba(255,50,70,${Math.min(.18,damageFlash*.18)})`;ctx.fillRect(0,0,canvas.width,canvas.height)}}
function resizeGameCanvas(){
  const area=document.querySelector(".canvas-wrap");if(!area)return;const r=area.getBoundingClientRect(),w=Math.max(640,Math.floor(r.width)),h=Math.max(360,Math.floor(r.height));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false;cameras.clear()}
}
function syncFullscreenState(){const on=Boolean(document.fullscreenElement);if(UI.fullscreenHint)UI.fullscreenHint.classList.toggle("hidden",on);const b=$("fullscreen-btn");if(b)b.textContent=on?"EXIT FULLSCREEN":"FULLSCREEN";requestAnimationFrame(resizeGameCanvas)}
function pause(force=false){if(mode==="playing"&&!force){mode="paused";UI.pause.classList.remove("hidden");S.setMusicLevel(.03)}else if(mode==="paused"){mode="playing";UI.pause.classList.add("hidden");input.clear();S.setMusicLevel(.075)}}
async function toggleFullscreen(){const shell=document.querySelector(".ccg-game");try{if(!document.fullscreenElement)await shell.requestFullscreen();else await document.exitFullscreen()}catch(_){showToast("FULLSCREEN UNAVAILABLE","Your browser blocked fullscreen for this session.","red")}}
function toggleSound(){S.toggle();sync()}
function loop(t){const dt=Math.min(45,t-last||16);last=t;if(damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500);update(dt);render();requestAnimationFrame(loop)}
