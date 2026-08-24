/* The Lost Sizzler V10.41 — environment atlas transparency/cache hotfix.
 * Normalises the uploaded door/torch atlas at runtime, strips any baked QA
 * checkerboard/white background from cell edges, and owns door/torch drawing.
 */
(()=>{
  "use strict";
  if(window.__CCG_LOST_SIZZLER_V141_ENVIRONMENT_TRANSPARENCY__)return;
  window.__CCG_LOST_SIZZLER_V141_ENVIRONMENT_TRANSPARENCY__=true;

  const REV="20260825c";
  const CELL=64, COLS=6, ROWS=5, GUTTER=1;
  const state={ready:false,installed:false,timer:0,canvas:null,error:null};
  const source=new Image();
  source.decoding="async";
  source.src=`assets/pixel/environment-atlas-v10-35.png?v=${REV}`;

  const md=(a,b)=>Math.abs(Number(a?.x||0)-Number(b?.x||0))+Math.abs(Number(a?.y||0)-Number(b?.y||0));
  const envRow=d=>d?.sigilGate?3:d?.type==="switch"?2:d?.type==="bronze"?1:0;

  function backgroundCandidate(r,g,b,a){
    if(a===0)return true;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),neutral=max-min<=18;
    if(neutral&&min>=165)return true;
    if(r>=220&&g<=80&&b<=80)return true;
    return false;
  }

  function clearConnectedBackground(imageData){
    const {data,width,height}=imageData,total=width*height;
    const seen=new Uint8Array(total),queue=new Int32Array(total);
    let head=0,tail=0;
    const enqueue=index=>{if(seen[index])return;const o=index*4;if(!backgroundCandidate(data[o],data[o+1],data[o+2],data[o+3]))return;seen[index]=1;queue[tail++]=index};
    for(let x=0;x<width;x++){enqueue(x);enqueue((height-1)*width+x)}
    for(let y=0;y<height;y++){enqueue(y*width);enqueue(y*width+width-1)}
    while(head<tail){
      const index=queue[head++],x=index%width,y=(index/width)|0;
      if(x>0)enqueue(index-1);if(x+1<width)enqueue(index+1);if(y>0)enqueue(index-width);if(y+1<height)enqueue(index+width);
    }
    for(let i=0;i<total;i++)if(seen[i])data[i*4+3]=0;
    return imageData;
  }

  function normaliseAtlas(){
    try{
      if(!source.naturalWidth||!source.naturalHeight)return false;
      const sw=source.naturalWidth/COLS,sh=source.naturalHeight/ROWS;
      if(!Number.isInteger(sw)||!Number.isInteger(sh)||sw<8||sh<8)throw new Error(`unexpected environment atlas size ${source.naturalWidth}x${source.naturalHeight}`);
      const output=document.createElement("canvas");output.width=COLS*CELL;output.height=ROWS*CELL;
      const out=output.getContext("2d",{willReadFrequently:true});if(!out)throw new Error("2D canvas unavailable");
      out.imageSmoothingEnabled=false;out.clearRect(0,0,output.width,output.height);
      const cell=document.createElement("canvas");cell.width=sw;cell.height=sh;
      const g=cell.getContext("2d",{willReadFrequently:true});if(!g)throw new Error("2D cell canvas unavailable");
      g.imageSmoothingEnabled=false;
      for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
        g.clearRect(0,0,sw,sh);
        g.drawImage(source,col*sw,row*sh,sw,sh,0,0,sw,sh);
        const pixels=clearConnectedBackground(g.getImageData(0,0,sw,sh));
        g.putImageData(pixels,0,0);
        out.drawImage(cell,0,0,sw,sh,col*CELL,row*CELL,CELL,CELL);
      }
      state.canvas=output;state.ready=true;state.error=null;
      return true;
    }catch(error){state.error=error;console.warn("[Lost Sizzler V10.41] environment atlas cleanup failed",error);return false}
  }

  function drawDoorsFresh(){
    const image=state.canvas;if(!image||typeof host==="undefined"||typeof focus==="undefined")return;
    const now=performance.now();
    for(const d of host?.doors||[]){
      if(d?.type==="secret"||!visibleTo?.(focus,d.x,d.y))continue;
      const duration=Math.max(1,(d.openAt||0)-(d.openingStart||0));
      const progress=d.open?1:d.opening?Math.max(0,Math.min(1,(now-(d.openingStart||now))/duration)):0;
      const frame=Math.max(0,Math.min(5,Math.round(progress*5))),s=ws(d.x,d.y);
      const sx=frame*CELL+GUTTER,sy=envRow(d)*CELL+GUTTER,sw=CELL-GUTTER*2,sh=CELL-GUTTER*2;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(s.x+C.tile/2),Math.round(s.y+C.tile/2));if(d.orientation!=="horizontal")ctx.rotate(Math.PI/2);
      ctx.drawImage(image,sx,sy,sw,sh,-30,-30,60,60);ctx.restore();
      if(md(d,focus)<=2&&typeof label==="function"){
        const text=d.sigilGate&&d.locked?"REINFORCED SIGIL GATE":d.locked?(d.type==="switch"?"SWITCH GATE":d.type==="bronze"?"LOCKED BRONZE DOOR":"SEALED DOOR"):d.open?"OPEN DOOR":d.opening?"DOOR OPENING…":"CLOSED DOOR";
        label(text,{x:s.x,y:s.y-2},d.locked?P.gold:d.open?P.green:P.cyan);
      }
    }
  }

  function drawTorchesFresh(){
    const image=state.canvas;if(!image||typeof world==="undefined"||typeof focus==="undefined")return;
    const frame=Math.floor(performance.now()/115)%6;
    const sx=frame*CELL+GUTTER,sy=4*CELL+GUTTER,sw=CELL-GUTTER*2,sh=CELL-GUTTER*2;
    for(const light of world?.wallLights||[]){
      if(!visibleTo?.(focus,light.x,light.y)&&md(focus,light)>12)continue;
      const s=ws(light.x,light.y);
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,sx,sy,sw,sh,Math.round(s.x-3),Math.round(s.y-16),48,48);ctx.restore();
    }
  }

  function install(){
    if(state.installed||!state.ready||!window.__CCG_LOST_SIZZLER_QUALITY_V135__)return false;
    if(typeof window.drawDoors!=="function"||typeof window.drawWallLights!=="function")return false;
    const previousDoors=window.drawDoors;
    window.drawDoors=function drawDoorsV141TransparentEnvironment(){
      const all=host?.doors||[];
      const secrets=all.filter(d=>d?.type==="secret");
      if(secrets.length){try{host.doors=secrets;previousDoors.apply(this,arguments)}finally{host.doors=all}}
      drawDoorsFresh();
    };
    window.drawWallLights=function drawWallLightsV141TransparentEnvironment(){drawTorchesFresh()};
    state.installed=true;
    document.body.dataset.environmentAtlasFix="true";
    return true;
  }

  source.addEventListener("load",()=>{normaliseAtlas();install()},{once:true});
  source.addEventListener("error",()=>{state.error=new Error("environment atlas failed to load")},{once:true});
  state.timer=setInterval(()=>{if(!state.ready&&source.complete&&source.naturalWidth)normaliseAtlas();if(install()){clearInterval(state.timer);state.timer=0}},90);
  window.addEventListener("pagehide",()=>{if(state.timer)clearInterval(state.timer)},{once:true});
  window.CCGLostSizzlerEnvironmentAtlasFix={get state(){return state},normaliseAtlas,install};
})();
