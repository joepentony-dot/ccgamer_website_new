#!/usr/bin/env node
"use strict";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html=fs.readFileSync("emulator/c64/index.html","utf8");
const css=fs.readFileSync("resources/css/ccg-c64-emulator.css","utf8");
const app=fs.readFileSync("js/ccg-c64/app.js","utf8");
for(let n=1;n<=8;n++){
  assert(html.includes(`data-c64-touch-fkey="F${n}"`),`Phone button F${n} is missing`);
}
assert(html.includes("data-touch-function-keys"),"Function key menu missing");
assert(css.includes(".ccg-c64-touch-function-keys { display: none; }"),"Desktop must not acquire a touch keypad");
assert(css.includes(".ccg-c64-console:fullscreen .ccg-c64-touch-function-keys"),
  "Touch keypad must remain accessible in mobile fullscreen");
assert(css.includes("min-height: 44px"),"Phone keys must provide usable tap targets");
const start=app.indexOf('const touchFunctionKeys = document.querySelector("[data-touch-function-keys]");');
const end=app.indexOf("void refreshVaultStatus();",start);
assert(start>=0 && end>start, "Touch key handlers not installed in C64 runtime");

const events={};
const buttons=[];
for(let n=1;n<=8;n++){
  const handlers={};
  const element={
    dataset:{c64TouchFkey:`F${n}`},
    classList:{toggle(){}},
    addEventListener(name,handler){handlers[name]=handler;},
    setPointerCapture(){},
    handlers
  };
  buttons.push(element);
}
const details={open:true,handlers:{},addEventListener(name,handler){this.handlers[name]=handler;}};
const calls=[];
const context=vm.createContext({
  document:{
    querySelector(q){
      if(q==="[data-touch-function-keys]")return details;
      const match=q.match(/data-c64-touch-fkey="(F[1-8])"/);
      if(match)return buttons[Number(match[1].slice(1))-1];
      return null;
    },
    querySelectorAll(q){return q==="[data-c64-touch-fkey]"?buttons:[];}
  },
  window:{addEventListener(name,handler){events[name]=handler;},setTimeout(handler){handler();}},
  screen:{focus(){}},
  running:true,machine:{},
  handleC64Key(event,pressed){calls.push([event.code,pressed]);}
});
vm.runInContext(app.slice(start,end)+"\nglobalThis.activeTouchKeys=heldTouchFunctionKeys;",context);
const press={pointerId:1,preventDefault(){}};
buttons[2].handlers.pointerdown(press);
assert.equal(context.activeTouchKeys.size,1);
buttons[2].handlers.pointerup(press);
assert.equal(context.activeTouchKeys.size,0);
assert.deepEqual(calls.slice(-2),[["F3",true],["F3",false]],"F3 must remain held during touch");
buttons[7].handlers.pointerdown(press);
buttons[7].handlers.pointercancel(press);
assert.deepEqual(calls.slice(-2),[["F8",true],["F8",false]],"Cancelled F8 touch must release the key");
buttons[0].handlers.pointerdown(press);
details.open=false;
details.handlers.toggle();
assert.equal(context.activeTouchKeys.size,0,"Closing the function key menu must release all pressed keys");
buttons[4].handlers.pointerdown(press);
events.blur();
assert.equal(context.activeTouchKeys.size,0,"Backgrounding phone must not leave an F key held");
buttons[6].handlers.click({detail:0});
assert.deepEqual(calls.slice(-2),[["F7",true],["F7",false]],"Assistive click must emit a noticeable F7 pulse");
console.log("PASS: F1-F8 mobile buttons, touch hold/release, cancel, fullscreen layout and desktop isolation.");
