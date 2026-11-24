#!/usr/bin/env node
"use strict";

// Rendered C64 screen checks in GitHub runner Chromium (no external dependencies).
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "127.0.0.1", driverPort = 19751;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const screenshotDir = process.env.CCG_C64_RENDERED_SCREENSHOTS;
async function screenshot(id, name) {
  if (!screenshotDir) return;
  fs.mkdirSync(screenshotDir, {recursive:true});
  const png = await wd("GET", "/session/" + id + "/screenshot");
  fs.writeFileSync(path.join(screenshotDir, name + ".png"), Buffer.from(png, "base64"));
}
const mime = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".mjs":"text/javascript",
  ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png",
  ".webp":"image/webp", ".woff2":"font/woff2", ".ico":"image/x-icon" };

async function wd(method, url, data) {
  const res = await fetch("http://" + host + ":" + driverPort + url, {
    method, headers: data ? { "content-type":"application/json" } : {},
    body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(90000),
  });
  const raw = await res.text(), payload = raw ? JSON.parse(raw) : {};
  if (!res.ok || payload.value?.error) throw Error(raw.slice(0,1200));
  return payload.value;
}
async function evaluate(id, expression) {
  return wd("POST", "/session/"+id+"/execute/sync", { script:expression, args:[] });
}
async function emulate(id,width,height,touch) {
  await wd("POST", "/session/"+id+"/goog/cdp/execute", {
    cmd:"Emulation.setDeviceMetricsOverride",
    params: { width,height,deviceScaleFactor:1,mobile:touch,
      screenWidth:width,screenHeight:height,
      screenOrientation:{type:width>height?"landscapePrimary":"portraitPrimary",
        angle:width>height?90:0} },
  });
  await wd("POST", "/session/"+id+"/goog/cdp/execute", {
    cmd:"Emulation.setTouchEmulationEnabled", params:{enabled:touch,maxTouchPoints:5},
  });
  await sleep(250);
}

const measure = [
 'var e=s=>document.querySelector(s);',
 'var box=s=>{var r=e(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};',
 'var show=s=>{var v=e(s);return v && getComputedStyle(v).display!=="none" && v.getBoundingClientRect().height>1;};',
 'return { vw:document.documentElement.clientWidth, sw:document.documentElement.scrollWidth,',
 'layout:getComputedStyle(e(".ccg-c64-workspace")).display,',
 'touch:matchMedia("(pointer: coarse)").matches, stage:box(".ccg-c64-screen-stage"),',
 'bezel:box(".ccg-c64-screen-bezel"), console:box(".ccg-c64-console"),',
 'deck:box(".ccg-c64-control-stack"), vault:box(".ccg-c64-panel--vault"),', 
 'advanced:box(".ccg-c64-advanced"), joy:show(".ccg-c64-touch-controls"),',
 'keys:show(".ccg-c64-touch-fkeys"), libraryInConsole:e(".ccg-c64-panel--library").parentElement===e(".ccg-c64-console"),',
 'romTransfer:e("[data-rom-import]")!==null,',
 'font:parseFloat(getComputedStyle(e("#ccg-c64-library-search")).fontSize)};'
].join("\n");

const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,"http://local").pathname);
  // GitHub Pages strips repository tooling from its published artifact.
  if (/^\/(scripts|tests|docs)(\/|$)/.test(pathname)) {
    res.writeHead(404);
    res.end("not published");
    return;
  }
  let f = path.resolve(root,pathname.replace(/^\/+/,""));
  if (!f.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f=path.join(f,"index.html");
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) {
    res.writeHead(404);res.end("not found");return;
  }
  res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream",
    "Cache-Control":"no-store"});
  res.end(fs.readFileSync(f));
});
let child, session;
try {
  const driver=spawnSync("bash",["-lc","command -v chromedriver"],{encoding:"utf8"}).stdout.trim();
  assert(driver,"ChromeDriver not found");
  await new Promise((resolve,reject)=>{
    server.once("error",reject);server.listen(0,host,resolve);
  });
  const port=server.address().port;
  child=spawn(driver,["--port="+driverPort,"--allowed-ips="+host],{stdio:"ignore"});
  for(let i=0;i<80;i++){
    try{if((await fetch("http://"+host+":"+driverPort+"/status")).ok)break;}catch{}
    await sleep(100);
  }
  const created=await wd("POST","/session",{capabilities:{alwaysMatch:{
    browserName:"chrome",pageLoadStrategy:"eager",
    "goog:chromeOptions":{args:["--headless=new","--no-sandbox","--disable-gpu",
      "--disable-extensions","--disable-renderer-backgrounding",
      "--disable-dev-shm-usage","--no-first-run","--disable-background-networking"]}
  }}});
  session=created.sessionId;
  console.log("Chromium session established for mobile/desktop layout test.");
  assert(session,"ChromeDriver did not provide a session");
  await emulate(session,390,844,true);
  await wd("POST","/session/"+session+"/url",{url:"http://"+host+":"+port+"/emulator/c64/"});
  await sleep(1900);

  for(const [width,height,touch] of [[320,680,true],[360,780,true],[390,844,true],
    [760,900,true],[844,390,true],[959,900,false],[960,900,false],
    [1000,900,false],[1100,900,false],[1101,900,false],[1280,900,false],
    [1440,900,false],[1620,900,false],
    [960,900,true],[1000,900,true],[1100,900,true],[1000,600,true]]){
    await emulate(session,width,height,touch);
    const r=await evaluate(session,measure);
    assert(r.vw>0 && r.sw-r.vw<5,
      "C64 document horizontal overflow at "+width+"x"+height+": "+(r.sw-r.vw));
    // The later min-width:960 desktop rules used to undo max-width:1100's
    // block layout, squeezing the picture beside a fixed 500px control deck.
    if(width<=1100){
      assert.equal(r.layout,"block","Constrained workspace must stack at "+width);
      assert(r.deck.top>=r.console.bottom-2,
        "Controls must follow the console at "+width+"x"+height);
      assert(Math.abs(r.deck.left-r.console.left)<=2 &&
        Math.abs(r.deck.width-r.console.width)<=2,
        "Stacked console and controls must share the full row at "+width);
    }else{
      assert.equal(r.layout,"grid","Wide desktop must retain its grid at "+width);
      assert(r.deck.left>=r.console.right-2,"Desktop Omega columns changed");
    }
    if(touch){
      assert(r.libraryInConsole, "Mobile game library must sit directly below the C64 display");
      assert(r.touch && r.joy && r.keys && r.romTransfer,
        "Missing mobile joystick / extra keys / fullscreen button at "+width+"x"+height);
      assert(r.font>=16,"Search font would zoom iOS page at "+width+"x"+height);
      assert(r.bezel.width <= r.stage.width+3 &&
        r.bezel.height <= r.stage.height+3,
        "C64 game screen is clipped at "+width+"x"+height);
      assert(r.deck.top>=r.console.bottom-2,
        "Control panels must stack below mobile console at "+width+"x"+height);
    }else{
      assert(!r.libraryInConsole, "Desktop library must remain in its original control deck");
      assert(!r.joy&&!r.keys&&!r.libraryInConsole,"Desktop layout unexpectedly gained mobile buttons");
      // The former CSS grid-column:auto bug squeezed Game Vault to ~1/6
      // of this deck and stretched the page into a huge blank column.
      // Below 960px the existing three-column deck gives the vault two columns.
      const minimumVaultWidth = width>=960 ? r.deck.width : r.deck.width*0.65;
      assert(r.vault.width >= minimumVaultWidth - 6,
        "Save / Resume collapsed into a narrow desktop grid column at " +
        width + "x" + height + " (vault=" + r.vault.width + " deck=" + r.deck.width + ")");
      assert(Math.abs(r.vault.left - r.deck.left) <= 5,
        "Save / Resume must align with the left edge of the desktop control deck");
      assert(r.vault.height < 420,
        "Save / Resume text is vertically stretched at " + width + "x" + height);
      assert(r.advanced.top >= r.vault.bottom - 4,
        "Advanced media tools must follow the Save / Resume panel rather than overlap it");
    }
    console.log("PASS C64 viewport "+width+"x"+height+(touch?" touch":" desktop"));
  }

  for(const width of [960,1000,1100,1101,1440]){
    await emulate(session,width,900,false);
    await evaluate(session,'document.querySelector("[data-size-toggle]").click();return true;');
    await sleep(250);
    const expanded=await evaluate(session,measure);
    assert.equal(expanded.layout,"block","Expanded display must use its own row at "+width);
    assert(expanded.deck.top>=expanded.console.bottom-2,
      "Expanded display must remain above controls at "+width);
    assert(expanded.bezel.width<=expanded.stage.width+3 &&
      expanded.bezel.height<=expanded.stage.height+3,
      "Expanded display must fit its stage at "+width);
    await evaluate(session,'document.querySelector("[data-size-toggle]").click();return true;');
    await sleep(250);
    const normal=await evaluate(session,measure);
    assert.equal(normal.layout,width<=1100?"block":"grid",
      "Normal display must restore the responsive layout at "+width);
    console.log("PASS C64 expanded/normal display at "+width);
  }


  // Exercise the immersive layout rather than only the library. Geometry
  // is measured in real Chromium at small portrait and landscape viewports.
  for (const [width, height] of [[320, 680], [390, 844], [844, 390]]) {
    await emulate(session, width, height, true);
    const v = await evaluate(session, [
      'var e=s=>document.querySelector(s);',
      'var shell=e(".ccg-c64-console");shell.classList.add("is-mobile-playing");',
      'document.body.classList.add("is-mobile-playing");',
      'e("[data-mobile-playbar]").hidden=false;',
      'e("[data-mobile-game-actions]").hidden=false;',
      'e(".ccg-c64-touch-jump").hidden=false;',
      'var rect=s=>{var r=e(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};',
      'var control=rect("[data-mobile-game-actions]"), bar=rect("[data-mobile-playbar]"),',
      'screen=rect(".ccg-c64-screen-stage"), touch=rect(".ccg-c64-touch-controls"),',
      'opts=rect(".ccg-c64-touch-options"), body=rect(".ccg-c64-console");',
      'return {bar,control,screen,touch,opts,body,sw:document.documentElement.scrollWidth,',
      'vw:document.documentElement.clientWidth,',
      'pause:rect("[data-mobile-pause]"), save:rect("[data-mobile-save-state]"),',
      'load:rect("[data-mobile-load-state]"), jump:rect(".ccg-c64-touch-jump"),',
      'fire:rect(".ccg-c64-touch-fire"),crt:rect("[data-mobile-crt-mode]"),',
      'jumpToggle:document.querySelector("[data-jump-toggle]")!==null};',
    ].join("\n"));
    assert(v.sw-v.vw<5, "Immersive C64 horizontal overflow at "+width+"x"+height);
    assert(v.control.width > width * .80 && v.control.height >= 30,
      "Mobile pause/save/load row is missing at "+width+"x"+height);
    assert(v.pause.width >= 70 && v.save.width >= 70 && v.load.width >= 70,
      "Mobile save controls are too narrow at "+width+"x"+height);
    assert(v.jump.width >= 60 && v.fire.width >= 60,
      "FIRE and JUMP must both remain touch-sized");
    assert(v.crt.width >= 55 && !v.jumpToggle, "CRT must replace JUMP toggle");
    assert(v.control.top >= v.bar.bottom-3 && v.screen.top >= v.control.bottom-3,
      "Controls must appear above the game screen");
    assert(v.touch.top >= v.screen.bottom-3 && v.opts.top >= v.touch.bottom-3,
      "Touch controls and bottom selector must appear after game screen");
    assert(v.opts.bottom <= height+4 && v.screen.height >= 35,
      "Immersive game screen or bottom buttons fall outside mobile viewport");
    console.log("PASS C64 immersive mobile controls "+width+"x"+height);
    await evaluate(session, [
      'document.querySelector(".ccg-c64-console").classList.remove("is-mobile-playing");',
      'document.body.classList.remove("is-mobile-playing");',
      'document.querySelector("[data-mobile-playbar]").hidden=true;',
      'document.querySelector("[data-mobile-game-actions]").hidden=true;',
      'return true;'
    ].join("\n"));
  }
  await emulate(session,390,844,true);
  const drop=await evaluate(session,[
    'var l=document.querySelector(".ccg-c64-panel--library");l.hidden=false;',
    'var n=l.nextElementSibling,b=n.getBoundingClientRect().top;',
    'document.querySelector("[data-online-library-suggestions]").hidden=false;',
    'return {before:b,after:n.getBoundingClientRect().top,',
    'position:getComputedStyle(document.querySelector("[data-online-library-suggestions]")).position};',
  ].join("\n"));
  assert.equal(drop.position,"absolute");
  assert(Math.abs(drop.before-drop.after)<1,"Autocomplete pushed the mobile panels down");

  // Boot the SHA-pinned Sierra CRT through the real game-page launch path.
  await emulate(session, 1440, 900, false);
  const crossfireUrl = "http://" + host + ":" + port + "/emulator/c64/?game=archive-02121&autoplay=1";
  await wd("POST", "/session/"+session+"/url", {url:crossfireUrl + "&ccg_arena_preview=crossfire"});
  let framed;
  for (let attempt = 0; attempt < 100; attempt++) {
    framed = await evaluate(session, `
      const stage = document.querySelector('[data-ccg-arena-frame="crossfire"]');
      if (!stage || !getComputedStyle(stage).backgroundImage.includes("crossfire-original-frame.webp")) return null;
      const canvas = stage.querySelector("canvas").getBoundingClientRect();
      const frame = stage.getBoundingClientRect();
      return {
        ratio: canvas.width / canvas.height,
        left: (canvas.left - frame.left) / frame.width,
        right: (canvas.right - frame.left) / frame.width,
        top: (canvas.top - frame.top) / frame.height,
        bottom: (canvas.bottom - frame.top) / frame.height,
        board: Boolean(document.querySelector('[data-ccg-arena-preview="crossfire"]'))
      };
    `);
    if (framed) break;
    await sleep(250);
  }
  assert(framed?.board, "Verified Crossfire must start with its preview and artwork");
  await screenshot(session, "sierra-desktop");
  assert(Math.abs(framed.ratio - 4 / 3) < 0.01, "Crossfire artwork must frame a 4:3 canvas");
  assert(framed.left > .18 && framed.right < .82 && framed.top > .19 && framed.bottom < .86,
    "The gameplay canvas must fit in the artwork opening: " + JSON.stringify(framed));
  await evaluate(session, `
    document.querySelector('.ccg-arena-preview__modes button:last-child').click();
    return true;
  `);
  assert.equal(await evaluate(session, `
    return document.querySelector('.ccg-arena-preview__modes button:last-child').getAttribute('aria-pressed');
  `), "true", "The challenge board must be selectable during gameplay");
  // Old Crossfire PRG bookmarks now redirect to the verified Sierra CRT.
  // Without ANY special query parameter, that ordinary LOAD must auto-mount
  // the Arena, retaining the original artwork and empty (unranked) slots.
  await wd("POST", "/session/"+session+"/url", {url:crossfireUrl.replace("archive-02121", "blast-0448")});
  let automaticallyFramed = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    automaticallyFramed = await evaluate(session, `
      return document.querySelector('[data-online-library-status]')?.textContent === "GAME STARTED" &&
        document.querySelector('[data-ccg-arena-frame="crossfire"]') !== null &&
        document.querySelector('[data-ccg-arena-preview="crossfire"]') !== null;
    `);
    if (automaticallyFramed) break;
    await sleep(250);
  }
  assert(automaticallyFramed,
    "An ordinary verified Sierra CRT LOAD must automatically mount its Arena, without URL opt-in");
  const sierraScoresDisabled = await evaluate(session, `
    return document.querySelector('[data-ccg-arena-preview="crossfire"]')?.textContent.includes("SCORE SUBMISSIONS DISABLED");
  `);
  assert.equal(sierraScoresDisabled,true,
    "Unverified Sierra cartridge runs must never claim real score recording");

  // Launch the pinned cartridge on a coarse-pointer device. Exercise the
  // actual mobile controls and measure what paints, including rotated phones.
  await emulate(session, 390, 844, true);
  const sierraUrl = crossfireUrl.replace("archive-02121", "owner-crt-more-crossfiresierraonline-0c60e852f438") + "&start=1";
  await wd("POST", "/session/" + session + "/url", { url: sierraUrl });
  let mobileStarted = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    mobileStarted = await evaluate(session, `
      const console = document.querySelector(".ccg-c64-console.is-mobile-playing");
      const run = console?.querySelector('[data-local-run-phase="running"][data-one-click-phase="done"]');
      return Boolean(run?.querySelector(".ccg-arena-preview__run strong")?.textContent.match(/^\\d{6}$/)
        && console.querySelector("[data-mobile-joystick-swap]")?.textContent.includes("PORT 2")
        && getComputedStyle(console.querySelector(".ccg-c64-screen-stage")).backgroundImage === "none"
        && getComputedStyle(console.querySelector('[data-ccg-arena-preview="crossfire"]')).display === "none");
    `);
    if (mobileStarted) break;
    await sleep(250);
  }
  assert(mobileStarted, "One-click Sierra phone boot must retain local scoring and port 2 while hiding decorative artwork and score strip");

  const mobileArenaLayout = `
    const rect = el => el.getBoundingClientRect();
    const node = selector => document.querySelector(selector);
    const panel = node("[data-ccg-arena-preview]");
    const board = panel.querySelector(".ccg-arena-preview__board");
    const viewport = rect(node(".ccg-c64-console"));
    const bounds = rect(panel);
    const bezel = rect(node(".ccg-c64-screen-bezel"));
    const screen = rect(node(".ccg-c64-screen-stage"));
    const touch = rect(node(".ccg-c64-touch-controls"));
    // SCORE overlays the game and lower controls, but never the phone playbar.
    const protectedSelectors = ["[data-mobile-playbar]"];
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
      && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const fits = box => box.width > 0 && box.height > 0 && box.top >= viewport.top - 1
      && box.bottom <= viewport.bottom + 1 && box.left >= viewport.left - 1 && box.right <= viewport.right + 1;
    const toggle = node("[data-mobile-arena-toggle]");
    const blocked = ["[data-mobile-exit-game]", "[data-mobile-zoom-toggle]", "[data-mobile-arena-toggle]",
      "[data-mobile-keyboard-toggle]"].filter(selector => {
      const element = node(selector);
      const box = rect(element);
      return !element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
    });
    return {
      blocked,
      expanded: toggle.getAttribute("aria-expanded"),
      toggleText: toggle.textContent.trim(),
      jumpHidden: node(".ccg-c64-touch-jump:not(.ccg-c64-touch-start)").hidden,
      startVisible: !node(".ccg-c64-touch-start").hidden,
      startKey: node(".ccg-c64-touch-start").getAttribute("data-c64-fkey"),
      boardVisible: getComputedStyle(panel).display !== "none" && getComputedStyle(board).display !== "none",
      boardOnly: getComputedStyle(panel).display === "none" ||
        (getComputedStyle(panel.querySelector(".ccg-arena-preview__intro")).display === "none" &&
         getComputedStyle(panel.querySelector(".ccg-arena-preview__start")).display === "none" &&
         getComputedStyle(panel.querySelector(".ccg-arena-preview__run")).display === "none" &&
         getComputedStyle(panel.querySelector(".ccg-arena-preview__modes")).display !== "none"),
      artworkRemoved: getComputedStyle(node(".ccg-c64-screen-stage")).backgroundImage === "none",
      scoreStripVisible: panel.querySelector(".ccg-arena-preview__run").getClientRects().length > 0,
      panelFits: fits(bounds),
      gameSize: {width: bezel.width, height: bezel.height, stageHeight: screen.height},
      screenFits: bezel.top >= screen.top - 1 && bezel.bottom <= screen.bottom + 1 && fits(bezel) && bezel.width >= 48 && Math.abs(bezel.width / bezel.height - 4 / 3) < 0.03,
      controlsFit: [toggle, node(".ccg-c64-touch-fire"), node(".ccg-c64-touch-start")].every(el => fits(rect(el))),
      panelOverlaps: protectedSelectors.filter(selector => overlap(bounds, rect(node(selector)))),
      touchTop: touch.top,
      zoomed: node("[data-mobile-zoom-toggle]").getAttribute("aria-pressed")
    };
  `;
  for (const [width, height] of [[320,680], [360,780], [390,844], [680,320], [780,360], [844,390]]) {
    await emulate(session, width, height, true);
    const compact = await evaluate(session, mobileArenaLayout);
    for (const [open, zoom] of [[false,false], [true,false], [true,true], [false,true]]) {
      if (open !== (await evaluate(session, mobileArenaLayout)).boardVisible) {
        await evaluate(session, 'document.querySelector("[data-mobile-arena-toggle]").click();');
      }
      if (zoom !== ((await evaluate(session, mobileArenaLayout)).zoomed === "true")) {
        await evaluate(session, 'document.querySelector("[data-mobile-zoom-toggle]").click();');
      }
      const layout = await evaluate(session, mobileArenaLayout);
      const state = `${width}x${height} Arena=${open} Zoom=${zoom}: ${JSON.stringify(layout)}`;
      if (!zoom) await screenshot(session, `sierra-${width}x${height}-${open ? "leaderboard" : "gameplay-only"}`);
      assert.equal(layout.expanded, String(open), state);
      assert.equal(layout.zoomed, String(zoom), state);
      assert.equal(layout.boardVisible, open, state);
      assert.equal(layout.toggleText, open ? "CLOSE SCORE" : "SCORE", state);
      assert(layout.jumpHidden && layout.startVisible && layout.startKey === "F1",
        "Verified Sierra mobile must show F1 START instead of joystick JUMP: " + state);
      assert(layout.screenFits && layout.controlsFit, state);
      assert(!layout.scoreStripVisible && layout.boardOnly && layout.artworkRemoved, state);
      if (open) assert(layout.panelFits, state);
      assert.deepEqual(layout.panelOverlaps, [], state);
      assert.deepEqual(layout.blocked, [], state);
      assert(Math.abs(layout.touchTop - compact.touchTop) < 1, state);
    }
    await evaluate(session, 'document.querySelector("[data-mobile-zoom-toggle]").click();');
    console.log("PASS Sierra mobile Arena geometry " + width + "x" + height);
  }
  await emulate(session, 1440, 900, false);


  // Dropzone is a separate exact-ROM local-only Arena. On phones the original
  // game occupies the play area with NO decorative artwork or score strip.
  // SCORE must expose only a leaderboard, with no server submissions.
  const dropzoneUrl = "http://" + host + ":" + port +
    "/emulator/c64/?game=owner-crt-more-dropzone&autoplay=1";
  await emulate(session,390,844,true);
  await wd("POST", "/session/" + session + "/url", {url:dropzoneUrl});
  let dropzoneMounted=false;
  for(let attempt=0;attempt<100;attempt++){
    dropzoneMounted=await evaluate(session,`
      const game=document.querySelector('.ccg-c64-console.is-mobile-playing');
      const stage=game?.querySelector('[data-ccg-arena-frame="dropzone"]');
      const panel=game?.querySelector('[data-ccg-arena-preview="dropzone"]');
      const toggle=game?.querySelector('[data-mobile-arena-toggle]');
      return Boolean(stage&&panel&&toggle&&!toggle.hidden&&
        getComputedStyle(stage).backgroundImage==="none"&&
        getComputedStyle(panel).display==="none"&&
        game.querySelector('[data-mobile-joystick-swap]')?.textContent.includes("PORT 2"));
    `);
    if(dropzoneMounted)break;
    await sleep(250);
  }
  assert(dropzoneMounted,
    "Dropzone phone gameplay must have no decorative frame/score strip and retain port 2");
  const inspectDropzone=()=>evaluate(session,`
    const game=document.querySelector(".ccg-c64-console.is-mobile-playing");
    const panel=game.querySelector('[data-ccg-arena-preview="dropzone"]');
    const stage=game.querySelector('[data-ccg-arena-frame="dropzone"]');
    const show=e=>getComputedStyle(e).display!=="none"&&e.getClientRects().length>0;
    const view=show(panel);
    return {view,artwork:getComputedStyle(stage).backgroundImage,
      board:show(panel.querySelector(".ccg-arena-preview__board")),
      modes:show(panel.querySelector(".ccg-arena-preview__modes")),
      intro:show(panel.querySelector(".ccg-arena-preview__intro")),
      start:show(panel.querySelector(".ccg-arena-preview__start")),
      run:show(panel.querySelector(".ccg-arena-preview__run")),
      expanded:game.querySelector('[data-mobile-arena-toggle]').getAttribute("aria-expanded"),
      text:game.querySelector('[data-mobile-arena-toggle]').textContent.trim()};
  `);
  for(const [width,height] of [[390,844],[844,390]]){
    await emulate(session,width,height,true);
    const before=await inspectDropzone();
    assert.equal(before.view,false,"Dropzone must hide the score strip in phone gameplay");
    assert.equal(before.artwork,"none","Dropzone phone artwork must be absent");
    await evaluate(session,'document.querySelector("[data-mobile-arena-toggle]").click();');
    const open=await inspectDropzone();
    assert(open.view&&open.board&&open.modes&&!open.intro&&!open.start&&!open.run,
      "Dropzone SCORE must show ONLY the leaderboard: "+JSON.stringify(open));
    assert.equal(open.expanded,"true");
    assert.equal(open.text,"CLOSE SCORE");
    await screenshot(session,"dropzone-"+width+"x"+height+"-leaderboard");
    await evaluate(session,'document.querySelector("[data-mobile-arena-toggle]").click();');
    const closed=await inspectDropzone();
    assert.equal(closed.view,false,"Closing Dropzone SCORE must restore gameplay");
    assert.equal(closed.text,"SCORE");
  }
  await emulate(session,1440,900,false);
  await wd("POST","/session/"+session+"/url",{url:dropzoneUrl});
  let dropzoneDesktop=false;
  for(let attempt=0;attempt<100;attempt++){
    dropzoneDesktop=await evaluate(session,`
      const stage=document.querySelector('[data-ccg-arena-frame="dropzone"]');
      return Boolean(stage&&getComputedStyle(stage).backgroundImage.includes("dropzone/overlay.webp"));
    `);
    if(dropzoneDesktop)break;
    await sleep(250);
  }
  assert(dropzoneDesktop,"Dropzone desktop must retain the original framed artwork");
  console.log("PASS Dropzone phone leaderboard-only view and desktop artwork isolation");

  // Crossfire - Tron is a different PRG; keep its normal launch completely
  // separate, without a Sierra Arena panel, frame or any HelioHost score call.
  await wd("POST", "/session/"+session+"/url", {url:crossfireUrl.replace("archive-02121", "archive-02122")});
  let tronStarted = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    tronStarted = await evaluate(session, `
      return document.querySelector('[data-online-library-status]')?.textContent === "GAME STARTED";
    `);
    if (tronStarted) break;
    await sleep(250);
  }
  assert(tronStarted, "Crossfire - Tron must remain launchable");
  assert.equal(await evaluate(session, `
    return document.querySelector('[data-ccg-arena-frame], [data-ccg-arena-style], [data-ccg-arena-preview]') !== null;
  `), false, "Crossfire - Tron must never mount Sierra's high-score panel");
  console.log("PASS verified Sierra CRT automatic Arena, blank score state and Tron isolation");

  console.log("PASS C64 rendered mobile game library and desktop audit");
} finally {
  if(session)try{await wd("DELETE","/session/"+session);}catch{}
  if(child)child.kill("SIGTERM");
  if(server.listening)await new Promise(resolve=>server.close(resolve));
}
