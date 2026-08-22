function camFor(p,v){let c=cameras.get(p.id)||{x:0,y:0};const tx=Math.max(0,Math.min(C.worldWidth*C.tile-v.w,p.rx*C.tile+C.tile/2-v.w/2)),ty=Math.max(0,Math.min(C.worldHeight*C.tile-v.h,p.ry*C.tile+C.tile/2-v.h/2));c.x=tx;c.y=ty;cameras.set(p.id,c);return c}
function ws(x,y){return{x:view.x+x*C.tile-cam.x+renderShake.x,y:view.y+y*C.tile-cam.y+renderShake.y}}
function tileHash(x,y,salt=0){let h=Math.imul(x+17,73856093)^Math.imul(y+31,19349663)^Math.imul(salt+7,83492791);h^=h>>>13;h=Math.imul(h,1274126177);return(h^(h>>>16))>>>0}
function drawTile(x,y){
  const s=ws(x,y),th=W.themeAt(world,x,y),wall=world.map[y][x]!==0,roomId=W.roomAt(world,x,y),room=world.rooms[roomId],variant=room?.variant||0;
  if(wall){
    const h=tileHash(x,y,variant),course=(y+h%2)%2,theme=room?.theme||"";ctx.fillStyle="#08060b";ctx.fillRect(s.x,s.y,C.tile,C.tile);ctx.fillStyle=th.wall;ctx.fillRect(s.x+1,s.y+1,C.tile-2,C.tile-2);
    // Deep blockwork: inset courses, mortar, chipped corners and directional bevels.
    ctx.fillStyle="rgba(255,255,255,.075)";ctx.fillRect(s.x+2,s.y+2,C.tile-4,3);ctx.fillRect(s.x+2,s.y+5,2,C.tile-9);ctx.fillStyle="rgba(0,0,0,.34)";ctx.fillRect(s.x+C.tile-5,s.y+5,4,C.tile-6);ctx.fillRect(s.x+5,s.y+C.tile-5,C.tile-9,4);
    ctx.strokeStyle="rgba(8,5,12,.52)";ctx.lineWidth=2;for(let row=0;row<2;row++){const yy=s.y+9+row*16,offset=(row+course)%2?10:-6;ctx.beginPath();ctx.moveTo(s.x+2,yy);ctx.lineTo(s.x+C.tile-3,yy);ctx.stroke();for(let joint=offset;joint<C.tile;joint+=21){ctx.beginPath();ctx.moveTo(s.x+joint,yy);ctx.lineTo(s.x+joint,yy+15);ctx.stroke()}}
    // Individual brick staining breaks the old single-colour wall read. The
    // medieval rooms favour warm ochre, burgundy, moss and soot while the C64
    // rooms retain their neon accents underneath the masonry treatment.
    const medieval=["IRON_KEEP","MOSS_CRYPT","EMBER_DUNGEON","SPIDER_NEST"].includes(theme),brickPalette=theme==="MOSS_CRYPT"?["#7f8152","#51613f","#8b7048","#394b37"]:theme==="EMBER_DUNGEON"?["#9a4732","#723124","#b16038","#4e2722"]:theme==="IRON_KEEP"?["#8a5a3f","#6f3e35","#a6784e","#4c3430"]:theme==="SPIDER_NEST"?["#554758","#382f3e","#70626f","#29242e"]:[th.hi,th.wall,"#6c475d","#3d4f58"];
    ctx.save();ctx.globalAlpha=medieval?.28:.11;for(let row=0;row<2;row++){const yy=s.y+10+row*16,offset=(row+course)%2?-6:10;for(let joint=offset;joint<C.tile;joint+=21){ctx.fillStyle=brickPalette[(h+row+joint)%brickPalette.length];ctx.fillRect(s.x+Math.max(3,joint+2),yy+2,Math.min(17,C.tile-joint-6),11)}}ctx.restore();
    ctx.strokeStyle="rgba(255,255,255,.035)";ctx.lineWidth=1;ctx.strokeRect(s.x+5,s.y+6,C.tile-10,C.tile-11);
    if(h%5===0){ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(s.x+5+(h%23),s.y+7+((h>>>4)%24),3+(h%5),2);ctx.fillStyle=th.hi+"45";ctx.fillRect(s.x+6+(h%23),s.y+7+((h>>>4)%24),2,1)}
    if(h%11===0){ctx.strokeStyle="rgba(8,4,12,.68)";ctx.lineWidth=1.4;ctx.beginPath();const sx=s.x+7+(h%25),sy=s.y+5+((h>>>7)%18);ctx.moveTo(sx,sy);ctx.lineTo(sx-3,sy+7);ctx.lineTo(sx+2,sy+12);ctx.lineTo(sx-2,sy+19);ctx.stroke()}
    // Theme-specific wall hardware keeps rooms materially distinct.
    if(theme==="SID_REACTOR"||theme==="1541_WORKSHOP"){ctx.fillStyle="#77818d";for(const [rx,ry] of [[6,7],[C.tile-9,7],[6,C.tile-10],[C.tile-9,C.tile-10]])ctx.fillRect(s.x+rx,s.y+ry,3,3);ctx.strokeStyle=th.accent+"70";ctx.beginPath();ctx.moveTo(s.x+8,s.y+C.tile/2);ctx.lineTo(s.x+C.tile-8,s.y+C.tile/2);ctx.stroke()}
    else if(theme==="C64_ARCHIVE"||theme==="TAPE_STORE"){ctx.fillStyle="rgba(11,8,16,.5)";ctx.fillRect(s.x+8,s.y+12,C.tile-16,14);ctx.strokeStyle=th.accent+"62";ctx.strokeRect(s.x+9,s.y+13,C.tile-18,12);ctx.fillStyle=th.accent+"75";ctx.fillRect(s.x+13,s.y+17,5,4);ctx.fillRect(s.x+C.tile-18,s.y+17,5,4)}
    else if(theme==="ZZAP_LIBRARY"){for(let bx=7;bx<C.tile-6;bx+=6){ctx.fillStyle=["#6c2f3d","#345e78","#8a6930","#4e7041"][(bx+h)%4];ctx.fillRect(s.x+bx,s.y+11,4,18-(bx%3)*2)}ctx.fillStyle="#a47736";ctx.fillRect(s.x+5,s.y+28,C.tile-10,3)}
    else if(theme==="WARP_GALLERY"||theme==="MODEM_EXCHANGE"){ctx.strokeStyle=th.accent+"72";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+7,s.y+31);ctx.lineTo(s.x+14,s.y+20);ctx.lineTo(s.x+22,s.y+25);ctx.lineTo(s.x+34,s.y+9);ctx.stroke();for(const [nx,ny] of [[7,31],[14,20],[22,25],[34,9]]){ctx.fillStyle=th.accent;ctx.fillRect(s.x+nx-1,s.y+ny-1,3,3)}}
    else if(["IRON_KEEP","MOSS_CRYPT","EMBER_DUNGEON"].includes(theme)){ctx.strokeStyle="rgba(20,12,10,.72)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s.x+6,s.y+8);ctx.lineTo(s.x+C.tile-6,s.y+C.tile-8);ctx.stroke();ctx.fillStyle="#332821";ctx.fillRect(s.x+5,s.y+5,5,5);ctx.fillRect(s.x+C.tile-10,s.y+C.tile-10,5,5);ctx.fillStyle=th.accent+"70";ctx.fillRect(s.x+7,s.y+7,2,2);ctx.fillRect(s.x+C.tile-9,s.y+C.tile-9,2,2)}
    else if(theme==="SPIDER_NEST"){ctx.strokeStyle="rgba(225,232,244,.34)";ctx.lineWidth=1;const cx=s.x+C.tile/2,cy=s.y+C.tile/2;for(let n=0;n<5;n++){const a=n*Math.PI/4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*22,cy+Math.sin(a)*22);ctx.stroke()}ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.arc(cx,cy,15,0,Math.PI*2);ctx.stroke()}
    return;
  }
  const h=tileHash(x,y,variant+roomId),theme=room?.theme||"";ctx.fillStyle=(x+y+variant)%2?th.floor:th.alt;ctx.fillRect(s.x,s.y,C.tile,C.tile);
  // Layered flagstone: recessed seams, fine grain, scuffs and theme inlays.
  ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(s.x+2,s.y+2,C.tile-5,2);ctx.fillRect(s.x+2,s.y+4,2,C.tile-7);ctx.fillStyle="rgba(0,0,0,.18)";ctx.fillRect(s.x,s.y+C.tile-4,C.tile,4);ctx.fillRect(s.x+C.tile-4,s.y,4,C.tile);ctx.strokeStyle="rgba(0,0,0,.22)";ctx.lineWidth=1;ctx.strokeRect(s.x+.5,s.y+.5,C.tile-1,C.tile-1);
  for(let grain=0;grain<3;grain++){const gx=4+((h>>>(grain*5))%(C.tile-9)),gy=5+((h>>>(grain*7+3))%(C.tile-10));ctx.fillStyle=grain===0?"rgba(255,255,255,.035)":"rgba(0,0,0,.07)";ctx.fillRect(s.x+gx,s.y+gy,1+(h>>grain)%3,1)}
  if(h%9===0){ctx.strokeStyle="rgba(7,4,10,.38)";ctx.beginPath();ctx.moveTo(s.x+5+(h%8),s.y+9);ctx.lineTo(s.x+17,s.y+18);ctx.lineTo(s.x+13+(h%11),s.y+30);ctx.stroke();ctx.strokeStyle=th.hi+"22";ctx.beginPath();ctx.moveTo(s.x+6+(h%8),s.y+9);ctx.lineTo(s.x+18,s.y+18);ctx.stroke()}
  if(h%13===0){ctx.fillStyle="rgba(8,4,12,.16)";ctx.beginPath();ctx.ellipse(s.x+10+(h%22),s.y+9+((h>>>6)%20),6+(h%4),3+(h%3),0,0,Math.PI*2);ctx.fill()}
  if(["IRON_KEEP","MOSS_CRYPT","EMBER_DUNGEON"].includes(theme)){ctx.strokeStyle="rgba(14,8,7,.44)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+3,s.y+C.tile/2);ctx.lineTo(s.x+C.tile-3,s.y+C.tile/2);ctx.moveTo(s.x+C.tile/2,s.y+3);ctx.lineTo(s.x+C.tile/2,s.y+C.tile-3);ctx.stroke();ctx.fillStyle=th.hi+"28";ctx.fillRect(s.x+4,s.y+4,C.tile/2-7,C.tile/2-7);ctx.fillRect(s.x+C.tile/2+2,s.y+C.tile/2+2,C.tile/2-6,C.tile/2-6)}
  if(theme==="SPIDER_NEST"){ctx.fillStyle="rgba(2,2,4,.30)";ctx.beginPath();ctx.ellipse(s.x+C.tile/2,s.y+C.tile/2,12+(h%7),5+(h%4),(h%6)*.25,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(225,232,244,.19)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s.x+2,s.y+4);ctx.quadraticCurveTo(s.x+C.tile/2,s.y+C.tile/2,s.x+C.tile-3,s.y+7);ctx.moveTo(s.x+5,s.y+C.tile-3);ctx.quadraticCurveTo(s.x+C.tile/2,s.y+C.tile/2,s.x+C.tile-4,s.y+8);ctx.stroke()}
  ctx.fillStyle=th.accent+"18";const code=(x*31+y*17+roomId*7+variant*11)%41;
  if(theme==="SID_REACTOR"&&code%5===0){ctx.strokeStyle=th.accent+"55";ctx.beginPath();ctx.moveTo(s.x+5,s.y+7);ctx.lineTo(s.x+18,s.y+7);ctx.lineTo(s.x+18,s.y+18);ctx.lineTo(s.x+34,s.y+18);ctx.stroke();ctx.fillStyle=th.accent+"88";ctx.fillRect(s.x+16,s.y+16,4,4)}
  else if(theme==="ARMOURY"&&code%6===0){ctx.strokeStyle="rgba(180,190,205,.2)";ctx.strokeRect(s.x+6,s.y+6,C.tile-12,C.tile-12);ctx.fillStyle="#8a6a35";for(const [rx,ry] of [[7,7],[C.tile-9,7],[7,C.tile-9],[C.tile-9,C.tile-9]])ctx.fillRect(s.x+rx,s.y+ry,2,2)}
  else if(theme==="WARP_GALLERY"&&code%4===0){ctx.strokeStyle=th.accent+"48";ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,10+(h%5),0,Math.PI*2);ctx.stroke()}
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
    const base=d.type==="room"?"#754624":d.type==="switch"?"#59452f":d.type==="secret"?"#50405c":"#86572d";ctx.save();ctx.shadowColor=d.locked?lockedCol:"rgba(214,157,82,.34)";ctx.shadowBlur=d.locked?10:5;ctx.lineCap="square";
    if(d.type==="secret"){
      const slide=(C.tile-5)*eased,th=secretWallTheme(d);ctx.fillStyle=th.wall;ctx.strokeStyle=th.hi;ctx.lineWidth=2;
      if(d.orientation==="horizontal"){const y=d.side==="north"?s.y+1:d.side==="south"?s.y+C.tile-8:s.y+C.tile/2-4,dir=d.side==="north"?-1:d.side==="south"?1:(((d.x+d.y)%2)?1:-1);ctx.fillRect(s.x+3,y+dir*slide,C.tile-6,8);ctx.strokeRect(s.x+3,y+dir*slide,C.tile-6,8)}
      else{const x=d.side==="west"?s.x+1:d.side==="east"?s.x+C.tile-8:s.x+C.tile/2-4,dir=d.side==="west"?-1:d.side==="east"?1:(((d.x+d.y)%2)?1:-1);ctx.fillRect(x+dir*slide,s.y+3,8,C.tile-6);ctx.strokeRect(x+dir*slide,s.y+3,8,C.tile-6)}
    }else{
      const horizontal=d.orientation==="horizontal",hingeAtStart=((d.id?.length||0)+d.x+d.y)%2===0,leafLen=C.tile-7,closedAngle=horizontal?0:Math.PI/2;let swingSign;if(horizontal)swingSign=d.side==="north"?1:d.side==="south"?-1:(hingeAtStart?1:-1);else swingSign=d.side==="west"?-1:d.side==="east"?1:(hingeAtStart?-1:1);const angle=closedAngle+swingSign*eased*Math.PI/2,hx=horizontal?(hingeAtStart?s.x+4:s.x+C.tile-4):(d.side==="west"?s.x+3:d.side==="east"?s.x+C.tile-3:s.x+C.tile/2),hy=horizontal?(d.side==="north"?s.y+3:d.side==="south"?s.y+C.tile-3:s.y+C.tile/2):(hingeAtStart?s.y+4:s.y+C.tile-4),dir=hingeAtStart?1:-1;
      ctx.strokeStyle=d.locked?lockedCol:"#d1b2df";ctx.lineWidth=3;if(horizontal){const fy=d.side==="north"?s.y+2:d.side==="south"?s.y+C.tile-2:s.y+C.tile/2;ctx.beginPath();ctx.moveTo(s.x+1,fy);ctx.lineTo(s.x+C.tile-1,fy);ctx.stroke()}else{const fx=d.side==="west"?s.x+2:d.side==="east"?s.x+C.tile-2:s.x+C.tile/2;ctx.beginPath();ctx.moveTo(fx,s.y+1);ctx.lineTo(fx,s.y+C.tile-1);ctx.stroke()}
      ctx.save();ctx.translate(hx,hy);ctx.rotate(angle);const leafX=dir>0?0:-leafLen,wood=ctx.createLinearGradient(leafX,-6,leafX+leafLen,6);wood.addColorStop(0,"#3b2418");wood.addColorStop(.28,base);wood.addColorStop(.7,"#9b6537");wood.addColorStop(1,"#4a2c1b");ctx.fillStyle=wood;ctx.strokeStyle=d.locked?lockedCol:"#c89557";ctx.lineWidth=2;ctx.fillRect(leafX,-7,leafLen,14);ctx.strokeRect(leafX,-7,leafLen,14);ctx.strokeStyle="rgba(37,18,10,.75)";ctx.lineWidth=1;for(let board=5;board<leafLen;board+=8){const bx=dir>0?leafX+board:leafX+leafLen-board;ctx.beginPath();ctx.moveTo(bx,-6);ctx.lineTo(bx,6);ctx.stroke()}ctx.fillStyle="#343238";ctx.fillRect(leafX+2,-6,Math.max(3,leafLen-4),2);ctx.fillRect(leafX+2,4,Math.max(3,leafLen-4),2);ctx.fillStyle="#9a8c73";for(const rivet of [4,leafLen-5]){const rx=dir>0?leafX+rivet:leafX+leafLen-rivet;ctx.fillRect(rx,-5,2,2);ctx.fillRect(rx,3,2,2)}const handleLocal=dir>0?leafLen-5:-leafLen+5;ctx.fillStyle="#f0d16a";ctx.beginPath();ctx.arc(handleLocal,0,3,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle="#756b61";ctx.beginPath();ctx.arc(hx,hy,3,0,Math.PI*2);ctx.fill();if(d.opening){ctx.globalAlpha=.45;ctx.strokeStyle=P.cyan;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(hx,hy,leafLen,Math.min(closedAngle,angle),Math.max(closedAngle,angle));ctx.stroke();ctx.globalAlpha=1}
    }
    if(d.locked){ctx.fillStyle=lockedCol;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,3.5,0,Math.PI*2);ctx.fill()}ctx.restore();if(md(d,focus)<=2){const text=d.sigilGate&&d.locked?"REINFORCED SIGIL GATE":d.locked?(d.type==="switch"?"SWITCH GATE":d.type==="bronze"?"LOCKED BRONZE DOOR":"SEALED DOOR"):d.open?(d.type==="secret"?"SECRET PASSAGE OPEN":"OPEN DOOR"):d.opening?(d.type==="secret"?"WALL RETRACTING…":"DOOR SWINGING OPEN…"):"CLOSED DOOR";label(text,{x:s.x,y:s.y-2},d.locked?lockedCol:d.open?P.green:P.cyan)}
  }
}
function drawExit(){
  const s=ws(world.exit.x,world.exit.y),now=performance.now(),t=now/850,ready=Boolean(host.exitOpen),hasObjective=Boolean(host.objective?.complete),hasSigil=Boolean(host.exitSigilCollected),cx=s.x+C.tile/2,cy=s.y+C.tile/2,pulse=.5+.5*Math.sin(now/180),primary=ready?P.purple:hasObjective?P.gold:"#81728b",accent=ready?P.cyan:hasSigil?P.green:P.gold;
  ctx.save();
  // A broad animated aura and floor seal make the destination read as a landmark
  // from several tiles away without changing collision or hiding nearby objects.
  const aura=ctx.createRadialGradient(cx,cy,4,cx,cy,ready?C.tile*2.8:C.tile*1.9);aura.addColorStop(0,ready?`rgba(185,120,255,${.34+pulse*.12})`:`rgba(255,216,90,${.12+pulse*.04})`);aura.addColorStop(.46,ready?"rgba(108,236,255,.12)":"rgba(117,91,128,.08)");aura.addColorStop(1,"rgba(20,8,30,0)");ctx.fillStyle=aura;ctx.fillRect(cx-C.tile*3,cy-C.tile*3,C.tile*6,C.tile*6);
  ctx.translate(cx,cy);ctx.lineCap="square";ctx.lineJoin="miter";
  ctx.globalAlpha=ready ? .9 : .58;ctx.strokeStyle=primary;ctx.lineWidth=2;ctx.shadowColor=primary;ctx.shadowBlur=ready?18:7;
  for(let ring=0;ring<3;ring++){const r=26+ring*11+(ready?Math.sin(t*3+ring)*2:0);ctx.save();ctx.rotate((ring%2?-1:1)*t*(.18+ring*.04));ctx.strokeRect(-r/1.4,-r/1.4,r*1.42,r*1.42);ctx.restore()}
  ctx.globalAlpha=1;ctx.shadowBlur=ready?22:9;
  // Raised rune dais.
  ctx.fillStyle="#100918";ctx.beginPath();ctx.moveTo(-37,20);ctx.lineTo(-26,29);ctx.lineTo(26,29);ctx.lineTo(37,20);ctx.lineTo(28,13);ctx.lineTo(-28,13);ctx.closePath();ctx.fill();ctx.strokeStyle=primary;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=ready?"rgba(108,236,255,.16)":"rgba(255,216,90,.08)";ctx.fillRect(-24,17,48,7);
  for(const side of [-1,1]){const x=side*29;ctx.fillStyle="#21132b";ctx.fillRect(x-6,-17,12,39);ctx.fillStyle="#3f2852";ctx.fillRect(x-8,-20,16,6);ctx.fillRect(x-8,19,16,6);ctx.strokeStyle=primary;ctx.strokeRect(x-6,-17,12,39);ctx.fillStyle=accent;ctx.fillRect(x-2,-12,4,4)}
  // Monumental arch and central portal surface.
  ctx.fillStyle="#190e22";ctx.strokeStyle=primary;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-24,18);ctx.lineTo(-24,-7);ctx.quadraticCurveTo(-23,-34,0,-40);ctx.quadraticCurveTo(23,-34,24,-7);ctx.lineTo(24,18);ctx.stroke();
  ctx.save();ctx.beginPath();ctx.moveTo(-18,16);ctx.lineTo(-18,-6);ctx.quadraticCurveTo(-17,-27,0,-32);ctx.quadraticCurveTo(17,-27,18,-6);ctx.lineTo(18,16);ctx.closePath();ctx.clip();
  if(ready){const portal=ctx.createRadialGradient(-5,-10,2,0,-3,31);portal.addColorStop(0,"rgba(238,251,255,.98)");portal.addColorStop(.18,"rgba(108,236,255,.92)");portal.addColorStop(.55,"rgba(142,76,218,.88)");portal.addColorStop(1,"rgba(17,4,31,.98)");ctx.fillStyle=portal;ctx.fillRect(-20,-35,40,55);for(let band=0;band<5;band++){ctx.globalAlpha=.24+band*.08;ctx.strokeStyle=band%2?P.cyan:P.white;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(Math.sin(t*2+band)*3,-5+band*4,15-band*1.7,5+Math.sin(t*3+band)*2,t+band,0,Math.PI*2);ctx.stroke()}}else{ctx.fillStyle="#09060d";ctx.fillRect(-20,-35,40,55);ctx.globalAlpha=.72;ctx.fillStyle=hasObjective?"#261d18":"#18121d";for(let y=-23;y<18;y+=8)ctx.fillRect(-18,y,36,3);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-17,-24);ctx.lineTo(17,14);ctx.moveTo(17,-24);ctx.lineTo(-17,14);ctx.stroke()}
  ctx.restore();ctx.globalAlpha=1;
  // Crown, status core and drifting pixels reinforce the locked/ready state.
  ctx.fillStyle=primary;ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(7,-41);ctx.lineTo(0,-34);ctx.lineTo(-7,-41);ctx.closePath();ctx.fill();ctx.fillStyle=accent;ctx.fillRect(-2,-43,4,4);
  if(!ready){ctx.fillStyle="#07050a";ctx.fillRect(-7,-2,14,13);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(-7,-2,14,13);ctx.beginPath();ctx.arc(0,-3,5,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle=accent;ctx.fillRect(-1,2,2,5)}
  for(let n=0;n<(ready?12:5);n++){const a=t*(ready?1.15:.45)+n*2.399,r=ready?34+(n%3)*8:30+(n%2)*5,x=Math.cos(a)*r,y=Math.sin(a*1.17)*24-7;ctx.globalAlpha=ready ? .45+.5*((n+Math.floor(t*5))%3)/2 : .25;ctx.fillStyle=n%3?primary:accent;const size=ready?2+(n%2):2;ctx.fillRect(Math.round(x),Math.round(y),size,size)}
  ctx.restore();
  if(md(world.exit,focus)<5){const text=ready?(run.floor<C.maxFloors?"FLOOR EXIT READY — ENTER PORTAL":"FINAL EXIT READY — ENTER PORTAL"):hasObjective&&!hasSigil?"FLOOR EXIT — NEEDS EXIT SIGIL":!hasObjective?"FLOOR EXIT — OBJECTIVE REQUIRED":"FLOOR EXIT — POWERING UP";label(text,{x:s.x,y:s.y-36},ready?P.cyan:P.gold)}
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
    const s=ws(c.x,c.y),rar=c.loot?.rarity,col=PGR.colourForRarity(rar),cx=s.x+C.tile/2,pulse=.6+.4*Math.sin(now/180+c.x*3);
    ctx.save();ctx.fillStyle="rgba(0,0,0,.48)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-3,19,5,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=col;ctx.shadowBlur=c.active?10+pulse*8:16;ctx.imageSmoothingEnabled=false;
    // chunky traditional wooden chest body
    ctx.fillStyle="#3b2115";ctx.fillRect(s.x+5,s.y+17,C.tile-10,16);ctx.fillStyle="#75431f";ctx.fillRect(s.x+7,s.y+18,C.tile-14,12);ctx.fillStyle="#9a5d2b";ctx.fillRect(s.x+7,s.y+19,C.tile-14,3);
    ctx.fillStyle="#c39a46";ctx.fillRect(s.x+5,s.y+17,3,16);ctx.fillRect(s.x+C.tile-8,s.y+17,3,16);ctx.fillRect(cx-2,s.y+17,4,16);ctx.fillRect(s.x+5,s.y+30,C.tile-10,3);ctx.fillStyle="#f1c96e";ctx.fillRect(s.x+6,s.y+18,2,11);ctx.fillRect(s.x+C.tile-8,s.y+18,2,11);ctx.fillStyle="#2b170f";ctx.fillRect(s.x+10,s.y+23,7,2);ctx.fillRect(s.x+C.tile-17,s.y+23,7,2);
    // arched lid swings upward during the opening animation
    ctx.save();ctx.translate(cx,s.y+17);ctx.rotate(-anim*.62);ctx.fillStyle="#4a2918";ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(-14,-8);ctx.quadraticCurveTo(0,-17,14,-8);ctx.lineTo(16,0);ctx.closePath();ctx.fill();ctx.strokeStyle="#c39a46";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#9a5d2b";ctx.fillRect(-12,-7,24,4);ctx.restore();
    ctx.fillStyle=c.locked?P.gold:col;ctx.fillRect(cx-4,s.y+19,8,9);ctx.strokeStyle="#fff0a8";ctx.lineWidth=1;ctx.strokeRect(cx-4,s.y+19,8,9);ctx.fillStyle="#1c1010";ctx.fillRect(cx-1,s.y+22,2,4);
    if(c.active){ctx.globalAlpha=.32+pulse*.28;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(s.x+2,s.y+14,C.tile-4,21);for(let n=0;n<4;n++){const a=now/500+n*Math.PI/2;ctx.fillStyle=n%2?col:P.gold;ctx.fillRect(cx+Math.cos(a)*18-1,s.y+22+Math.sin(a)*9-1,3,3)}}
    if(anim>0){ctx.globalAlpha=1-anim*.35;ctx.fillStyle=col;for(let n=0;n<12;n++){const a=n*1.7+now/180,r=6+anim*(10+n%4*3);ctx.fillRect(cx+Math.cos(a)*r,s.y+9+Math.sin(a)*r*.55,2+n%2,2+n%2)}}
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
function enemySpriteSeed(e){let h=2166136261;for(const ch of String(e?.id||e?.kind||"enemy")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function enemyPalette(k,e){
  const sets={
    spider:["#342737","#110e14","#8b708c","#d9d5e2"],skeleton:["#d7cfad","#6e6757","#fff4cf","#9fd8c8"],knight:["#727987","#272c35","#c5ced8","#e1a845"],scout:["#7452b7","#39275f","#bb9df0","#54e7ff"],hunter:["#c88c26","#5b3816","#ffe080","#ef476f"],ambusher:["#9c3f82","#471b4b","#ff82d1","#70efff"],guard:["#853844","#3b1d29","#d18b84","#68e0e8"],charger:["#327b94","#163d50","#7cd7e4","#ff6d43"],ranger:["#3c619d","#192d51","#79aaf0","#ffcb63"],root:["#477d3d","#213c24","#9dc46f","#e8d36c"],cook:["#a95f2f","#4d2b20","#f2e4c8","#ff7b47"],firebreather:["#477d4b","#203d30","#92c66c","#ff7a35"],ghost:["#6d719c","#2e3156","#bacaff","#6cecff"],treasure:["#688443","#304a25","#d4e66f","#ffd85a"],guardian:["#7c2947","#35152a","#e27991","#ffd85a"]};
  let [main,dark,light,accent]=sets[k]||sets.guardian;if(e.exitWarden){main="#67328d";dark="#29143e";light="#bc79ed";accent=P.gold}else if(e.guardian){main="#8b273f";dark="#3a101f";light="#ea7284";accent=P.red}else if(e.champion){main="#356785";dark="#173246";light="#75d9e8";accent=P.cyan}
  if((e.flash||0)>0){light="#ffffff";main="#9deeff"}return{main,dark,light,accent,outline:"#100b16"}
}
function drawEnemyTorch(x,y,phase){
  px(0,0,x-2,y,4,17,"#5c351d");px(0,0,x-3,y+3,6,3,"#aa7131");ctx.save();ctx.shadowColor=P.orange;ctx.shadowBlur=18;const sway=Math.round(Math.sin(phase*1.7)*2);px(0,0,x-5+sway,y-11,10,9,"#d84a27");px(0,0,x-3-sway,y-15,7,10,P.orange);px(0,0,x-1,y-13,4,8,P.gold);px(0,0,x,y-12,2,4,"#fff4b0");ctx.restore()
}
function drawEnemyArmour(e,pal){
  if(!(e.armor>0||e.guardian||e.champion||e.exitWarden))return;ctx.save();ctx.globalAlpha=.92;px(0,0,-13,-5,6,7,pal.light);px(0,0,7,-5,6,7,pal.light);px(0,0,-10,-3,3,11,pal.dark);px(0,0,7,-3,3,11,pal.dark);ctx.fillStyle=pal.accent;ctx.fillRect(-2,-1,4,4);ctx.restore()
}
function drawPixelEnemySprite(e,cx,cy){
  const f=e.follower,k=f?.kind||e.kind||"guardian",isDeath=Boolean(e.deathStalker&&e.voidStalker),elite=Boolean(f||e.champion||e.guardian||e.exitWarden),seed=enemySpriteSeed(e),phase=performance.now()/210+(seed%37),walking=e.aiState==="chase"||e.aiState==="search",stride=walking?Math.sin(phase*1.35):Math.sin(phase*.38)*.25,bob=walking?Math.round(Math.abs(stride)*-2):Math.round(Math.sin(phase*.45)),facing=(e.facing?.x||(seed%2?1:-1))<0?-1:1,pal=enemyPalette(k,e);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(cx),Math.round(cy+bob));ctx.scale(facing,1);ctx.shadowColor=isDeath?"#ff183f":elite?pal.accent:pal.main;ctx.shadowBlur=isDeath?22:elite?13:7;
  if(elite){ctx.save();ctx.globalAlpha=.42+.18*Math.sin(phase);ctx.strokeStyle=pal.accent;ctx.lineWidth=1.5;ctx.rotate(phase*.08);ctx.strokeRect(-18,-18,36,36);ctx.rotate(Math.PI/4);ctx.strokeRect(-13,-13,26,26);ctx.restore()}
  if(isDeath){
    // Death Stalker: layered void cloak, crown spikes, tendrils and four burning eyes.
    ctx.save();ctx.globalAlpha=.46;for(let n=0;n<4;n++){const x=-15+n*10+Math.sin(phase+n)*3;ctx.strokeStyle=n%2?"#ff183f":"#71315f";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,7);ctx.quadraticCurveTo(x+Math.sin(phase+n)*8,15,x-4,22);ctx.stroke()}ctx.restore();
    ctx.fillStyle="#07050a";ctx.beginPath();ctx.moveTo(-18,16);ctx.lineTo(-14,-7);ctx.lineTo(-9,-17);ctx.lineTo(0,-22);ctx.lineTo(9,-17);ctx.lineTo(14,-7);ctx.lineTo(18,16);ctx.lineTo(10,12);ctx.lineTo(5,20);ctx.lineTo(0,14);ctx.lineTo(-6,21);ctx.lineTo(-11,12);ctx.closePath();ctx.fill();ctx.strokeStyle="#4d1d42";ctx.lineWidth=3;ctx.stroke();
    px(0,0,-16,-7,32,7,"#160b1d");px(0,0,-12,-15,24,13,"#0a070d");px(0,0,-15,-19,5,8,"#3c1633");px(0,0,10,-19,5,8,"#3c1633");px(0,0,-3,-25,6,8,"#5d1d48");
    for(const x of [-8,-3,3,8]){px(0,0,x-1,-10,3,3,"#ff294b");px(0,0,x,-10,1,1,"#fff")}
    px(0,0,-11,-1,22,3,"#2d1530");px(0,0,-7,5,4,8,"#34132d");px(0,0,3,5,4,8,"#34132d");
    ctx.globalAlpha=.7;for(let n=0;n<7;n++){const a=phase*.5+n*1.73,r=18+n%3*4;px(0,0,Math.cos(a)*r,Math.sin(a*1.2)*13-3,2,2,n%2?"#ff294b":"#7c3a79")}ctx.globalAlpha=1;ctx.restore();return
  }
  // Animated legs shared by humanoids; each family then receives a unique silhouette and equipment.
  const legA=Math.round(stride*2),legB=-legA;
  if(!["firebreather","ghost","spider"].includes(k)){px(0,0,-8+legA,8,6,9,pal.dark);px(0,0,2+legB,8,6,9,pal.dark);px(0,0,-10+legA,15,8,3,pal.outline);px(0,0,2+legB,15,8,3,pal.outline)}
  if(k==="spider"){
    // Dustweb Spider: all eight legs scuttle independently instead of sliding.
    const scuttle=Math.sin(phase*2.7)*3;ctx.strokeStyle=pal.light;ctx.lineWidth=2.5;for(let n=0;n<4;n++){const y=-5+n*4,kick=(n%2?scuttle:-scuttle);for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*7,y);ctx.lineTo(side*(13+Math.abs(kick)),y-5+n*2);ctx.lineTo(side*(20+kick),y+7);ctx.stroke()}}ctx.fillStyle=pal.dark;ctx.beginPath();ctx.ellipse(-5,1,10,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal.main;ctx.beginPath();ctx.ellipse(7,-3,9,8,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=pal.light;ctx.lineWidth=1.5;ctx.stroke();for(const [x,y] of [[3,-6],[7,-7],[10,-4],[5,-2]]){px(0,0,x,y,2,2,pal.accent)}ctx.fillStyle="rgba(225,232,244,.45)";ctx.beginPath();ctx.moveTo(-12,4);ctx.quadraticCurveTo(-22,10+scuttle,-18,17);ctx.strokeStyle=pal.accent;ctx.stroke()
  }else if(k==="skeleton"){
    // Low-HP skeleton: articulated bones, jaw chatter and a rusty short sword.
    ctx.strokeStyle=pal.light;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-11,7,0,Math.PI*2);ctx.stroke();px(0,0,-5,-14,3,3,"#171318");px(0,0,2,-14,3,3,"#171318");px(0,0,-3,-8,6,2,pal.dark);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,8);ctx.moveTo(-8,-1);ctx.lineTo(8,-1);ctx.moveTo(-6,3);ctx.lineTo(6,3);ctx.moveTo(-5,7);ctx.lineTo(-9+legA,16);ctx.moveTo(5,7);ctx.lineTo(9+legB,16);ctx.moveTo(-7,0);ctx.lineTo(-14-legA,8);ctx.moveTo(7,0);ctx.lineTo(13+legA,7);ctx.stroke();px(0,0,-11+legA,15,8,3,pal.light);px(0,0,3+legB,15,8,3,pal.light);ctx.strokeStyle="#9b6a3d";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(12+legA,6);ctx.lineTo(20+legA,-8);ctx.stroke();ctx.strokeStyle="#d7dde5";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(19+legA,-7);ctx.lineTo(24+legA,-15);ctx.stroke()
  }else if(k==="knight"){
    // Archive Knight: slow plate armour with an animated sword arc.
    const swing=(e.meleeSwingMs||0)>0?1-(e.meleeSwingMs||0)/420:0,armAngle=(e.meleeSwingMs||0)>0?-1.2+swing*2.4:.34+Math.sin(phase*.4)*.08;px(0,0,-11,-17,22,8,pal.dark);px(0,0,-9,-15,18,9,pal.main);px(0,0,-7,-12,14,3,"#11151b");for(let x=-5;x<=5;x+=5)px(0,0,x,-11,2,2,pal.accent);px(0,0,-15,-6,30,17,pal.outline);px(0,0,-12,-5,24,16,pal.main);px(0,0,-17,-5,7,10,pal.light);px(0,0,10,-5,7,10,pal.light);px(0,0,-5,-1,10,10,pal.dark);ctx.strokeStyle=pal.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.lineTo(0,8);ctx.closePath();ctx.stroke();ctx.save();ctx.translate(13,-1);ctx.rotate(armAngle);px(0,0,-2,-2,5,13,pal.light);px(0,0,-4,8,9,3,"#a56f37");px(0,0,-1,10,3,24,"#dbe3eb");px(0,0,0,12,1,20,"#ffffff");ctx.restore();if((e.meleeSwingMs||0)>0){ctx.globalAlpha=.5;ctx.strokeStyle="#fff0a8";ctx.lineWidth=3;ctx.beginPath();ctx.arc(12,-1,27,-1.1,1.1);ctx.stroke();ctx.globalAlpha=1}
  }else if(k==="scout"){
    // Tape Scout: articulated cassette automaton with spinning reels and loose tape.
    px(0,0,-14,-10,28,19,pal.outline);px(0,0,-12,-8,24,15,pal.main);px(0,0,-10,-6,20,9,pal.dark);ctx.strokeStyle=pal.light;ctx.lineWidth=2;for(const x of [-5,5]){ctx.beginPath();ctx.arc(x,-2,4,0,Math.PI*2);ctx.stroke();px(0,0,x-1,-3,2,2,pal.accent)}px(0,0,-8,4,16,2,pal.light);px(0,0,-18,-5,5,11,pal.dark);px(0,0,13,-5,5,11,pal.dark);px(0,0,-20,1,4,5,pal.light);px(0,0,16,1,4,5,pal.light);ctx.strokeStyle=pal.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(7,4);ctx.quadraticCurveTo(18,11+stride*2,12,16);ctx.stroke();px(0,0,-2,-15,4,5,pal.light);px(0,0,-1,-18,2,4,pal.accent)
  }else if(k==="hunter"){
    // Joystick Hunter: plated helmet, broad pauldrons and a wired Competition Pro lance.
    px(0,0,-9,-15,18,5,pal.outline);px(0,0,-7,-13,14,9,pal.main);px(0,0,-6,-10,12,3,pal.dark);px(0,0,-5,-9,10,2,pal.accent);px(0,0,-13,-5,26,15,pal.outline);px(0,0,-10,-4,20,14,pal.main);px(0,0,-15,-4,6,7,pal.light);px(0,0,9,-4,6,7,pal.light);px(0,0,11,-9,4,23,pal.light);px(0,0,8,-13,10,5,pal.dark);px(0,0,10,-16,6,5,pal.accent);px(0,0,12,11,7,4,"#7b213d");ctx.strokeStyle="#ed5a78";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(14,14);ctx.quadraticCurveTo(20,19,6,18);ctx.stroke();px(0,0,-4,1,8,6,pal.dark);px(0,0,-2,2,4,3,pal.accent)
  }else if(k==="ambusher"){
    // Raster Ambusher: fractured assassin whose scanlines continually desynchronise.
    for(let y=-14;y<=11;y+=4){const off=Math.round(Math.sin(phase*2+y)*3),w=24-Math.abs(off)*2;px(0,0,-w/2+off,y,w,3,y%8?pal.main:pal.light)}px(0,0,-7,-8,14,8,pal.dark);px(0,0,-6,-6,4,3,"#fff");px(0,0,2,-6,4,3,pal.accent);px(0,0,-18,-1,8,3,pal.light);px(0,0,10,-1,8,3,pal.light);px(0,0,-20,-3,3,7,pal.accent);px(0,0,17,-3,3,7,pal.accent);ctx.globalAlpha=.35;px(0,0,-16+Math.sin(phase)*5,-17,12,2,P.cyan);px(0,0,7-Math.sin(phase)*4,13,10,2,P.pink);ctx.globalAlpha=1
  }else if(k==="guard"){
    // 1541 Guard: disk-drive torso, activity LED, shield and read-head baton.
    px(0,0,-11,-14,22,7,pal.outline);px(0,0,-9,-12,18,6,pal.main);px(0,0,-12,-7,24,18,pal.outline);px(0,0,-10,-5,20,14,pal.main);px(0,0,-7,-3,14,4,"#171018");px(0,0,-6,3,12,3,pal.light);px(0,0,5,-2,3,3,pal.accent);ctx.fillStyle=pal.dark;ctx.beginPath();ctx.moveTo(-19,-6);ctx.lineTo(-11,-9);ctx.lineTo(-11,10);ctx.lineTo(-17,14);ctx.lineTo(-22,7);ctx.closePath();ctx.fill();ctx.strokeStyle=pal.light;ctx.stroke();px(0,0,13,-6,4,21,pal.light);px(0,0,11,-9,8,4,pal.dark);px(0,0,14,12,6,3,pal.accent)
  }else if(k==="charger"){
    // Dungeon Charger: low, horned siege brute with piston shoulders.
    px(0,0,-15,-10,30,8,pal.outline);px(0,0,-12,-12,24,12,pal.main);px(0,0,-14,-2,28,14,pal.main);px(0,0,-19,-6,8,11,pal.light);px(0,0,11,-6,8,11,pal.light);px(0,0,-6,-9,4,3,"#fff");px(0,0,3,-9,4,3,"#fff");px(0,0,12,-13,12,4,pal.light);px(0,0,20,-15,7,3,pal.accent);px(0,0,-7,4,14,5,pal.dark);px(0,0,-16,8,7,7,pal.dark);px(0,0,9,8,7,7,pal.dark);if((e.chargeTelegraphMs||0)>0){ctx.globalAlpha=.7;px(0,0,24,-17,5,5,P.red);px(0,0,30,-17,3,3,P.orange);ctx.globalAlpha=1}
  }else if(k==="ranger"){
    // Archive Ranger: deep hood, layered cloak, scope and long pulse rifle.
    ctx.fillStyle=pal.dark;ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(-11,-7);ctx.lineTo(-9,13);ctx.lineTo(0,9);ctx.lineTo(9,13);ctx.lineTo(11,-7);ctx.closePath();ctx.fill();px(0,0,-8,-12,16,9,pal.main);px(0,0,-5,-9,10,5,"#0b0b16");px(0,0,1,-8,3,2,pal.accent);px(0,0,-11,-3,15,5,pal.main);px(0,0,3,-5,20,5,pal.light);px(0,0,18,-7,7,9,pal.dark);px(0,0,8,-8,6,3,pal.accent);px(0,0,22,-3,5,2,P.cyan);px(0,0,-7,3,12,7,pal.main)
  }else if(k==="root"){
    // Root Caster: bark plates, branching crown, vine claws and a glowing seed core.
    px(0,0,-8,-13,16,11,pal.dark);px(0,0,-11,-5,22,17,pal.main);px(0,0,-7,-9,4,3,pal.light);px(0,0,3,-9,4,3,pal.light);px(0,0,-3,0,6,7,pal.accent);ctx.strokeStyle=pal.light;ctx.lineWidth=3;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*5,-13);ctx.lineTo(side*11,-19);ctx.lineTo(side*15,-17);ctx.moveTo(side*10,-18);ctx.lineTo(side*9,-23);ctx.stroke();ctx.beginPath();ctx.moveTo(side*10,0);ctx.quadraticCurveTo(side*18,4+stride*2,side*19,13);ctx.stroke()}px(0,0,-13,8,5,9,pal.dark);px(0,0,8,8,5,9,pal.dark)
  }else if(k==="cook"){
    // CPU Cook: towering chef hat, glowing processor face, apron, pan and cleaver.
    px(0,0,-11,-18,22,6,"#f2eadb");px(0,0,-8,-22,6,7,"#fff8e9");px(0,0,-1,-24,7,9,"#fff8e9");px(0,0,5,-21,6,6,"#eee4d2");px(0,0,-8,-13,16,9,pal.main);px(0,0,-5,-10,10,4,"#161118");px(0,0,-3,-9,6,2,pal.accent);px(0,0,-11,-4,22,16,pal.main);px(0,0,-6,-2,12,13,"#efe3cc");px(0,0,-2,0,4,8,pal.accent);px(0,0,10,-4,13,4,pal.light);ctx.strokeStyle=pal.light;ctx.lineWidth=3;ctx.beginPath();ctx.arc(22,-2,7,0,Math.PI*2);ctx.stroke();px(0,0,-17,-4,5,16,"#b9c6cb");px(0,0,-19,-8,9,5,pal.light)
  }else if(k==="firebreather"){
    // Firebreather: animated wings, plated dragon body, horns, tail and ember breath.
    const wing=Math.round(Math.sin(phase)*3);ctx.fillStyle=pal.dark;ctx.beginPath();ctx.moveTo(-6,-5);ctx.lineTo(-20,-15-wing);ctx.lineTo(-16,3);ctx.lineTo(-6,5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(4,-5);ctx.lineTo(17,-15+wing);ctx.lineTo(15,4);ctx.lineTo(4,5);ctx.closePath();ctx.fill();px(0,0,-12,-8,24,17,pal.main);px(0,0,-8,-13,16,8,pal.main);px(0,0,7,-10,13,9,pal.light);px(0,0,16,-7,9,5,pal.dark);px(0,0,21,-5,7,3,P.orange);px(0,0,25,-6,5,2,P.gold);px(0,0,-5,-12,3,3,"#fff");px(0,0,1,-12,3,3,"#fff");px(0,0,-12,7,5,8,pal.dark);px(0,0,7,7,5,8,pal.dark);ctx.strokeStyle=pal.main;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-11,4);ctx.quadraticCurveTo(-24,7+stride*2,-20,16);ctx.stroke();px(0,0,-23,14,6,3,pal.accent)
  }else if(k==="ghost"){
    // Ghost Byte: translucent sheet of corrupted memory with trailing hexadecimal fragments.
    ctx.save();ctx.globalAlpha=.72+.12*Math.sin(phase);ctx.fillStyle=pal.main;ctx.beginPath();ctx.moveTo(-13,14);ctx.lineTo(-12,-7);ctx.quadraticCurveTo(-8,-18,0,-18);ctx.quadraticCurveTo(9,-18,12,-7);ctx.lineTo(14,14);ctx.lineTo(8,9);ctx.lineTo(3,16);ctx.lineTo(-2,9);ctx.lineTo(-8,16);ctx.closePath();ctx.fill();ctx.strokeStyle=pal.light;ctx.lineWidth=2;ctx.stroke();px(0,0,-7,-8,5,4,"#0a1530");px(0,0,3,-8,5,4,"#0a1530");px(0,0,-5,1,11,2,pal.accent);for(let n=0;n<5;n++)px(0,0,-14+n*7+Math.sin(phase+n)*3,17+n%2*4,3,2,n%2?pal.light:pal.accent);ctx.restore()
  }else if(k==="treasure"){
    // Treasure Goblin: oversized ears, grin, coin-stuffed pack and dangling key.
    px(0,0,-9,-14,18,11,pal.main);px(0,0,-16,-11,8,6,pal.light);px(0,0,8,-11,8,6,pal.light);px(0,0,-6,-10,3,3,"#fff");px(0,0,3,-10,3,3,"#fff");px(0,0,-5,-4,10,3,"#f5efcf");px(0,0,-11,-3,20,15,pal.main);px(0,0,7,-2,13,15,"#8c5b27");px(0,0,10,0,8,8,P.gold);px(0,0,12,2,4,4,"#fff1a0");px(0,0,-15,0,5,11,pal.dark);px(0,0,-17,9,6,3,P.gold)
  }else{
    // Guardian, champion and Sigil Warden: imposing plate armour and powered halberd.
    px(0,0,-10,-17,20,5,pal.outline);px(0,0,-8,-15,16,10,pal.main);px(0,0,-6,-12,12,3,"#100b16");px(0,0,-5,-11,10,2,pal.accent);px(0,0,-14,-6,28,17,pal.outline);px(0,0,-11,-5,22,16,pal.main);px(0,0,-16,-6,7,9,pal.light);px(0,0,9,-6,7,9,pal.light);px(0,0,-5,-1,10,9,pal.dark);px(0,0,-2,1,4,5,pal.accent);px(0,0,14,-14,4,30,pal.light);px(0,0,10,-17,12,5,pal.accent);px(0,0,17,-21,4,9,pal.accent);px(0,0,11,13,10,3,pal.dark);if(e.exitWarden){ctx.strokeStyle=P.gold;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,2,8,0,Math.PI*2);ctx.stroke()}
  }
  drawEnemyArmour(e,pal);
  if(f){const portrait=avatarImages?.get?.(f.name);if(portrait?.complete&&portrait.naturalWidth){ctx.save();ctx.imageSmoothingEnabled=false;ctx.shadowBlur=0;ctx.globalAlpha=.98;ctx.drawImage(portrait,-7,-14,14,14);ctx.strokeStyle=P.gold;ctx.lineWidth=1.5;ctx.strokeRect(-8,-15,16,16);ctx.restore()}ctx.fillStyle=P.gold;ctx.font='bold 6px "Courier New"';ctx.textAlign="center";ctx.fillText(f.initials||f.name.slice(0,2).toUpperCase(),0,8);drawEnemyTorch(17,-1,phase)}
  if((e.hitStunMs||0)>0){ctx.globalAlpha=.8;for(let n=0;n<5;n++){const a=phase+n*1.26;px(0,0,Math.cos(a)*17,Math.sin(a)*12-7,3,3,n%2?P.cyan:"#fff")}}
  ctx.restore()
}
function enemyCreditPreviewEntity(row){
  const key=String(row?.key||""),kind=String(row?.kind||"guardian"),name=String(row?.name||"Enemy"),enemy={id:`credit-${key||kind}`,kind,alive:true,aiState:"idle",facing:{x:1,y:0},armor:0,flash:0};
  if(row?.named&&key!=="count-loadula")enemy.follower={name,kind,initials:row.initials||name.slice(0,2).toUpperCase(),avatar:row.avatar||""};
  if(key==="death-stalker"){enemy.deathStalker=true;enemy.voidStalker=true;enemy.stalker=true}
  if(key==="archive-wraith")enemy.horrorCreature=true;
  if(key==="sigil-warden")enemy.exitWarden=true;
  if(key.startsWith("champion:"))enemy.champion=true;
  if(key==="citadel-guardian")enemy.guardian=true;
  if(key==="treasure-goblin")enemy.treasureGoblin=true;
  return enemy
}
function drawCountLoadulaCreditSprite(cx,cy){
  ctx.save();ctx.translate(cx,cy+2);ctx.imageSmoothingEnabled=false;ctx.shadowColor="#ff314f";ctx.shadowBlur=17;
  ctx.fillStyle="#09050c";ctx.beginPath();ctx.moveTo(-18,17);ctx.lineTo(-15,-5);ctx.lineTo(-10,-15);ctx.lineTo(0,-9);ctx.lineTo(10,-15);ctx.lineTo(15,-5);ctx.lineTo(18,17);ctx.lineTo(10,12);ctx.lineTo(5,20);ctx.lineTo(0,13);ctx.lineTo(-6,21);ctx.lineTo(-11,12);ctx.closePath();ctx.fill();ctx.strokeStyle="#5c172c";ctx.lineWidth=3;ctx.stroke();
  px(0,0,-20,-5,8,10,"#2b1324");px(0,0,12,-5,8,10,"#2b1324");px(0,0,-18,-7,6,4,"#ff314f");px(0,0,12,-7,6,4,"#ff314f");px(0,0,-12,-16,24,8,"#160a16");px(0,0,-9,-20,18,12,"#eee6ef");px(0,0,-7,-17,14,6,"#b8aebb");px(0,0,-6,-15,4,3,"#ff314f");px(0,0,2,-15,4,3,"#ff314f");px(0,0,-5,-14,2,1,"#fff");px(0,0,3,-14,2,1,"#fff");
  ctx.fillStyle="#7e6432";ctx.beginPath();ctx.moveTo(-9,-21);ctx.lineTo(-7,-28);ctx.lineTo(-2,-23);ctx.lineTo(0,-30);ctx.lineTo(3,-23);ctx.lineTo(8,-28);ctx.lineTo(9,-21);ctx.closePath();ctx.fill();ctx.strokeStyle=P.gold;ctx.lineWidth=1;ctx.stroke();px(0,0,-5,-2,10,13,"#211226");ctx.strokeStyle="#ff314f";ctx.strokeRect(-5,-2,10,13);ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);ctx.lineTo(-3,9);ctx.lineTo(3,9);ctx.closePath();ctx.stroke();px(0,0,-1,4,2,3,P.gold);ctx.restore()
}
function renderEnemyCreditAvatar(target,row){
  if(!target?.getContext||!row)return false;const out=target.getContext("2d");if(!out)return false;const size=64;
  target.width=size;target.height=size;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,size,size);const glow=ctx.createRadialGradient(32,27,3,32,32,38);glow.addColorStop(0,row.named?"#342347":"#202a42");glow.addColorStop(1,"#06040a");ctx.fillStyle=glow;ctx.fillRect(0,0,size,size);ctx.fillStyle="rgba(0,0,0,.42)";ctx.beginPath();ctx.ellipse(32,54,18,5,0,0,Math.PI*2);ctx.fill();
  if(String(row.key||"")==="count-loadula")drawCountLoadulaCreditSprite(32,35);else drawPixelEnemySprite(enemyCreditPreviewEntity(row),32,34);
  out.clearRect(0,0,size,size);out.imageSmoothingEnabled=false;out.drawImage(canvas,0,0,size,size,0,0,size,size);ctx.restore();return true
}
window.CCGRenderEnemyCreditAvatar=renderEnemyCreditAvatar;
function drawEnemy(e){
  if(!e.alive||!visibleTo(focus,e.x,e.y))return;const s=enemyScreen(e),f=e.follower,isDeathStalker=Boolean(e.deathStalker&&e.voidStalker),cx=s.x+C.tile/2,cy=s.y+C.tile/2;
  if(f){const r=(C.enemy.followerLightRadius||5)*C.tile,g=ctx.createRadialGradient(cx,cy,8,cx,cy,r);g.addColorStop(0,"rgba(255,213,112,.13)");g.addColorStop(.45,"rgba(255,160,70,.05)");g.addColorStop(1,"rgba(255,140,50,0)");ctx.fillStyle=g;ctx.fillRect(s.x-r,s.y-r,r*2,r*2)}
  if(isDeathStalker){const aura=ctx.createRadialGradient(cx,cy,5,cx,cy,C.tile*.85);aura.addColorStop(0,"rgba(255,25,62,.22)");aura.addColorStop(1,"rgba(255,25,62,0)");ctx.fillStyle=aura;ctx.fillRect(cx-C.tile,cy-C.tile,C.tile*2,C.tile*2)}ctx.fillStyle="rgba(0,0,0,.42)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,isDeathStalker?19:13,isDeathStalker?6:4,0,0,Math.PI*2);ctx.fill();drawPixelEnemySprite(e,cx,cy);
  const name=e.exitWarden?"SIGIL WARDEN":e.guardian?"FLOOR GUARDIAN":isDeathStalker?"DEATH STALKER":e.champion?e.championName:e.treasureGoblin?"TREASURE GOBLIN":f?.name||({spider:"Dustweb Spider",skeleton:"Crypt Skeleton",knight:"Archive Knight",scout:"Tape Scout",hunter:"Joystick Hunter",ambusher:"Raster Ambusher",guard:"1541 Guard",ghost:"Ghost Byte",charger:"Charger",ranger:"Ranger",root:"Root Crawler",cook:"CPU Cook",firebreather:"Firebreather"}[e.kind]||"Enemy");
  label(isDeathStalker?`${name} — INDESTRUCTIBLE`:name,s,isDeathStalker?P.red:e.exitWarden?P.gold:e.guardian?P.red:e.champion?P.cyan:f?P.gold:P.white);if(!isDeathStalker)drawTransientHealth(e,s,f?P.gold:P.white);
  if((e.hitStunMs||0)>0){ctx.font='bold 9px "Courier New"';ctx.textAlign="center";ctx.fillStyle=P.cyan;ctx.fillText("STUNNED",cx,s.y-25)}else if(e.aiState==="chase"||e.aiState==="search"){ctx.font='bold 14px "Courier New"';ctx.textAlign="center";ctx.fillStyle=e.aiState==="chase"?P.red:P.gold;ctx.fillText(e.aiState==="chase"?"!":"?",cx,s.y-25)}
  if(e.champion||e.guardian){const pct=Math.max(0,e.hp/e.maxHp);ctx.fillStyle="#1a0b12";ctx.fillRect(s.x+3,s.y+C.tile+2,C.tile-6,3);ctx.fillStyle=e.guardian?P.red:P.cyan;ctx.fillRect(s.x+3,s.y+C.tile+2,(C.tile-6)*pct,3)}
}
function drawStalker(){
  const s=host.stalker;if(!s?.awake||!visibleTo(focus,s.x,s.y))return;const q=ws(s.x,s.y),cx=q.x+C.tile/2,cy=q.y+C.tile/2,now=performance.now(),t=now/260,pulse=.68+.32*Math.sin(t),v=s.vulnerableMs>0,col=v?P.purple:"#ff314f";ctx.save();ctx.translate(cx,cy+Math.sin(t*.55)*2);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle="rgba(0,0,0,.58)";ctx.beginPath();ctx.ellipse(0,18,21,6,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=col;ctx.shadowBlur=v?30:23;
  // Orbiting clock fragments reinforce Count Loadula's unnatural persistence.
  ctx.save();ctx.globalAlpha=.45+.2*pulse;ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.rotate(t*.16);for(let n=0;n<8;n++){ctx.rotate(Math.PI/4);ctx.strokeRect(22,-2,5,4)}ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.stroke();ctx.restore();
  // High-collared cloak with animated split tails and armoured shoulders.
  ctx.fillStyle="#09050c";ctx.beginPath();ctx.moveTo(-18,17);ctx.lineTo(-15,-5);ctx.lineTo(-10,-15);ctx.lineTo(0,-9);ctx.lineTo(10,-15);ctx.lineTo(15,-5);ctx.lineTo(18,17);ctx.lineTo(10,12);ctx.lineTo(5,20);ctx.lineTo(0,13);ctx.lineTo(-6,21);ctx.lineTo(-11,12);ctx.closePath();ctx.fill();ctx.strokeStyle=v?"#9651d5":"#5c172c";ctx.lineWidth=3;ctx.stroke();
  px(0,0,-20,-5,8,10,"#2b1324");px(0,0,12,-5,8,10,"#2b1324");px(0,0,-18,-7,6,4,col);px(0,0,12,-7,6,4,col);px(0,0,-12,-16,24,8,"#160a16");px(0,0,-9,-20,18,12,"#eee6ef");px(0,0,-7,-17,14,6,"#b8aebb");px(0,0,-6,-15,4,3,col);px(0,0,2,-15,4,3,col);px(0,0,-5,-14,2,1,"#fff");px(0,0,3,-14,2,1,"#fff");
  // Crown and chest hourglass.
  ctx.fillStyle="#7e6432";ctx.beginPath();ctx.moveTo(-9,-21);ctx.lineTo(-7,-28);ctx.lineTo(-2,-23);ctx.lineTo(0,-30);ctx.lineTo(3,-23);ctx.lineTo(8,-28);ctx.lineTo(9,-21);ctx.closePath();ctx.fill();ctx.strokeStyle=P.gold;ctx.lineWidth=1;ctx.stroke();px(0,0,-5,-2,10,13,"#211226");ctx.strokeStyle=col;ctx.strokeRect(-5,-2,10,13);ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);ctx.lineTo(-3,9);ctx.lineTo(3,9);ctx.closePath();ctx.stroke();px(0,0,-1,4,2,3,P.gold);
  for(let n=0;n<8;n++){const a=t*.45+n*.91,r=19+n%3*3;ctx.globalAlpha=.35+.45*((n+Math.floor(t))%3)/2;px(0,0,Math.cos(a)*r,Math.sin(a*1.2)*14,2+n%2,2+n%2,n%2?col:"#d9c3f0")}ctx.globalAlpha=1;
  if(v){ctx.save();ctx.globalAlpha=.45+.3*pulse;ctx.strokeStyle=P.purple;ctx.lineWidth=2;ctx.rotate(-t*.3);ctx.strokeRect(-17,-17,34,34);ctx.rotate(Math.PI/4);ctx.strokeRect(-12,-12,24,24);ctx.restore()}ctx.restore();label(v?`${C.stalker.name.toUpperCase()} — VULNERABLE`:C.stalker.name.toUpperCase(),q,v?P.purple:P.red);if(v)drawTransientHealth(s,q,P.purple)
}
function drawPlayerResources(p,s,col,kind){if(kind==="remote"||!p||!(p.ammoFlashMs>0))return;ctx.save();ctx.font='bold 13px Consolas, "Courier New"';ctx.textAlign="center";ctx.fillStyle=P.gold;ctx.shadowColor="#000";ctx.shadowBlur=4;ctx.fillText(`AMMO ${Math.max(0,p.mana)}`,s.x+C.tile/2,s.y-30);ctx.restore()}
function drawPlayer(p,kind="p1"){
  const s=ws(p.rx,p.ry),col=kind==="p2"?P.green:kind==="remote"?P.cyan:P.gold,cx=s.x+C.tile/2,moving=Math.abs((p.x??p.rx)-p.rx)+Math.abs((p.y??p.ry)-p.ry)>.025,phase=performance.now()/105+(String(p.id||kind).length%7),step=moving?Math.sin(phase)*3:0,bob=moving?-Math.abs(Math.sin(phase))*2:Math.sin(phase*.18)*.4,cy=s.y+C.tile/2+bob,d=p.dir||{x:1,y:0};ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,13,4,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=col;ctx.shadowBlur=p.torchMs>0?13:6;
  // Chunkier CCG dungeon adventurer: hair/face, shoulder armour, backpack, jacket, badge and boots.
  px(cx,cy,-8,-15,16,3,"#21182a");px(cx,cy,-7,-12,14,7,"#c49372");px(cx,cy,-6,-13,12,3,"#392641");px(cx,cy,-5,-9,2,2,"#1a111b");px(cx,cy,3,-9,2,2,"#1a111b");
  px(cx,cy,-11,-6-step*.25,4,15,"#32233d");px(cx,cy,7,-6+step*.25,4,15,"#32233d");px(cx,cy,-9,-6,18,17,"#56366e");px(cx,cy,-8,-5,4,13,"#79509b");px(cx,cy,4,-5,4,13,"#79509b");
  px(cx,cy,-12,-4-step*.25,4,7,"#a5863d");px(cx,cy,8,-4+step*.25,4,7,"#a5863d");px(cx,cy,-8+step,10,6,7,"#25202b");px(cx,cy,2-step,10,6,7,"#25202b");px(cx,cy,-9+step,15,7,3,"#111015");px(cx,cy,2-step,15,7,3,"#111015");
  px(cx,cy,-5,-2,10,8,"#17101e");ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(cx-5,cy-2,10,8);ctx.fillStyle=col;ctx.font='bold 6px "Courier New"';ctx.textAlign="center";ctx.fillText("CCG",cx,cy+4);
  const gx=d.x?d.x*10:0,gy=d.y?d.y*10:0;ctx.fillStyle=P.cyan;ctx.fillRect(cx+gx-3-(d.x<0?5:0),cy+gy-2-(d.y<0?5:0),d.x?8:5,d.y?8:5);ctx.fillStyle="#dcefff";ctx.fillRect(cx+gx+(d.x>0?4:d.x<0?-5:-1),cy+gy+(d.y>0?4:d.y<0?-5:-1),2,2);
  if(p.torchMs>0){const tx=cx-d.y*12-d.x*5,ty=cy+d.x*12-d.y*5;ctx.fillStyle="#76512a";ctx.fillRect(tx-1,ty-1,3,10);ctx.fillStyle=P.orange;ctx.fillRect(tx-4,ty-9,8,8);ctx.fillStyle=P.gold;ctx.fillRect(tx-2,ty-11,4,8)}
  if((p.hitStunMs||0)>0){ctx.fillStyle=P.cyan;ctx.fillRect(cx-12,cy-19,4,3);ctx.fillRect(cx+8,cy-18,4,3)}ctx.restore();if(kind==="remote")label(p.name,{x:s.x,y:s.y-2},col);drawTransientHealth(p,s,col);drawPlayerResources(p,s,col,kind)
}
function drawWallLights(){for(const l of world.wallLights||[]){if(!visibleTo(focus,l.x,l.y)&&md(focus,l)>12)continue;const s=ws(l.x,l.y),now=performance.now(),phase=now/70+l.x*2.7+l.y,f=4+Math.sin(phase)*2,cx=s.x+C.tile/2;ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle="#241712";ctx.fillRect(cx-7,s.y+13,14,4);ctx.fillRect(cx-3,s.y+10,6,17);ctx.fillStyle="#8b6031";ctx.fillRect(cx-5,s.y+14,10,2);ctx.fillRect(cx-2,s.y+11,4,14);ctx.fillStyle="#d2a35a";ctx.fillRect(cx-1,s.y+12,2,10);ctx.shadowColor=P.orange;ctx.shadowBlur=22;ctx.fillStyle="#b42e1f";ctx.beginPath();ctx.moveTo(cx,s.y+12);ctx.quadraticCurveTo(cx-f-2,s.y+2,cx+Math.sin(phase*.7)*3,s.y-9);ctx.quadraticCurveTo(cx+f+2,s.y+2,cx,s.y+12);ctx.fill();ctx.fillStyle=P.orange;ctx.beginPath();ctx.moveTo(cx,s.y+10);ctx.quadraticCurveTo(cx-f,s.y+1,cx-Math.sin(phase*.8)*2,s.y-5);ctx.quadraticCurveTo(cx+f,s.y+2,cx,s.y+10);ctx.fill();ctx.fillStyle=P.gold;ctx.beginPath();ctx.moveTo(cx,s.y+8);ctx.quadraticCurveTo(cx-3,s.y+1,cx,s.y-2);ctx.quadraticCurveTo(cx+3,s.y+1,cx,s.y+8);ctx.fill();ctx.fillStyle="#fff3bd";ctx.fillRect(cx-1,s.y+1,2,5);for(let n=0;n<5;n++){const a=phase*.34+n*1.8,r=7+n*2;ctx.globalAlpha=.35+n*.1;ctx.fillStyle=n%2?P.gold:P.orange;ctx.fillRect(cx+Math.sin(a)*r,s.y-4-(n*5+now/55)%24,2,2)}ctx.restore()}}
function drawFurniture(){
  for(const d of world.decor||[]){
    if(d.destroyed||d.blocking&&!d.structural&&!(host.blockingDecor||[]).some(b=>b.id===d.id))continue;if(!visibleTo(focus,d.x,d.y))continue;const q=ws(d.x,d.y),th=W.themeAt(world,d.x,d.y),dark="#241c2c",wood="#6f482b",woodHi="#a66a37",metal="#65707a",glow=th.accent,h=tileHash(d.x,d.y,d.variant||0),pulse=.65+.35*Math.sin(performance.now()/240+(h%19));ctx.save();ctx.globalAlpha=.98;ctx.imageSmoothingEnabled=false;ctx.fillStyle="rgba(0,0,0,.34)";ctx.beginPath();ctx.ellipse(q.x+C.tile/2,q.y+C.tile-4,d.blocking?17:13,4,0,0,Math.PI*2);ctx.fill();
    if(d.type==="fireplace"){
      const now=performance.now(),flicker=Math.sin(now/67+d.x)*2,cx=q.x+C.tile/2;ctx.fillStyle="#2a2423";ctx.fillRect(q.x+2,q.y+3,C.tile-4,C.tile-4);ctx.fillStyle="#7f614b";ctx.fillRect(q.x+3,q.y+3,C.tile-6,6);ctx.fillRect(q.x+3,q.y+3,6,C.tile-6);ctx.fillRect(q.x+C.tile-9,q.y+3,6,C.tile-6);ctx.fillStyle="#0b0808";ctx.fillRect(q.x+9,q.y+12,C.tile-18,C.tile-12);ctx.fillStyle="#5c341d";ctx.fillRect(q.x+9,q.y+C.tile-10,C.tile-18,5);ctx.shadowColor=P.orange;ctx.shadowBlur=22;ctx.fillStyle="#d54b27";ctx.beginPath();ctx.moveTo(cx-10,q.y+C.tile-9);ctx.quadraticCurveTo(cx-12+flicker,q.y+13,cx-3,q.y+8);ctx.quadraticCurveTo(cx+2,q.y+16,cx+9,q.y+C.tile-9);ctx.fill();ctx.fillStyle=P.orange;ctx.beginPath();ctx.moveTo(cx-6,q.y+C.tile-9);ctx.quadraticCurveTo(cx-4-flicker,q.y+16,cx+1,q.y+12);ctx.quadraticCurveTo(cx+7,q.y+18,cx+6,q.y+C.tile-9);ctx.fill();ctx.fillStyle=P.gold;ctx.fillRect(cx-2,q.y+18,4,10);for(let n=0;n<5;n++){ctx.globalAlpha=.35+n*.1;ctx.fillStyle=n%2?P.gold:P.orange;ctx.fillRect(cx-9+n*4+Math.sin(now/90+n)*3,q.y+10-((now/35+n*7)%18),2,2)}ctx.globalAlpha=1;ctx.shadowBlur=0
    }else if(["shelf","bookcase","tapeStack","slotRack","rack"].includes(d.type)){
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
      ctx.fillStyle="#363f49";ctx.fillRect(q.x+4,q.y+4,C.tile-8,C.tile-7);ctx.fillStyle=metal;ctx.fillRect(q.x+6,q.y+6,C.tile-12,C.tile-11);ctx.fillStyle="#03080d";ctx.fillRect(q.x+8,q.y+8,C.tile-16,13);ctx.shadowColor=glow;ctx.shadowBlur=8;ctx.fillStyle=glow;ctx.globalAlpha=.5+pulse*.5;ctx.fillRect(q.x+10,q.y+10,5+(h%9),2);ctx.fillRect(q.x+12,q.y+14,12,2);ctx.fillRect(q.x+C.tile-15,q.y+17,4,2);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.fillStyle="#202731";ctx.fillRect(q.x+9,q.y+24,C.tile-18,8);for(let bx=11;bx<C.tile-11;bx+=5){ctx.fillStyle=(bx+h)%3?"#85909c":glow;ctx.fillRect(q.x+bx,q.y+27,3,2)}
    }else if(["reactor","coil","obelisk","statue","pedestal"].includes(d.type)){
      ctx.fillStyle="#303640";ctx.fillRect(q.x+C.tile/2-8,q.y+4,16,C.tile-7);ctx.fillStyle=metal;ctx.fillRect(q.x+C.tile/2-5,q.y+6,10,C.tile-11);ctx.strokeStyle=glow;ctx.shadowColor=glow;ctx.shadowBlur=10+pulse*8;ctx.lineWidth=2;ctx.strokeRect(q.x+C.tile/2-10,q.y+8,20,C.tile-15);ctx.fillStyle=glow;ctx.globalAlpha=.35+pulse*.45;ctx.fillRect(q.x+C.tile/2-3,q.y+11,6,C.tile-21);for(let ry=12;ry<C.tile-10;ry+=7)ctx.fillRect(q.x+C.tile/2-12,q.y+ry,24,2);ctx.globalAlpha=1;ctx.fillStyle="#b8c1ca";ctx.fillRect(q.x+C.tile/2-10,q.y+5,20,3);ctx.fillRect(q.x+C.tile/2-11,q.y+C.tile-7,22,3)
    }else if(["sofa","display","bin","chestPile"].includes(d.type)){
      ctx.fillStyle=d.type==="sofa"?"#5d315f":wood;ctx.fillRect(q.x+4,q.y+11,C.tile-8,13);ctx.fillStyle=glow+"66";ctx.fillRect(q.x+6,q.y+8,C.tile-12,5);ctx.fillStyle="#2c1b31";ctx.fillRect(q.x+7,q.y+24,5,5);ctx.fillRect(q.x+C.tile-12,q.y+24,5,5)
    }else if(["speaker","lightBar","arch"].includes(d.type)){
      ctx.fillStyle=dark;ctx.fillRect(q.x+6,q.y+4,C.tile-12,C.tile-6);ctx.fillStyle=glow;ctx.globalAlpha=.55;ctx.fillRect(q.x+9,q.y+7,C.tile-18,3);ctx.fillRect(q.x+9,q.y+C.tile-10,C.tile-18,3)
    }else if(d.type==="shield"){
      ctx.fillStyle="#2c3440";ctx.beginPath();ctx.moveTo(q.x+C.tile/2,q.y+5);ctx.lineTo(q.x+C.tile-7,q.y+10);ctx.lineTo(q.x+C.tile-10,q.y+26);ctx.lineTo(q.x+C.tile/2,q.y+34);ctx.lineTo(q.x+10,q.y+26);ctx.lineTo(q.x+7,q.y+10);ctx.closePath();ctx.fill();ctx.strokeStyle=P.gold;ctx.stroke()
    }else{
      ctx.fillStyle=wood;ctx.fillRect(q.x+6,q.y+7,C.tile-12,C.tile-10);ctx.strokeStyle=woodHi;ctx.strokeRect(q.x+6,q.y+7,C.tile-12,C.tile-10);ctx.beginPath();ctx.moveTo(q.x+7,q.y+8);ctx.lineTo(q.x+C.tile-7,q.y+C.tile-8);ctx.stroke()
    }
    // Shared material pass: edge wear, fasteners, scratches and contact shadow.
    ctx.globalAlpha=.52;ctx.fillStyle="rgba(255,255,255,.15)";ctx.fillRect(q.x+6,q.y+6,Math.max(4,C.tile-12),1);if(h%3===0){ctx.strokeStyle="rgba(10,5,13,.42)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(q.x+8+(h%9),q.y+9);ctx.lineTo(q.x+16+(h%12),q.y+18);ctx.stroke()}if(d.blocking){ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(q.x+4,q.y+C.tile-5,C.tile-8,3);ctx.fillStyle="#c4a35c";ctx.fillRect(q.x+6,q.y+C.tile-7,2,2);ctx.fillRect(q.x+C.tile-8,q.y+C.tile-7,2,2)}const blocker=(host.blockingDecor||[]).find(b=>b.id===d.id);if(blocker&&!blocker.structural&&blocker.hp<blocker.maxHp){ctx.globalAlpha=.9;ctx.strokeStyle="#fff0b2";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x+8,q.y+7);ctx.lineTo(q.x+18,q.y+18);ctx.lineTo(q.x+13,q.y+29);ctx.moveTo(q.x+18,q.y+18);ctx.lineTo(q.x+31,q.y+12);ctx.stroke()}ctx.globalAlpha=1;ctx.restore()
  }
}
function drawGenerators(){
  for(const g of host.generators||[]){
    if(!g.alive||!visibleTo(focus,g.x,g.y))continue;const s=ws(g.x,g.y),t=performance.now()/130,powered=Boolean(g.powered),col=powered?P.red:"#62596a";
    ctx.save();ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.fillStyle="rgba(0,0,0,.5)";ctx.beginPath();ctx.ellipse(0,16,17,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#25202b";ctx.fillRect(-15,-13,30,27);ctx.strokeStyle="#82758c";ctx.lineWidth=2;ctx.strokeRect(-15,-13,30,27);ctx.fillStyle="#4c4553";ctx.fillRect(-12,-10,24,21);ctx.shadowColor=powered?P.red:"transparent";ctx.shadowBlur=powered?20:0;for(let ring=0;ring<3;ring++){ctx.save();ctx.rotate((ring%2?1:-1)*(powered?t:t*.12)*(1+ring*.35));ctx.strokeStyle=ring===0?col:ring===1?(powered?P.orange:"#403847"):(powered?P.gold:"#51485a");ctx.lineWidth=3-ring*.6;const r=11-ring*3;ctx.strokeRect(-r,-r,r*2,r*2);ctx.restore()}ctx.fillStyle=powered?"#fff3b0":"#17131c";ctx.fillRect(-3,-3,6,6);ctx.fillStyle=powered?P.red:"#332c39";for(const [rx,ry] of [[-12,-10],[9,-10],[-12,8],[9,8]])ctx.fillRect(rx,ry,3,3);ctx.restore();
    if(g.hpBarMs>0)drawTransientHealth(g,s,P.orange);if(md(g,focus)<3)label(powered?`GENERATOR ${g.hp}/${g.maxHp}`:`GENERATOR DORMANT — NEEDS LIGHT`,s,powered?P.red:P.grey)
  }
}
function drawShrinesSwitches(){for(const sh of host.shrines||[]){if(!sh.active||!visibleTo(focus,sh.x,sh.y))continue;const s=ws(sh.x,sh.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,t=performance.now()/650;ctx.save();ctx.fillStyle="rgba(0,0,0,.46)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-4,18,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#261937";ctx.beginPath();ctx.moveTo(cx,s.y+3);ctx.lineTo(s.x+C.tile-4,s.y+C.tile-4);ctx.lineTo(s.x+4,s.y+C.tile-4);ctx.closePath();ctx.fill();ctx.strokeStyle=P.purple;ctx.shadowColor=P.purple;ctx.shadowBlur=18;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#4d3169";ctx.fillRect(cx-5,s.y+13,10,20);ctx.fillStyle=P.purple;ctx.globalAlpha=.55+.35*Math.sin(t*5);ctx.fillRect(cx-2,s.y+8,4,23);ctx.globalAlpha=1;for(let n=0;n<6;n++){const a=t+n*Math.PI/3;ctx.fillStyle=n%2?P.purple:P.cyan;ctx.fillRect(cx+Math.cos(a)*14-1,cy+Math.sin(a)*10-1,3,3)}ctx.restore();if(md(sh,focus)<2)label("SHRINE",s,P.purple)}for(const sw of host.switches||[]){if(!sw.active||!visibleTo(focus,sw.x,sw.y))continue;const s=ws(sw.x,sw.y),col=sw.revealSecret?P.purple:P.cyan,pulse=.65+.35*Math.sin(performance.now()/120+sw.x);ctx.save();ctx.fillStyle="#151b26";ctx.fillRect(s.x+4,s.y+4,C.tile-8,C.tile-8);ctx.fillStyle="#344154";ctx.fillRect(s.x+7,s.y+7,C.tile-14,C.tile-14);ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=8+pulse*8;ctx.lineWidth=2;ctx.strokeRect(s.x+6,s.y+6,C.tile-12,C.tile-12);ctx.fillStyle="#081018";ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle=col;ctx.stroke();ctx.fillStyle=col;ctx.globalAlpha=.6+pulse*.4;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;for(const [rx,ry] of [[8,8],[C.tile-10,8],[8,C.tile-10],[C.tile-10,C.tile-10]])ctx.fillRect(s.x+rx,s.y+ry,2,2);ctx.restore();if(md(sw,focus)<3)label(sw.revealSecret?"REMOTE SECRET SWITCH — SHOOT OR TOUCH":"WALL SWITCH — SHOOT OR TOUCH",s,col)}}
function drawTraps(){const now=performance.now();for(const t of host.traps||[]){if(!visibleTo(focus,t.x,t.y))continue;const s=ws(t.x,t.y),active=SYS.trapActive(t,now),col=t.kind==="fire"?P.orange:t.kind==="shock"?P.cyan:P.red;ctx.save();ctx.globalAlpha=active?1:.38;ctx.strokeStyle=active?col:P.green;ctx.fillStyle=active?col:P.green;ctx.lineWidth=active?3:1.5;if(t.kind==="spike"){for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s.x+5+i*7,s.y+C.tile-5);ctx.lineTo(s.x+9+i*7,s.y+8);ctx.lineTo(s.x+13+i*7,s.y+C.tile-5);ctx.stroke()}}else{ctx.strokeRect(s.x+5,s.y+5,C.tile-10,C.tile-10);ctx.beginPath();ctx.moveTo(s.x+6,s.y+6);ctx.lineTo(s.x+C.tile-6,s.y+C.tile-6);ctx.moveTo(s.x+C.tile-6,s.y+6);ctx.lineTo(s.x+6,s.y+C.tile-6);ctx.stroke()}ctx.globalAlpha=1;ctx.fillStyle=active?col:P.green;ctx.fillRect(s.x+3,s.y+3,6,3);ctx.restore();if(md(t,focus)<=2)label(`${t.kind.toUpperCase()} TRAP — ${active?"ACTIVE":"SAFE CYCLE"}`,s,active?col:P.green)}}
function drawBoulderTrap(){const b=host.boulderTrap;if(!b||(!b.active&&!b.triggered)||!visibleTo(focus,b.x,b.y))return;const s=ws(b.x,b.y),cx=s.x+C.tile/2,cy=s.y+C.tile/2,t=performance.now()/90;ctx.save();ctx.translate(cx,cy);ctx.rotate(t*(b.dx||b.dy||1));ctx.shadowColor=b.warningMs>0?P.red:"#6e6671";ctx.shadowBlur=b.warningMs>0?18:8;ctx.fillStyle="#403b44";ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#817887";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#242029";ctx.fillRect(-8,-8,6,5);ctx.fillRect(4,-3,7,5);ctx.fillRect(-4,6,6,5);ctx.fillStyle="#9b919f";ctx.fillRect(-7,-10,5,3);ctx.restore();if(md(b,focus)<=4)label(b.warningMs>0?"BOULDER — MOVE!":"ROLLING BOULDER",s,P.red)}
function drawSpecialObjects(){
  const shops=host.shops?.length?host.shops:[host.trader].filter(Boolean);for(const t of shops)if(t?.active&&visibleTo(focus,t.x,t.y)){t.discovered=true;const s=ws(t.x,t.y),entrance=t.shopType==="entrance",col=entrance?P.cyan:P.gold;ctx.save();ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.strokeStyle=col;ctx.fillStyle="#10222b";ctx.shadowColor=col;ctx.shadowBlur=12;ctx.lineWidth=2;ctx.fillRect(-14,-9,28,19);ctx.strokeRect(-14,-9,28,19);ctx.fillStyle=P.gold;ctx.fillRect(-12,-6,24,4);ctx.fillStyle=col;ctx.fillRect(-10,1,6,5);ctx.fillRect(4,1,6,5);ctx.font='bold 6px "Courier New"';ctx.textAlign="center";ctx.fillText("SHOP",0,9);ctx.restore();if(md(t,focus)<=3)label(entrance?"FLOOR SUPPLY DESK — STEP ON TO SHOP":`SECRET DUNGEON SHOP — TRADE OR BUY`,s,col)}
  for(const c of host.deathCaches||[])if(c.active&&visibleTo(focus,c.x,c.y)){const s=ws(c.x,c.y);ctx.save();ctx.fillStyle="#2a1c31";ctx.strokeStyle=P.red;ctx.lineWidth=2;ctx.shadowColor=P.red;ctx.shadowBlur=9;ctx.fillRect(s.x+5,s.y+8,C.tile-10,C.tile-12);ctx.strokeRect(s.x+5,s.y+8,C.tile-10,C.tile-12);ctx.fillStyle=P.white;ctx.fillRect(s.x+10,s.y+12,C.tile-20,3);ctx.fillStyle=P.red;ctx.fillRect(s.x+C.tile/2-2,s.y+18,4,5);ctx.restore();if(md(c,focus)<=3)label("DEATH CACHE — RECOVER SCORE, XP & LOOT",s,P.red)}
  const clue=host.bloodClue;if(clue&&visibleTo(focus,clue.x,clue.y)){const s=ws(clue.x,clue.y);ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle="#7f2637";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(s.x+7,s.y+10);ctx.lineTo(s.x+15,s.y+6);ctx.lineTo(s.x+21,s.y+15);ctx.lineTo(s.x+28,s.y+9);ctx.moveTo(s.x+10,s.y+27);ctx.lineTo(s.x+18,s.y+22);ctx.lineTo(s.x+25,s.y+30);ctx.lineTo(s.x+34,s.y+24);ctx.stroke();ctx.restore();if(md(clue,focus)<=2)label(clue.seen?`BLOOD CLUE — ${(clue.sequence||[]).join(" → ")}`:"FADED BLOOD MARKS",s,P.red)}
  const mem=host.memoryPuzzle;if(mem){for(const tile of mem.tiles||[]){if(!visibleTo(focus,tile.x,tile.y))continue;const s=ws(tile.x,tile.y),flash=mem.phase==="show"&&mem.flashTile===tile.index,col=mem.solved?P.green:flash?P.gold:P.cyan;ctx.save();ctx.globalAlpha=mem.solved?.58:flash?1:.42;ctx.fillStyle=flash?"rgba(255,216,90,.45)":"rgba(30,60,82,.34)";ctx.strokeStyle=col;ctx.lineWidth=flash?3:1.5;ctx.shadowColor=flash?P.gold:"transparent";ctx.shadowBlur=flash?16:0;ctx.fillRect(s.x+4,s.y+4,C.tile-8,C.tile-8);ctx.strokeRect(s.x+5,s.y+5,C.tile-10,C.tile-10);ctx.restore()}if(W.roomAt(world,focus.x,focus.y)===mem.roomId&&!mem.solved){const room=world.rooms[mem.roomId],s=ws(Math.floor(room.x+room.w/2),room.y+1);label(mem.phase==="input"?`MEMORY TILES — ${mem.inputIndex||0}/5`:"MEMORY TILES — WATCH",s,P.cyan)}}
  const tp=host.sequenceTorchPuzzle;if(tp){for(const torch of tp.torches||[]){if(!visibleTo(focus,torch.x,torch.y))continue;const s=ws(torch.x,torch.y),lit=torch.lit||tp.solved;ctx.save();ctx.fillStyle="#65452c";ctx.fillRect(s.x+C.tile/2-2,s.y+14,4,17);ctx.strokeStyle=lit?P.gold:"#6d6172";ctx.lineWidth=2;ctx.strokeRect(s.x+8,s.y+7,C.tile-16,C.tile-13);if(lit){ctx.shadowColor=P.orange;ctx.shadowBlur=16;ctx.fillStyle=P.orange;ctx.beginPath();ctx.moveTo(s.x+C.tile/2,s.y+16);ctx.quadraticCurveTo(s.x+C.tile/2-9,s.y+4,s.x+C.tile/2,s.y-2);ctx.quadraticCurveTo(s.x+C.tile/2+9,s.y+5,s.x+C.tile/2,s.y+16);ctx.fill()}ctx.fillStyle=lit?P.gold:P.grey;ctx.font='bold 10px "Courier New"';ctx.textAlign="center";ctx.fillText(torch.dir,s.x+C.tile/2,s.y+C.tile-5);ctx.restore();if(md(torch,focus)<=2)label(`${torch.dir} TORCH — ${lit?"LIT":"SHOOT OR TOUCH"}`,s,lit?P.gold:P.grey)}}
  const wb=host.weightBridge;if(wb){for(const q of wb.pitTiles||[]){if(!visibleTo(focus,q.x,q.y))continue;const s=ws(q.x,q.y);ctx.fillStyle="#020104";ctx.fillRect(s.x,s.y,C.tile,C.tile);ctx.strokeStyle="rgba(95,73,112,.32)";ctx.strokeRect(s.x+1,s.y+1,C.tile-2,C.tile-2)}for(const q of wb.bridgeTiles||[]){if(!visibleTo(focus,q.x,q.y))continue;const s=ws(q.x,q.y);ctx.fillStyle=wb.stabilized?"#725337":"#5c402d";ctx.fillRect(s.x+2,s.y+5,C.tile-4,C.tile-10);ctx.strokeStyle=wb.stabilized?P.green:"#9d7449";ctx.lineWidth=1.5;ctx.strokeRect(s.x+2,s.y+5,C.tile-4,C.tile-10);ctx.strokeStyle="rgba(20,10,7,.7)";for(let n=9;n<C.tile-6;n+=8){ctx.beginPath();ctx.moveTo(s.x+4,s.y+n);ctx.lineTo(s.x+C.tile-4,s.y+n);ctx.stroke()}}if(W.roomAt(world,focus.x,focus.y)===wb.roomId&&!wb.stabilized){const q=(wb.bridgeTiles||[])[1]||(wb.bridgeTiles||[])[0];if(q)label("ROTTEN BRIDGE — EMPTY INVENTORY ONLY",ws(q.x,q.y),P.gold)}}
}
function drawRescue(){
  const r=host.rescue;if(!r||r.rescued||!visibleTo(focus,r.x,r.y))return;const s=ws(r.x,r.y),phase=performance.now()/120+(r.x+r.y),walking=Boolean(r.following),step=walking?Math.sin(phase)*3:0,bob=walking?-Math.abs(Math.sin(phase))*2:Math.sin(phase*.2)*.5,cx=s.x+C.tile/2,cy=s.y+C.tile/2+bob;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();ctx.ellipse(cx,s.y+C.tile-2,12,4,0,0,Math.PI*2);ctx.fill();ctx.shadowColor=P.green;ctx.shadowBlur=walking?11:6;
  px(cx,cy,-7,-14,14,4,"#2a1d2c");px(cx,cy,-6,-10,12,6,"#bd8e6c");px(cx,cy,-8,-4,16,14,"#285b52");px(cx,cy,-7,-3,14,12,"#38a878");px(cx,cy,-11,-3-step*.25,4,12,"#22483f");px(cx,cy,7,-3+step*.25,4,12,"#22483f");px(cx,cy,-7+step,10,5,7,"#28232e");px(cx,cy,2-step,10,5,7,"#28232e");px(cx,cy,-8+step,15,6,3,"#111015");px(cx,cy,2-step,15,6,3,"#111015");
  ctx.fillStyle="#101719";ctx.fillRect(cx-5,cy-1,10,7);ctx.strokeStyle=P.green;ctx.strokeRect(cx-5,cy-1,10,7);ctx.fillStyle=P.green;ctx.font='bold 6px "Courier New"';ctx.textAlign="center";ctx.fillText("CCG",cx,cy+4);ctx.restore();label(r.following?"SCOUT FOLLOWING":"TRAPPED SCOUT",s,P.green)
}
function drawShots(){ctx.save();ctx.lineCap="round";ctx.globalCompositeOperation="lighter";for(const b of bullets){const s=ws(b.x,b.y),x=s.x+C.tile/2,y=s.y+C.tile/2,col=b.element==="fire"?P.orange:b.element==="shock"?P.cyan:b.element==="physical"?P.white:P.gold,len=b.style==="shock"?18:15;ctx.shadowColor=col;ctx.shadowBlur=18;ctx.strokeStyle=col;ctx.globalAlpha=.32;ctx.lineWidth=b.style==="shock"?10:8;ctx.beginPath();ctx.moveTo(x-b.dx*len,y-b.dy*len);ctx.lineTo(x+b.dx*5,y+b.dy*5);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=b.style==="shock"?4:3;ctx.beginPath();ctx.moveTo(x-b.dx*len,y-b.dy*len);ctx.lineTo(x+b.dx*5,y+b.dy*5);ctx.stroke();ctx.fillStyle="#fffbd7";ctx.beginPath();ctx.arc(x+b.dx*4,y+b.dy*4,b.style==="shock"?3.5:2.5,0,Math.PI*2);ctx.fill()}for(const b of enemyBullets){const s=ws(b.x,b.y),x=s.x+C.tile/2,y=s.y+C.tile/2,col=b.style==="food"?P.orange:b.style==="root"?P.green:b.style==="fire"?P.gold:b.style==="shock"?P.cyan:P.red,len=b.style==="fire"?18:13;ctx.shadowColor=col;ctx.shadowBlur=19;ctx.strokeStyle=col;ctx.globalAlpha=.3;ctx.lineWidth=b.style==="fire"?13:9;ctx.beginPath();ctx.moveTo(x-b.dx*len,y-b.dy*len);ctx.lineTo(x+b.dx*4,y+b.dy*4);ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=b.style==="fire"?6:3;ctx.beginPath();ctx.moveTo(x-b.dx*len,y-b.dy*len);ctx.lineTo(x+b.dx*4,y+b.dy*4);ctx.stroke();ctx.fillStyle=b.style==="root"?"#e1ffd1":"#fff2cf";ctx.beginPath();ctx.arc(x+b.dx*3,y+b.dy*3,b.style==="fire"?4:2.5,0,Math.PI*2);ctx.fill()}ctx.restore()}
function drawEffects(){ctx.save();ctx.globalCompositeOperation="lighter";for(const q of particles){const alpha=Math.max(0,Math.min(1,q.life/360)),x=view.x+q.x-cam.x,y=view.y+q.y-cam.y;ctx.globalAlpha=alpha;ctx.fillStyle=q.col;if(q.glow){ctx.shadowColor=q.col;ctx.shadowBlur=q.glow}if(q.shape){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(q.angle||0);if(q.shape==="bone"){ctx.fillRect(-q.size*.7,-1,q.size*1.4,3);ctx.beginPath();ctx.arc(-q.size*.7,0,2,0,Math.PI*2);ctx.arc(q.size*.7,0,2,0,Math.PI*2);ctx.fill()}else{ctx.fillRect(-q.size*.9,-1,q.size*1.8,Math.max(2,q.size*.35))}ctx.restore()}else{ctx.fillRect(Math.round(x),Math.round(y),q.size,q.size);if(q.size>2.5){ctx.globalAlpha=alpha*.45;ctx.fillRect(Math.round(x-q.vx*2),Math.round(y-q.vy*2),Math.max(1,q.size*.65),Math.max(1,q.size*.65))}}ctx.shadowBlur=0}ctx.globalAlpha=1;for(const r of rings){ctx.globalAlpha=Math.max(0,r.life/340);ctx.strokeStyle=r.col;ctx.shadowColor=r.col;ctx.shadowBlur=8;ctx.lineWidth=2;ctx.beginPath();ctx.arc(view.x+r.x-cam.x,view.y+r.y-cam.y,r.r,0,Math.PI*2);ctx.stroke()}ctx.restore();ctx.globalAlpha=1;for(const f of floaters){const owner=f.ownerId?localPlayers().find(p=>p.id===f.ownerId):null,age=1-Math.max(0,f.life)/Math.max(1,f.maxLife||720),scale=f.pickup?(f.startScale+(f.endScale-f.startScale)*Math.min(1,age/.62)):1,x=owner?owner.rx*C.tile+C.tile/2:f.x,y=owner?owner.ry*C.tile-11-age*18:f.y;ctx.save();ctx.globalAlpha=f.pickup?Math.min(1,age*7)*Math.min(1,f.life/300):Math.max(0,f.life/420);ctx.translate(view.x+x-cam.x,view.y+y-cam.y);ctx.scale(scale,scale);ctx.fillStyle=f.col;ctx.strokeStyle="rgba(5,2,9,.92)";ctx.lineWidth=f.pickup?4:2;ctx.shadowColor=f.col;ctx.shadowBlur=f.pickup?18:5;ctx.font=f.pickup?'bold 15px Orbitron, Consolas, "Courier New"':'bold 12px Consolas, "Courier New"';ctx.textAlign="center";ctx.textBaseline="bottom";ctx.strokeText(f.text,0,0);ctx.fillText(f.text,0,0);ctx.restore()}ctx.globalAlpha=1}
function drawHazards(){for(const h of hazards){const s=ws(h.x,h.y),t=Math.max(0,h.life/h.maxLife);ctx.globalAlpha=.45+.4*Math.abs(Math.sin(performance.now()/70));ctx.strokeStyle=P.red;ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x+C.tile/2,s.y+C.tile/2,8+(1-t)*8,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
function drawDedicatedHazards(){const elapsed=host.floorElapsed||run.elapsed||0;for(const hazard of host.hazardRooms||[])for(const cell of hazard.cells||[]){if(!visibleTo(focus,cell.x,cell.y))continue;const state=SYS.hazardCellState(hazard,cell.x,cell.y,elapsed);if(!state.active&&!state.warning)continue;const s=ws(cell.x,cell.y),col=state.active?P.red:P.gold,pulse=.55+.45*Math.sin(performance.now()/85+cell.x+cell.y);ctx.save();ctx.globalAlpha=state.active?.72:.2+.25*pulse;ctx.fillStyle=col;ctx.fillRect(s.x+2,s.y+2,C.tile-4,C.tile-4);ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=state.active?3:2;ctx.strokeRect(s.x+4,s.y+4,C.tile-8,C.tile-8);if(hazard.type==="blade"){const swing=Math.sin(performance.now()/130+cell.group)*13;ctx.translate(s.x+C.tile/2,s.y+C.tile/2);ctx.rotate(swing/18);ctx.fillStyle="#c7d0d8";ctx.beginPath();ctx.moveTo(-3,-18);ctx.lineTo(7,12);ctx.lineTo(0,17);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.strokeStyle="#fff";ctx.stroke()}else if(hazard.type==="embers"){ctx.strokeStyle=state.active?P.gold:"#8d4e32";for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(s.x+5+n*8,s.y+6);ctx.lineTo(s.x+11+n*6,s.y+18);ctx.lineTo(s.x+7+n*7,s.y+34);ctx.stroke()}if(state.active)for(let n=0;n<5;n++){ctx.fillStyle=n%2?P.orange:P.gold;ctx.fillRect(s.x+6+n*7,s.y+8+Math.sin(performance.now()/70+n)*5,3,3)}}else{ctx.fillStyle="#d9dde2";for(let n=0;n<3;n++){const travel=state.active?(performance.now()/3+n*17)%C.tile:6+n*11;ctx.fillRect(s.x+travel,s.y+8+n*10,11,2);ctx.fillStyle=P.red;ctx.fillRect(s.x+travel+9,s.y+7+n*10,3,4)}}ctx.restore()}}
function drawWindyCorridor(){const nest=host.spiderNest;if(!nest)return;const now=performance.now();for(const q of nest.corridorCells||[]){if(!visibleTo(focus,q.x,q.y)&&md(focus,q)>7)continue;const s=ws(q.x,q.y);ctx.save();ctx.strokeStyle="rgba(188,216,235,.45)";ctx.lineWidth=1.5;for(let n=0;n<3;n++){const drift=(now/8+n*17+q.x*9)%C.tile;ctx.beginPath();ctx.moveTo(s.x+drift-18,s.y+10+n*9);ctx.bezierCurveTo(s.x+drift-8,s.y+5+n*9,s.x+drift+4,s.y+16+n*9,s.x+drift+16,s.y+9+n*9);ctx.stroke()}ctx.restore()}}
function lightPool(x,y,r,rgb,strength=.22,core=8){if(x+r<view.x||y+r<view.y||x-r>view.x+view.w||y-r>view.y+view.h)return;const g=ctx.createRadialGradient(x,y,core,x,y,r);g.addColorStop(0,`rgba(${rgb},${strength})`);g.addColorStop(.25,`rgba(${rgb},${strength*.62})`);g.addColorStop(.68,`rgba(${rgb},${strength*.18})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
function drawDynamicLighting(){
  const now=performance.now();ctx.save();ctx.globalCompositeOperation="lighter";
  if(focus.torchMs>0){const s=ws(focus.rx,focus.ry),flicker=.94+Math.sin(now/83)*.035+Math.sin(now/37)*.02;lightPool(s.x+C.tile/2,s.y+C.tile/2,C.player.torchRadius*C.tile*flicker,"255,177,67",.21,14);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*3.2,"255,229,139",.2,6)}
  for(const fire of world.fireplaces||[]){const s=ws(fire.x,fire.y),flicker=.92+Math.sin(now/61+fire.x)*.06+Math.sin(now/31+fire.y)*.025;lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*6*flicker,"255,125,42",.24,8);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*2.5,"255,221,128",.2,4)}
  for(const l of world.wallLights||[]){const s=ws(l.x,l.y),flicker=.91+Math.sin(now/71+l.x*4)*.07;lightPool(s.x+C.tile/2,s.y+7,(l.radius||5)*C.tile*flicker,"255,157,54",.16,5)}
  for(const e of host.enemies||[])if(e.alive&&e.follower){const visual=enemyVisuals.get(e.id),s=ws(visual?.rx??e.x,visual?.ry??e.y),r=(C.enemy.followerLightRadius||10)*C.tile,flicker=.95+Math.sin(now/63+enemySpriteSeed(e)%17)*.04;lightPool(s.x+C.tile/2,s.y+C.tile/2,r*flicker,"255,142,48",.24,9);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*2.4,"255,219,112",.22,4)}
  if(host.exitOpen){const s=ws(world.exit.x,world.exit.y);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*4.5,"164,94,255",.2,10);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*2.2,"108,236,255",.18,5)}
  for(const g of host.generators||[])if(g.alive&&g.powered){const s=ws(g.x,g.y);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*2.6,"255,55,63",.17,5)}
  for(const sh of host.shrines||[])if(sh.active){const s=ws(sh.x,sh.y);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*2.3,"174,94,255",.16,5)}
  for(const b of bullets){const s=ws(b.x,b.y),rgb=b.element==="shock"?"80,225,255":b.element==="fire"?"255,105,35":b.element==="physical"?"235,245,255":"255,211,75";lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*1.45,rgb,.27,2)}
  for(const b of enemyBullets){const s=ws(b.x,b.y),rgb=b.style==="root"?"91,210,91":b.style==="shock"?"80,225,255":b.style==="fire"?"255,111,32":"255,45,73";lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*1.35,rgb,.24,2)}
  for(const h of hazards){const s=ws(h.x,h.y);lightPool(s.x+C.tile/2,s.y+C.tile/2,C.tile*1.8,"255,56,48",.16,3)}ctx.restore();
  // Soft vignette adds depth while leaving the central combat area untouched.
  ctx.save();const cx=view.x+view.w/2,cy=view.y+view.h/2,vg=ctx.createRadialGradient(cx,cy,Math.min(view.w,view.h)*.22,cx,cy,Math.max(view.w,view.h)*.72);vg.addColorStop(0,"rgba(5,2,9,0)");vg.addColorStop(.72,"rgba(4,2,7,.06)");vg.addColorStop(1,"rgba(2,1,4,.30)");ctx.fillStyle=vg;ctx.fillRect(view.x,view.y,view.w,view.h);ctx.restore()
}
function drawFog(){const ex=explored.get(focus.id)||new Set(),x0=Math.max(0,Math.floor(cam.x/C.tile)-1),x1=Math.min(C.worldWidth-1,Math.ceil((cam.x+view.w)/C.tile)+1),y0=Math.max(0,Math.floor(cam.y/C.tile)-1),y1=Math.min(C.worldHeight-1,Math.ceil((cam.y+view.h)/C.tile)+1),torchEnemies=(host.enemies||[]).filter(e=>e.alive&&e.follower),wallLights=world.wallLights||[],fireplaces=world.fireplaces||[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(visibleTo(focus,x,y))continue;const s=ws(x,y);let alpha=ex.has(`${x},${y}`) ? .92 : 1;for(const e of torchEnemies){const d=Math.hypot(x-e.x,y-e.y),r=C.enemy.followerLightRadius||10;if(d<=r)alpha=Math.min(alpha,.32+(d/r)*.48)}for(const l of wallLights){const d=Math.hypot(x-l.x,y-l.y),r=l.radius||5;if(d<=r)alpha=Math.min(alpha,.45+(d/r)*.4)}for(const fire of fireplaces){const d=Math.hypot(x-fire.x,y-fire.y),r=6;if(d<=r)alpha=Math.min(alpha,.3+(d/r)*.55)}if(host.exitOpen){const d=Math.hypot(x-world.exit.x,y-world.exit.y);if(d<=5)alpha=Math.min(alpha,.38+d/5*.45)}ctx.fillStyle=`rgba(0,0,0,${alpha})`;ctx.fillRect(s.x,s.y,C.tile,C.tile)}drawDynamicLighting()}
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
  view=v;focus=p;cam=camFor(p,v);ctx.save();ctx.beginPath();ctx.rect(v.x,v.y,v.w,v.h);ctx.clip();ctx.fillStyle=P.black;ctx.fillRect(v.x,v.y,v.w,v.h);const x0=Math.max(0,Math.floor(cam.x/C.tile)-1),x1=Math.min(C.worldWidth-1,Math.ceil((cam.x+v.w)/C.tile)+1),y0=Math.max(0,Math.floor(cam.y/C.tile)-1),y1=Math.min(C.worldHeight-1,Math.ceil((cam.y+v.h)/C.tile)+1);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)drawTile(x,y);drawWindyCorridor();drawDedicatedHazards();drawFurniture();drawDoors();drawExit();drawWallLights();drawHazards();drawBoulderTrap();drawTraps();drawGenerators();drawShrinesSwitches();drawChests();drawSpecialObjects();host.items.forEach(drawItem);host.enemies.forEach(drawEnemy);drawStalker();drawRescue();drawShots();for(const r of remote.values())if(performance.now()-r.lastSeen<2600&&visibleTo(p,r.x,r.y))drawPlayer(r,"remote");for(const lp of localPlayers())drawPlayer(lp,lp===p2?"p2":"p1");drawFog();drawEffects();ctx.restore()
}
function render(){if(!world||!p1)return;renderShake=shake>0?{x:(Math.random()-.5)*shake,y:(Math.random()-.5)*shake}:{x:0,y:0};if(shake>0){shake*=.84;if(shake<.25)shake=0}ctx.fillStyle=P.black;ctx.fillRect(0,0,canvas.width,canvas.height);if(p2){renderView(p1,{x:0,y:0,w:canvas.width/2,h:canvas.height});renderView(p2,{x:canvas.width/2,y:0,w:canvas.width/2,h:canvas.height});ctx.fillStyle=P.purple;ctx.fillRect(canvas.width/2-2,0,4,canvas.height)}else renderView(p1,{x:0,y:0,w:canvas.width,h:canvas.height});buildReferenceGuide();renderRadarPanel(p1);if(damageFlash>0){ctx.fillStyle=`rgba(255,50,70,${Math.min(.18,damageFlash*.18)})`;ctx.fillRect(0,0,canvas.width,canvas.height)}}
function resizeGameCanvas(){
  const area=document.querySelector(".canvas-wrap");if(!area)return;const r=area.getBoundingClientRect(),w=Math.max(640,Math.floor(r.width)),h=Math.max(360,Math.floor(r.height));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=false;cameras.clear()}
}
function syncFullscreenState(){const on=Boolean(document.fullscreenElement);if(UI.fullscreenHint)UI.fullscreenHint.classList.toggle("hidden",on);const b=$("fullscreen-btn");if(b)b.textContent=on?"EXIT FULLSCREEN":"FULLSCREEN";requestAnimationFrame(resizeGameCanvas)}
let pauseReturnMode="playing";
function openPauseMenu(){
  if(!run||["menu","lobby","ended"].includes(mode))return false;
  if(mode!=="paused"){pauseReturnMode=mode||"playing";mode="paused";input.clear();S.setMusicLevel(.03)}
  UI.pause.classList.remove("hidden");return true
}
function closePauseMenu(){
  if(mode!=="paused")return false;UI.pause.classList.add("hidden");mode=pauseReturnMode&&pauseReturnMode!=="paused"?pauseReturnMode:"playing";pauseReturnMode="playing";input.clear();S.setMusicLevel(.075);return true
}
function pause(){if(mode==="paused")return closePauseMenu();if(mode==="playing")return openPauseMenu();return false}
async function toggleFullscreen(){const shell=document.querySelector(".ccg-game");try{if(!document.fullscreenElement)await shell.requestFullscreen();else await document.exitFullscreen()}catch(_){showToast("FULLSCREEN UNAVAILABLE","Your browser blocked fullscreen for this session.","red")}}
function toggleSound(){S.toggle();sync()}
function loop(t){const dt=Math.min(45,t-last||16);last=t;if(damageFlash>0)damageFlash=Math.max(0,damageFlash-dt/500);update(dt);render();requestAnimationFrame(loop)}
