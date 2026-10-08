"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {test}=require("node:test");
const {resolveGamePath,parseRange}=require("./path-guard.cjs");
const root=path.resolve("tmp","sample","game");
test("root index and packaged assets map inside the game root",()=>{
  assert.equal(resolveGamePath("/",root).file,path.join(root,"index.html"));
  assert.equal(resolveGamePath("/assets/audio/music/test.mp3",root).contentType,"audio/mpeg");
  assert.equal(resolveGamePath("/assets/audio/voice/recorded.ogg",root).contentType,"audio/ogg");
  assert.equal(resolveGamePath("/js/game-main.js",root).contentType,"text/javascript; charset=utf-8");
  assert.equal(resolveGamePath("/assets/audio/music/test.mp3?v=1",root),null);
});
test("path traversal, malformed and sensitive files are rejected",()=>{
  for(const bad of ["/../outside.js","/%2e%2e/outside.js","/a/%2e%2e/outside.js",
    "/.env","/assets/.hidden/secret.js","/assets/%5csecret.js",
    "/assets/bad%00name.js","/assets//oops.js","/assets/secret.pem",
    "/assets/no-extension","/%E0%A4%A"]){
    assert.equal(resolveGamePath(bad,root),null,bad);
  }
});
test("byte-range support for long voice sprites and original MP3s",()=>{
  assert.deepEqual(parseRange("bytes=0-1023",10000),{start:0,end:1023});
  assert.deepEqual(parseRange("bytes=400-",10000),{start:400,end:9999});
  assert.deepEqual(parseRange("bytes=-500",10000),{start:9500,end:9999});
  assert.deepEqual(parseRange("bytes=9000-999999",10000),{start:9000,end:9999});
  assert.equal(parseRange("bytes=10000-",10000),false);
  assert.equal(parseRange("bytes=0-2,3-6",10000),false);
  assert.equal(parseRange(null,10000),null);
});
test("desktop wrapper sandbox, no development console or remote game traffic",()=>{
  const launcher=fs.readFileSync(path.join(__dirname,"main.cjs"),"utf8");
  const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,"package.json"),"utf8"));
  assert.match(launcher,/nodeIntegration:false,contextIsolation:true,sandbox:true/);
  assert.match(launcher,/devTools:false/);
  assert.match(launcher,/127\.0\.0\.1/);
  assert.match(launcher,/webRequest\.onBeforeRequest/);
  assert.match(launcher,/parseRange\(req\.headers\.range,stat\.size\)/);
  assert.equal(pkg.build.asar,true);
  assert.deepEqual(pkg.build.win.target.map(t=>t.target),["nsis","portable"]);
  assert.ok(!pkg.build.files.some(x=>x.includes("node_modules")||x.includes("supabase")));
});
console.log("Windows release static and byte-range contracts passed.");
