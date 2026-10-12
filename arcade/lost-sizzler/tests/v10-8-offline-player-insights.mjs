import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const testDir=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(testDir,"../js/v10-8-player-insights.js"),"utf8");

async function bootPlayerInsights(standalone){
  let clock=0;
  let clientCalls=0;
  const invocations=[];
  const intervals=[];
  const elements=new Map(),events=new Map();
  const makeElement=()=>({
    innerHTML:"",
    textContent:"",
    classList:{add(){},remove(){},contains(){return false}},
    querySelector(){return null},
    querySelectorAll(){return []},
    addEventListener(){},
    appendChild(){}
  });
  const rail={
    querySelector(){return null},
    appendChild(node){elements.set(node.id,node)},
    insertBefore(node){elements.set(node.id,node)}
  };
  const document={
    readyState:"complete",
    body:{dataset:{runActive:"true"}},
    head:{appendChild(){}},
    getElementById(id){return elements.get(id)||null},
    querySelector(selector){
      if(selector==='meta[name="ccg-lost-sizzler-build"]')return{content:"V10.42 r119"};
      if(selector===".game-message-rail")return rail;
      return null;
    },
    createElement:makeElement,
    addEventListener(type,callback){events.set(type,callback)}
  };
  const window={
    CCGDungeonCarnageItchPackage:standalone,
    ccgSupabase:{
      async getClient(){
        clientCalls++;
        return{functions:{
          async invoke(name,{body}){
            invocations.push({name,action:body?.action});
            return{data:{success:true,authenticated:true,rated:false},error:null};
          }
        }};
      }
    },
    addEventListener(){},
    dispatchEvent(){}
  };
  const context={
    window,document,
    navigator:{userAgent:"Chrome/140",maxTouchPoints:0},
    screen:{width:1440,height:900},
    innerWidth:1440,innerHeight:900,
    matchMedia:()=>({matches:false}),
    performance:{now:()=>clock},
    crypto:{randomUUID:()=>"r133-local-test-token"},
    sessionStorage:{getItem(){return null},setItem(){}},
    location:{href:"http://127.0.0.1:47731/index.html"},
    MutationObserver:class{observe(){}disconnect(){}},
    setInterval(callback){intervals.push(callback);return intervals.length},
    clearInterval(){},
    setTimeout(){return 1},
    console
  };
  vm.runInNewContext(source,context,{filename:"v10-8-player-insights.js"});
  await new Promise(resolve=>setImmediate(resolve));
  return{
    window,elements,intervals,invocations,
    get clientCalls(){return clientCalls},
    async clickStart(){
      const callback=events.get("click");
      assert.equal(typeof callback,"function","Start click listener must remain installed");
      callback({target:{closest:()=>({id:"solo-btn"})}});
      await new Promise(resolve=>setImmediate(resolve));
    },
    async simulateSixMinutes(){
      for(let index=0;index<310;index++){
        clock+=1000;
        for(const tick of intervals)tick();
      }
      await new Promise(resolve=>setImmediate(resolve));
    }
  };
}

const offline=await bootPlayerInsights(true);
assert.equal(offline.window.CCGLostSizzlerPlayerInsights.state.ratingShown,false);
assert.equal(offline.elements.has("ccg-rating-panel"),false,
  "Standalone game must not mount a rating card that cannot save remotely");
assert.equal(offline.intervals.length,0,
  "Standalone play must not schedule five-minute rating checks");
assert.equal(await offline.window.CCGLostSizzlerPlayerInsights.showRating(),false,
  "Even an explicit rating request must be inert in the standalone game");
await offline.clickStart();
await offline.simulateSixMinutes();
assert.equal(offline.clientCalls,0,
  "Standalone game must not attempt Supabase feedback or rating-status requests");
assert.equal(offline.invocations.length,0);
assert.equal(offline.elements.has("ccg-rating-panel"),false);

const website=await bootPlayerInsights(false);
assert.equal(website.elements.has("ccg-rating-panel"),true,
  "Website must keep its original five-minute rating UI");
assert.equal(website.intervals.length,1,
  "Website must keep its existing five-minute rating scheduler");
await website.clickStart();
assert.ok(website.invocations.some(event=>event.action==="rating_status"),
  "Website must retain account-rating status lookup");
assert.ok(website.invocations.some(event=>event.action==="telemetry"),
  "Website must retain its existing Supabase start telemetry");
console.log("R133 standalone feedback: no impossible rating prompt/backend requests; website unchanged: PASS");
