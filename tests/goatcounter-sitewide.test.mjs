import test from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import goatcounter from "../scripts/ensure-goatcounter-coverage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts/ensure-goatcounter-coverage.js");
const endpoint = "https://cheekycommodoregamer.goatcounter.com/count";
const source = "https://gc.zgo.at/count.js";

function page(body = "Hello") {
  return '<!doctype html><html><head><title>Test</title></head><body>' +
    body + "</body></html>";
}

function runScript(dir, check = false) {
  return spawnSync(process.execPath, [
    script, "--root", dir, ...(check ? ["--check"] : [])
  ], { encoding: "utf8" });
}

test("adds tracking to untracked root, game, music and admin pages, with route-only paths", (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-goatcounter-"));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  const routes = ["index.html", "games/chuckie-egg/index.html",
    "games/index.html", "music/index.html", "admin/content-publisher.html"];
  for (const route of routes) {
    const file = path.join(site, route);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, page(route));
  }
  const first = runScript(site);
  assert.equal(first.status, 0, first.stderr);
  for (const route of routes) {
    const html = fs.readFileSync(path.join(site, route), "utf8");
    assert.equal((html.match(/data-goatcounter=/g) || []).length, 1, route);
    assert.ok(html.includes(endpoint), route);
    assert.ok(html.includes(source), route);
    const canonical = goatcounter.publicPath(site, path.join(site, route));
    assert.ok(html.includes(JSON.stringify({ path: canonical })), route);
    assert.equal((html.match(/src="\/js\/ccg-visitor-metrics\.js"/g) || []).length, 1, route);
  }
  assert.equal(runScript(site, true).status, 0);
  assert.equal(runScript(site).status, 0, "idempotent second application");
});

test("preserves existing approved tracker instead of adding a duplicate", () => {
  const existing = '<script\n data-goatcounter="' + endpoint +
    '"\n async src="' + source + '"></script>';
  const html = page("Main" + existing);
  const result = goatcounter.evaluateHtml(html, "/home.html");
  assert.equal(result.status, "present");
  assert.equal(result.html, html);
});

test("removes duplicate approved script tags but no other scripts", () => {
  const existing = '<script data-goatcounter="' + endpoint +
    '" async src="' + source + '"></script>';
  const html = page('<script src="/js/ccg-global.js"></script>' + existing + existing);
  const result = goatcounter.evaluateHtml(html, "/home.html");
  assert.equal(result.status, "deduplicated");
  assert.equal((result.html.match(/data-goatcounter=/g) || []).length, 1);
  assert.ok(result.html.includes("/js/ccg-global.js"));
  assert.equal(goatcounter.evaluateHtml(result.html, "/home.html").status, "present");
});

test("rejects unrecognised GoatCounter endpoints rather than silently overwriting them", () => {
  const html = page('<script data-goatcounter="https://wrong.example/count" async src="' +
    source + '"></script>');
  assert.throws(() => goatcounter.evaluateHtml(html, "/home.html"), /Unexpected GoatCounter/);
});

test("can stage scripts in head-only HTML and ignores HTML fragments", () => {
  const html = '<html><head><title>Small</title></head></html>';
  const result = goatcounter.evaluateHtml(html, "/small.html");
  assert.equal(result.status, "added");
  assert.ok(result.html.indexOf(source) < result.html.indexOf("</head>"));
  assert.equal(goatcounter.evaluateHtml("<p>fragment</p>", "/frag.html").status, "fragment");
});

test("check mode fails closed when a generated public page has no tracker", (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-goatcounter-"));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  fs.writeFileSync(path.join(site, "home.html"), page());
  const result = runScript(site, true);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing\/duplicate tracking/);
  assert.equal(fs.readFileSync(path.join(site, "home.html"), "utf8"), page());
});

test("admin game publication and GitHub Pages deployment enforce GoatCounter", () => {
  const template = fs.readFileSync(path.join(root, "games/game.html"), "utf8");
  const deploy = fs.readFileSync(path.join(root,
    ".github/workflows/deploy-github-pages-omega-stable.yml"), "utf8");
  const publishing = fs.readFileSync(path.join(root,
    ".github/workflows/games-publishing.yml"), "utf8");
  assert.ok(template.includes(endpoint), "new game template retains tracker");
  assert.ok(template.includes(source), "new game template retains count.js");
  assert.match(deploy, /ensure-goatcounter-coverage\.js --root _site/);
  assert.match(deploy, /ensure-goatcounter-coverage\.js --root _site --check/);
  assert.match(publishing, /tests\/goatcounter-sitewide\.test\.mjs/);
});


test("sitewide metrics runtime is injected once and never alters page SEO", () => {
  const body = '<title>Test</title><link rel="canonical" href="https://www.cheekycommodoregamer.co.uk/games/chuckie-egg/">';
  const html = '<!doctype html><html><head>' + body + '</head><body><main>Review</main></body></html>';
  const once = goatcounter.ensureMetricsRuntime(html, "/games/chuckie-egg/");
  assert.equal((once.match(/src="\/js\/ccg-visitor-metrics\.js"/g) || []).length, 1);
  assert.equal(goatcounter.ensureMetricsRuntime(once, "/games/chuckie-egg/"), once);
  assert.ok(once.includes(body));
  assert.ok(once.includes("<main>Review</main>"));
});

test("public counter runtime counts one shared session event and each canonical game separately", () => {
  const runtime = fs.readFileSync(path.join(root, "js/ccg-visitor-metrics.js"), "utf8");
  const global = fs.readFileSync(path.join(root, "js/ccg-global.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "resources/css/game-pages.css"), "utf8");

  assert.match(runtime, /SESSION_EVENT\s*=\s*"ccg-archive-session"/);
  assert.match(runtime, /event:\s*true/);
  assert.match(runtime, /SESSION_WINDOW_MS = 60 \* 60 \* 1000/);
  assert.match(runtime, /window\.localStorage\.setItem\(SESSION_KEY/);
  assert.match(runtime, /no_session:\s*true/);
  assert.doesNotMatch(runtime, /Bearer|api\/v0/);
  assert.match(runtime, /document\.documentElement\.getAttribute\("data-ccg-page"\) !== "single-game"/);
  assert.match(runtime, /result\.count/);
  assert.match(runtime, /encodeURIComponent\(path\)\s*\+\s*"\.json"/);
  assert.match(runtime, /fetchPublicCount\(SESSION_EVENT,\s*homeCount\)/);
  assert.match(runtime, /fetchPublicCount\(path,\s*count\)/);
  assert.match(runtime, /footer\.appendChild\(badge\)/);
  assert.doesNotMatch(global, /GOATCOUNTER_API_TOKEN|api\/v0\/stats\/total|Authorization:/);
  assert.match(home, /id="ccg-visit-count"/);
  assert.match(runtime, /homeLabel\.textContent = "Archive visits"/);
  assert.match(css, /\.ccg-page--single-game \.ccg-footer--game > \.ccg-game-views/);
});


test("canonical game pages count each load regardless of global session deduplication", (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "ccg-raw-game-"));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  const game = path.join(site, "games/chuckie-egg/index.html");
  const home = path.join(site, "home.html");
  fs.mkdirSync(path.dirname(game), { recursive: true });
  const approved = '<script data-goatcounter="' + endpoint + '" async src="' + source + '"></script>';
  fs.writeFileSync(game, '<!doctype html><html data-ccg-page="single-game"><head><title>Chuckie Egg</title></head><body><p>Review</p>' + approved + "</body></html>");
  fs.writeFileSync(home, page(approved));

  assert.equal(runScript(site).status, 0);
  const gameOutput = fs.readFileSync(game, "utf8");
  const homeOutput = fs.readFileSync(home, "utf8");
  assert.match(gameOutput, /data-goatcounter-settings='{"path":"\/games\/chuckie-egg\/","no_session":true}'/);
  assert.doesNotMatch(homeOutput, /no_session/);
  assert.match(gameOutput, /<p>Review<\/p>/);
  assert.equal((gameOutput.match(/data-goatcounter=/g) || []).length, 1);
  assert.equal(runScript(site, true).status, 0);
  assert.equal(runScript(site).status, 0);
  assert.equal(fs.readFileSync(game, "utf8"), gameOutput);
  assert.equal(fs.readFileSync(home, "utf8"), homeOutput);
});

test("game overrides preserve approved path settings and reject incorrect canonical paths", () => {
  const tag = '<script data-goatcounter="' + endpoint +
    '" data-goatcounter-settings=' + "'" + '{"path":"/games/chuckie-egg/"}' + "'" +
    ' async src="' + source + '"></script>';
  const html = '<html data-ccg-page="single-game"><body>' + tag + "</body></html>";
  const modified = goatcounter.enforceGameRawViews(html, "/games/chuckie-egg/");
  assert.match(modified, /no_session":true/);
  assert.equal(goatcounter.enforceGameRawViews(modified, "/games/chuckie-egg/"), modified);
  assert.throws(() => goatcounter.enforceGameRawViews(html, "/games/other/"), /Mismatched canonical/);
  const genreHtml = html.replace('data-ccg-page="single-game"', 'data-ccg-page="genre"');
  assert.equal(goatcounter.enforceGameRawViews(genreHtml, "/games/genres/"), genreHtml);
});

test("hourly archive event is once per browser per rolling hour across pages", () => {
  const sourceCode = fs.readFileSync(path.join(root, "js/ccg-visitor-metrics.js"), "utf8");
  const storage = new Map();
  const hits = [];
  let now = 1_000_000_000;
  function visit(route) {
    const window = {
      location: { pathname: route },
      localStorage: {
        getItem(key) { return storage.get(key) ?? null; },
        setItem(key, value) { storage.set(key, value); }
      },
      goatcounter: { count(event) { hits.push(event); } },
      setInterval(callback) { this._tick = callback; return 1; },
      clearInterval() {}
    };
    const document = {
      readyState: "complete",
      documentElement: { getAttribute() { return null; } },
      querySelector() { return null; },
      getElementById() { return null; }
    };
    vm.runInNewContext(sourceCode, {
      window, document, Date: { now() { return now; } }, URL,
      location: { origin: "https://www.cheekycommodoregamer.co.uk" }
    });
    window._tick();
  }
  visit("/home.html");
  now += 30 * 60 * 1000;
  visit("/games/chuckie-egg/");
  now += 29 * 60 * 1000;
  visit("/games/bruce-lee/");
  assert.equal(hits.length, 1);
  now += 60 * 1000;
  visit("/music/");
  assert.equal(hits.length, 2);
  for (const hit of hits) {
    assert.equal(hit.path, "ccg-archive-session");
    assert.equal(hit.event, true);
    assert.equal(hit.no_session, true);
  }
});


test("shared-loader on branch-published HTML recovers visible counters", () => {
  const shared = fs.readFileSync(path.join(root, "js/ccg-global.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home.html"), "utf8");
  const game = fs.readFileSync(path.join(root, "games/chuckie-egg/index.html"), "utf8");
  assert.ok(home.includes('src="js/ccg-global.js"'), "home loads the shared fallback");
  assert.ok(game.includes('src="/js/ccg-global.js"'), "canonical game loads the shared fallback");
  assert.match(shared, /function ccgEnsureVisitorMetrics/);
  const idx = shared.lastIndexOf("(function ccgEnsureVisitorMetrics()");
  assert.ok(idx > 0);

  function loadedOn(pathname, presentTrackerTag) {
    const inserted = [];
    const document = {
      documentElement: { getAttribute() { return null; } },
      querySelector(selector) {
        return selector === 'script[data-ccg-visitor-metrics]' && presentTrackerTag ? {} : null;
      },
      createElement(name) {
        assert.equal(name, "script");
        return { setAttribute() {} };
      },
      head: { appendChild(node) { inserted.push(node); } }
    };
    vm.runInNewContext(shared.slice(idx), { document, window: { location: { pathname } } });
    return inserted;
  }

  for (const pathname of ["/home.html", "/games/chuckie-egg/", "/games/bruce-lee/"]) {
    const result = loadedOn(pathname, false);
    assert.equal(result.length, 1, pathname + ": one shared metrics script");
    assert.match(result[0].src, /\/js\/ccg-visitor-metrics\.js\?v=/);
  }
  assert.equal(loadedOn("/home.html", true).length, 0, "staged script not duplicated");
  assert.equal(loadedOn("/admin/content-publisher.html", false).length, 0, "admin bypassed");
});


test("every committed canonical game page inherits the shared display loader", () => {
  const gamesDir = path.join(root, "games");
  const pages = [];
  for (const item of fs.readdirSync(gamesDir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const index = path.join(gamesDir, item.name, "index.html");
    if (!fs.existsSync(index)) continue;
    const html = fs.readFileSync(index, "utf8");
    if (!/<html\b[^>]*\bdata-ccg-page\s*=\s*(["'])single-game\1/i.test(html)) continue;
    pages.push(index);
    assert.match(html, /<script\s+src="(?:\/|\.\.\/)js\/ccg-global\.js"/i,
      "Missing shared counter loader on " + path.relative(root, index));
    assert.match(html, /<footer\b[^>]*class="[^"]*\bccg-footer--game\b/i,
      "Missing footer for view count on " + path.relative(root, index));
    assert.match(html, /<link rel="canonical"\b|<link rel="canonical"/i,
      "Missing canonical for view count on " + path.relative(root, index));
  }
  assert.ok(pages.length >= 600, "Expected entire 666-game CCG archive to be covered");
});


test("export recovery preserves archived totals and legacy game links without duplicate counted hits", async () => {
  const source = fs.readFileSync(path.join(root, "js/ccg-visitor-metrics.js"), "utf8");
  assert.match(source, /HISTORICAL_HOME_HITS = 2361/);
  assert.match(source, /HISTORICAL_ARCHIVE_EVENTS = 1/);
  assert.match(source, /"master-of-magic":80/);
  assert.match(source, /"ninja-rabbits":73/);
  assert.match(source, /"ace-of-aces":14/);
  assert.match(source, /Math\.max\(oldSnapshot, now\) \+ querySnapshot/);
  assert.doesNotMatch(source, /newLive|Promise\.allSettled/);
  assert.match(source, /ensureGoatCounterTracker\(\)/);

  function render(pathname, counters, fail = false) {
    const home = {textContent:"—",attrs:{},
      setAttribute(k,v) {this.attrs[k]=v;}};
    let footer, gameCounter;
    const scripts=[];
    const document={
      readyState:"complete",
      documentElement:{getAttribute(k){return k==="data-ccg-page"?
        (pathname.startsWith("/games/")?"single-game":"home"):null;}},
      head:{appendChild(script){scripts.push(script);}},
      querySelector(selector) {
        if(selector.startsWith('link[rel="canonical"]'))return {
          href:"https://www.cheekycommodoregamer.co.uk"+pathname};
        if(selector===".ccg-footer-home__status")return {textContent:"",title:""};
        if(selector===".ccg-footer--game")return footer;
        return null;
      },
      createElement() {
        return {children:[],attrs:{},textContent:"",
          appendChild(node){this.children.push(node);},
          setAttribute(k,v){this.attrs[k]=v;}};
      },
      getElementById(id) {
        if(id==="ccg-visit-count"&&!pathname.startsWith("/games/"))return home;
        if(id==="ccg-game-view-count")return gameCounter||null;
        return null;
      }
    };
    footer={appendChild(badge){gameCounter=badge.children[1];}};
    const window={
      location:{pathname},
      fetch(url) {
        if(fail)return Promise.reject(new Error("blocked"));
        const requested=decodeURIComponent(url.split("/counter/")[1].replace(/\.json$/,""));
        if(!(requested in counters))return Promise.resolve({status:404,ok:false});
        return Promise.resolve({status:200,ok:true,json:async()=>({count:String(counters[requested])})});
      },
      setInterval(){return 1;},clearInterval(){}
    };
    vm.runInNewContext(source,{window,document,URL,location:{
      origin:"https://www.cheekycommodoregamer.co.uk"}});
    return {counter:gameCounter||home,scripts};
  }
  const homepage=render("/home.html",{"ccg-archive-session":7});
  const master=render("/games/master-of-magic/",{"/games/master-of-magic":83});
  const ace=render("/games/ace-of-aces/",{"/games/ace-of-aces":48});
  const blocked=render("/games/ninja-rabbits/",{},true);
  const newGame=render("/games/smash-t-v/",{"/games/smash-t-v":4});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(homepage.counter.textContent,"2,367");
  assert.equal(master.counter.textContent,"83");
  assert.equal(ace.counter.textContent,"62"); // 48 direct + 14 distinct legacy URLs
  assert.equal(blocked.counter.textContent,"73");
  assert.equal(newGame.counter.textContent,"4");
  for(const result of [homepage,master,ace,blocked,newGame]){
    assert.equal(result.counter.attrs["data-ccg-counter-loaded"],"true");
    assert.equal(result.scripts.length,1,"One recovered GoatCounter tracker per page");
  }
  assert.match(master.scripts[0].attrs["data-goatcounter-settings"],/"no_session":true/);
  assert.doesNotMatch(homepage.scripts[0].attrs["data-goatcounter-settings"],/"no_session"/);
});
