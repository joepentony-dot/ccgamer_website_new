import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../js/v10-41-sanctuary-azalea.js",import.meta.url),"utf8");
const start=source.indexOf("  function drawRadarOverlay(p){");
const end=source.indexOf("  function wrapUpdateRuntime(){",start);
assert.ok(start>=0&&end>start,"The retained Sanctuary radar overlay owner must remain present");
const actual=source.slice(start,end);
const makeOwner=new Function("window","document","world","host",actual+";return drawRadarOverlay;");
const trace=[];
const ctx={save(){trace.push(["save"])},restore(){trace.push(["restore"])},translate(x,y){trace.push(["translate",x,y])},rotate(r){trace.push(["rotate",r])},fillRect(x,y,w,h){trace.push(["fillRect",x,y,w,h])},strokeRect(x,y,w,h){trace.push(["strokeRect",x,y,w,h])},moveTo(...v){trace.push(["moveTo",...v])},lineTo(...v){trace.push(["lineTo",...v])},beginPath(){trace.push(["beginPath"])},closePath(){trace.push(["closePath"])},fill(){trace.push(["fill"])},stroke(){trace.push(["stroke"])}};
const canvas={width:320,height:160,getContext:()=>ctx};
const document={getElementById:id=>id==="radar-canvas"?canvas:null};
const p={id:"P1",x:16,y:13};
const window={__CCG_RADAR_DIAGNOSTICS__:{
  canvasWidth:320,canvasHeight:160,mapWidth:160,mapHeight:120,scale:8,
  minX:10,minY:9,maxX:30,maxY:24,playerMarker:{worldX:16,worldY:13,shape:"square",count:1}
}};
const world={map:[[0]]},marker={x:13,y:12,active:true,kind:"exitSigil"},host={progressionRecoveryMarkers:[marker]};
const draw=makeOwner(window,document,world,host);
draw(p);
assert.equal(trace.filter(row=>row[0]==="fillRect").length,1,"One saved recovery marker may draw, never a second player marker");
assert.equal(trace.filter(row=>row[0]==="moveTo"||row[0]==="lineTo").length,0,"The old triangle path must never be drawn");
assert.deepEqual(trace.find(row=>row[0]==="translate"),["translate",108,88],"Recovery marker must use canonical room-aware map coordinates");
trace.length=0;
window.__CCG_RADAR_DIAGNOSTICS__.playerMarker.worldX=17;
draw(p);
assert.equal(trace.length,0,"Stale player coordinates must suppress the outdated overlay");
window.__CCG_RADAR_DIAGNOSTICS__.playerMarker.worldX=16;
canvas.width=319;draw(p);
assert.equal(trace.length,0,"Canvas resizes must suppress stale overlays");
canvas.width=320;host.progressionRecoveryMarkers=[];
draw(p);
assert.equal(trace.filter(row=>row[0]==="fillRect").length,0,"With no recovered quest markers, there must be no extra player glyph");
console.log("PASS R181 Sanctuary overlay: no duplicate cyan player triangle, exact canonical radar coordinates, stale geometry rejected");
