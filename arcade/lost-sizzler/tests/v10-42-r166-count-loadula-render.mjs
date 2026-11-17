import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";

const source=readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");

function renderer(){
  const calls=[];
  const methods=["save","restore","translate","beginPath","ellipse","fill","rotate","strokeRect","arc",
    "stroke","moveTo","lineTo","closePath","fillRect","fillText"];
  const ctx=new Proxy({
    ...Object.fromEntries(methods.map(method=>[method,(...args)=>calls.push([method,...args])])),
    measureText:text=>({width:text.length*7})
  },{
    set(target,key,value){
      calls.push([key,value]);
      return Reflect.set(target,key,value);
    }
  });
  const motion={matches:false};
  const stalker=Object.freeze({awake:true,x:2,y:3,vulnerableMs:300,health:75,maxHealth:100,hpBarMs:500});
  const host={stalker};
  let now=0,visible=true;
  const window={matchMedia(query){
    assert.equal(query,"(prefers-reduced-motion: reduce)");
    return motion;
  }};
  const sandbox=vm.createContext({
    window,document:{querySelector:()=>null,getElementById:()=>null},ctx,host,focus:{},
    visibleTo:()=>visible,view:{x:0,y:0},cam:{x:0,y:0},renderShake:{x:0,y:0},
    C:{tile:42,stalker:{name:"Count Loadula"}},
    P:{purple:"#b978ff",gold:"#ffd85a",red:"#ff6868",green:"#72ff9b"},
    performance:{now:()=>now}
  });
  vm.runInContext(source,sandbox,{filename:"game-render.js"});
  return {
    motion,quality:window.__CCG_DUNGEON_RENDER_PERFORMANCE__,stalker,
    frame(time,actor=stalker,inSight=true){
      now=time;
      visible=inSight;
      host.stalker=actor;
      calls.length=0;
      sandbox.drawStalker();
      assert.equal(calls.filter(([op])=>op==="save").length,calls.filter(([op])=>op==="restore").length);
      return calls.slice();
    }
  };
}

test("normal Count Loadula keeps bobbing, rotating and glowing",()=>{
  const r=renderer();
  const first=r.frame(0);
  const next=r.frame(520);
  for(const op of ["translate","rotate"]){
    assert.notDeepEqual(next.find(([name])=>name===op),first.find(([name])=>name===op));
  }
  assert.ok(first.some(([op,value])=>op==="shadowBlur"&&value===30));
  assert.ok(first.some(([op])=>op==="arc"));
});

test("reduced motion freezes the complete drawing and responds to preference changes live",()=>{
  const r=renderer();
  const reference=r.frame(0);
  r.motion.matches=true;
  assert.deepEqual(r.frame(520),reference);
  assert.deepEqual(r.frame(1300),reference);
  r.motion.matches=false;
  assert.notDeepEqual(r.frame(1300),reference);
});

test("severe quality removes decorative operations and keeps the vulnerable health cue",()=>{
  const r=renderer();
  const rich=r.frame(0);
  r.quality.quality="severe";
  const severe=r.frame(520);
  assert.deepEqual(r.frame(1300),severe);
  assert.ok(severe.length<rich.length);
  assert.ok(!severe.some(([op,value])=>op==="arc"||(op==="shadowBlur"&&value>0)));
  for(const expected of [
    ["strokeRect",-17,-17,34,34],
    ["fillText","COUNT LOADULA — VULNERABLE",105,120],
    ["fillText","75/100 HP",105,95]
  ]){
    assert.ok(severe.some(call=>JSON.stringify(call)===JSON.stringify(expected)));
  }
  assert.ok(severe.some(([op,value])=>op==="fillStyle"&&value==="#7e6432"),"crown remains");
  assert.ok(severe.some(([op,value])=>op==="fillStyle"&&value==="#09050c"),"cloak remains");
  r.motion.matches=true;
  assert.deepEqual(r.frame(1300),severe);
  r.quality.quality="rich";
  assert.deepEqual(r.frame(1300),rich);
});

test("visibility, ward state and health-bar timing remain authoritative in every mode",()=>{
  const r=renderer();
  for(const [quality,reduced] of [["rich",false],["rich",true],["severe",false]]){
    r.quality.quality=quality;
    r.motion.matches=reduced;
    assert.deepEqual(r.frame(520,r.stalker,false),[]);
    assert.deepEqual(r.frame(520,{...r.stalker,awake:false}),[]);
    const text=actor=>r.frame(520,Object.freeze(actor)).filter(([op])=>op==="fillText").map(([,value])=>value);
    assert.deepEqual(text({...r.stalker,vulnerableMs:0}),["COUNT LOADULA"]);
    assert.deepEqual(text({...r.stalker,vulnerableMs:0,v142WardBroken:true,hpBarMs:0}),["COUNT LOADULA — VULNERABLE"]);
    assert.deepEqual(text({...r.stalker,vulnerableMs:0,v142WardBroken:true,v142WardState:"defeated"}),["COUNT LOADULA"]);
  }
});
