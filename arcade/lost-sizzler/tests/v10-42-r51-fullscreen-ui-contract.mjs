import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const html=read("index.html");
const main=read("js/game-main.js");
const landing=read("js/v10-41-landing-notification-polish.js");
const geometry=read("css/v10-41-r29.css");
const css=read("css/game.css");
const render=read("js/game-render.js");

assert.equal((html.match(/id="shop-close"/g)||[]).length,1,"Leave Shop control must remain singular");
assert.match(html,/class="shop-panel-head"[\s\S]*id="shop-close"[^>]*>Leave Shop</,"Leave Shop must be in the shop header");
assert.doesNotMatch(html,/class="shop-note"[\s\S]*id="shop-close"/,"Leave Shop must not remain below the long shop note");

assert.ok(main.includes('$("solo-btn").addEventListener("click",()=>{void requestPlayFullscreen();startSolo()})'),"Solo launch must request fullscreen from the click gesture");
assert.ok(main.includes('$("tutorial-zone-btn")?.addEventListener("click",()=>{void requestPlayFullscreen()},{capture:true})'),"Tutorial launch must request fullscreen from the click gesture");

assert.ok(landing.includes('const rail=document.querySelector(".game-message-rail"),pickup=document.getElementById("pickup-toast")'),"major notifications must resolve the message rail owner explicitly");
assert.ok(landing.includes("rail.insertBefore(panel,pickup)"),"major notifications must occupy the message rail before the ordinary pickup slot");
assert.match(geometry,/R51 FULLSCREEN MESSAGE RAIL/);
assert.ok(geometry.includes("grid-template-rows:minmax(0,1fr) 78px!important"),"fullscreen must reserve a fixed notice row beneath the canvas");
assert.ok(geometry.includes('.ccg-game:fullscreen>.game-area>.game-message-rail'),"fullscreen must own a message rail beneath the canvas");
assert.ok(geometry.includes("grid-row:2!important"),"message rail must sit below the play area");
assert.ok(geometry.includes(">#ccg-major-notification"),"major notification must be constrained to the rail");
assert.doesNotMatch(geometry,/R51 FULLSCREEN MESSAGE RAIL[\s\S]*#ccg-major-notification\{[^}]*top:12px/,"R51 fullscreen major notice must not overlay the playfield");

assert.match(css,/R51 SHOP HEADER EXIT/);
assert.match(css,/\.shop-panel-head\{[\s\S]*position:sticky/,"shop header must keep Leave Shop accessible while shop content scrolls");

assert.ok(render.includes("const preferred=1.2;"),"fullscreen preferred camera zoom must be the wider 1.2x view");
assert.ok(render.includes("const fit=Math.min(v.w/roomPixelW,v.h/roomPixelH,preferred);"),"fullscreen zoom must fit the current room before applying preferred zoom");
assert.ok(render.includes("roomPixelW<=v.w&&roomPixelH<=v.h"),"camera must centre a room that fits inside the fullscreen logical viewport");

console.log("PASS V10.42 R51 fullscreen shop, notification and room-fit layout contract");
