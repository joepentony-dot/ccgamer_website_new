#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT=path.resolve(new URL("..",import.meta.url).pathname);
const SOURCE_ROOT=path.join(REPO_ROOT,"arcade","lost-sizzler");
const CANONICAL_GAME_URL="https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/";
const WEEKLY_URL=CANONICAL_GAME_URL+"#weekly-vault";
const INCLUDE_DIRS=["css","js","assets"];
const INCLUDE_FILES=["index.html","version.json"];
const EXTERNAL_FILES=[["games/games.json","games/games.json"]];
const FORBIDDEN_BASENAMES=new Set([".env","ccg-supabase-config.js","ccg-supabase-client.js","service-account.json","service_account.json"]);
const FORBIDDEN_SUFFIXES=[".pem",".key",".p12",".pfx"];

function fail(message){throw new Error(message)}
function sha256(buffer){return crypto.createHash("sha256").update(buffer).digest("hex")}
function toPosix(value){return value.split(path.sep).join("/")}
function safeRelative(value){
  if(!value||path.isAbsolute(value)||value.includes("\\")||value.split("/").some(part=>!part||part==="."||part===".."))return false;
  return path.posix.normalize(value)===value;
}
function assertAllowed(relative){
  if(!safeRelative(relative))fail("Unsafe package path: "+relative);
  const base=path.posix.basename(relative).toLowerCase();
  if(FORBIDDEN_BASENAMES.has(base)||base.startsWith(".env.")||FORBIDDEN_SUFFIXES.some(suffix=>base.endsWith(suffix))){
    fail("Forbidden credential/bootstrap material in itch package: "+relative);
  }
}
async function ordinaryFile(file,label){
  const stat=await fs.lstat(file);
  if(stat.isSymbolicLink()||!stat.isFile())fail(label+" must be a regular non-symlink file: "+file);
  return stat;
}
async function ordinaryDir(dir,label){
  const stat=await fs.lstat(dir);
  if(stat.isSymbolicLink()||!stat.isDirectory())fail(label+" must be a real non-symlink directory: "+dir);
  return stat;
}
async function copyTree(source,destination,relativeRoot,files){
  await ordinaryDir(source,"Source directory");
  await fs.mkdir(destination,{recursive:true});
  const entries=(await fs.readdir(source,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,"en"));
  for(const entry of entries){
    const from=path.join(source,entry.name);
    const to=path.join(destination,entry.name);
    const relative=toPosix(path.join(relativeRoot,entry.name));
    assertAllowed(relative);
    const stat=await fs.lstat(from);
    if(stat.isSymbolicLink())fail("Itch package refuses symbolic links: "+relative);
    if(stat.isDirectory())await copyTree(from,to,relative,files);
    else if(stat.isFile()){
      await fs.mkdir(path.dirname(to),{recursive:true});
      await fs.copyFile(from,to);
      files.push(relative);
    }else fail("Unsupported source entry: "+relative);
  }
}
function offlineRuntime(cacheToken){
  return [
    "(()=>{",
    "\"use strict\";",
    "const WEEKLY_URL="+JSON.stringify(WEEKLY_URL)+";",
    "const state={ready:true,signedIn:false,locked:false,weekStart:\"\",playerName:\"\",seed:\"\",attempt:null,leaderboard:[],ghost:null,itchPackage:true};",
    "function openWeekly(){try{const opened=window.open(WEEKLY_URL,\"_blank\",\"noopener,noreferrer\");if(opened)return true}catch(_){}try{window.location.href=WEEKLY_URL}catch(_){}return false}",
    "function render(){",
    "const button=document.getElementById(\"daily-btn\");if(button){button.disabled=false;button.textContent=\"Weekly Vault — CCG Website\";button.title=\"Weekly ranked play uses your CCG website account and opens in the browser.\"}",
    "const status=document.getElementById(\"weekly-status\");if(status)status.textContent=\"Weekly ranked play remains on the Cheeky Commodore Gamer website. This itch.io build keeps Solo, Tutorial and local 2P Split Screen self-contained.\";",
    "const actions=document.getElementById(\"weekly-auth-actions\");if(actions)actions.innerHTML='<a href=\"'+WEEKLY_URL+'\" target=\"_blank\" rel=\"noopener noreferrer\">Open Weekly Vault on CCG Website</a>';",
    "const board=document.getElementById(\"weekly-leaderboard\");if(board)board.innerHTML=\"<li><span>Online leaderboard data is available on the CCG website.</span></li>\";",
    "}",
    "document.addEventListener(\"click\",event=>{const button=event.target instanceof Element?event.target.closest(\"#daily-btn\"):null;if(!button)return;event.preventDefault();event.stopImmediatePropagation();openWeekly()},true);",
    "if(document.readyState===\"loading\")document.addEventListener(\"DOMContentLoaded\",render,{once:true});else render();",
    "window.addEventListener(\"ccg:v142-ready\",render);",
    "window.CCGWeeklyChallenge={get state(){return state},refresh:async()=>state,refreshGhost:async()=>null,claim:async()=>{openWeekly();throw new Error(\"Weekly Vault is available on the CCG website.\")},finish:async()=>null,render,renderCountdown:()=>false,renderLeaderboard:()=>false};",
    "window.CCGDungeonCarnageItchRelease=Object.freeze({mode:\"itch-html5\",cache:"+JSON.stringify(cacheToken)+",weeklyUrl:WEEKLY_URL,openWeekly,render});",
    "})();",
    ""
  ].join("\n");
}
function transformIndex(source,cacheToken){
  let html=source;
  html=html.replace(/^\s*<script src="\/js\/ccg-supabase-config\.js\?v=[^"]+"><\/script>\s*$/m,"");
  html=html.replace(/^\s*<script src="\/js\/ccg-supabase-client\.js\?v=[^"]+"><\/script>\s*$/m,"");
  html=html.replace(/^\s*<script src="js\/weekly-challenge\.js\?v=[^"]+"><\/script>\s*$/m,"");
  html=html.replace(/href="\/games\/ccg-games\/"/g,'href="https://www.cheekycommodoregamer.co.uk/games/ccg-games/" target="_blank" rel="noopener noreferrer"');
  html=html.replace(/<div id="weekly-auth-actions" class="weekly-auth-actions">[\s\S]*?<\/div>/,'<div id="weekly-auth-actions" class="weekly-auth-actions"><a href="'+WEEKLY_URL+'" target="_blank" rel="noopener noreferrer">Open Weekly Vault on CCG Website</a></div>');
  html=html.replace(/<p id="weekly-status" class="collection-summary">[\s\S]*?<\/p>/,'<p id="weekly-status" class="collection-summary">Weekly ranked play is available on the Cheeky Commodore Gamer website. Solo, Tutorial and local 2P Split Screen remain available in this itch.io build.</p>');
  html=html.replace(/<script src="js\/v10-41-load-watchdog\.js\?v=([^"]+)"><\/script>/,'<script src="js/v10-41-load-watchdog.js?v=$1"></script>\n<script src="js/itch-release-runtime.js?v='+cacheToken+'"></script>');
  if(!html.includes("js/itch-release-runtime.js"))fail("Could not inject itch release runtime");
  if(/src="\/js\/ccg-supabase-|js\/weekly-challenge\.js/.test(html))fail("Website account scripts remain in staged itch index");
  if(/(?:href|src)="\/(?!\/)/.test(html))fail("Root-relative URL remains in staged itch index");
  return html;
}
async function collectManifest(root,version,sourceSha){
  const files=[];
  async function walk(dir,relative){
    const entries=(await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,"en"));
    for(const entry of entries){
      if(entry.name==="release-manifest.json")continue;
      const abs=path.join(dir,entry.name);
      const rel=relative?relative+"/"+entry.name:entry.name;
      assertAllowed(rel);
      const stat=await fs.lstat(abs);
      if(stat.isSymbolicLink())fail("Staged package contains symlink: "+rel);
      if(stat.isDirectory())await walk(abs,rel);
      else if(stat.isFile()){
        const data=await fs.readFile(abs);
        files.push({path:rel,bytes:data.length,sha256:sha256(data)});
      }else fail("Unsupported staged package entry: "+rel);
    }
  }
  await walk(root,"");
  return{
    schema:"ccg-c64-dungeon-carnage-itch-package-v1",
    product:"C64 Dungeon Carnage",
    delivery:"itch-html5",
    sourceRevision:String(sourceSha||"working-tree"),
    releaseVersion:version.releaseVersion,
    build:version.build,
    cacheToken:version.cacheToken,
    canonicalGameUrl:CANONICAL_GAME_URL,
    websiteAccountFeatures:["Weekly High-Score Vault"],
    localModes:["Solo","Tutorial","2P Split Screen"],
    fileCount:files.length,
    totalBytes:files.reduce((sum,file)=>sum+file.bytes,0),
    files
  };
}
async function exists(file){try{await fs.access(file);return true}catch{return false}}
async function verify(output){
  const root=path.resolve(output);
  await ordinaryDir(root,"Itch package root");
  const manifest=JSON.parse(await fs.readFile(path.join(root,"release-manifest.json"),"utf8"));
  if(manifest.schema!=="ccg-c64-dungeon-carnage-itch-package-v1")fail("Unexpected itch package manifest schema");
  const version=JSON.parse(await fs.readFile(path.join(root,"version.json"),"utf8"));
  if(manifest.build!==version.build||manifest.cacheToken!==version.cacheToken||manifest.releaseVersion!==version.releaseVersion)fail("Manifest/version identity mismatch");

  const expected=new Map(manifest.files.map(file=>[file.path,file]));
  if(expected.size!==manifest.fileCount)fail("Manifest fileCount mismatch");
  let bytes=0;
  for(const [relative,entry] of expected){
    assertAllowed(relative);
    const file=path.join(root,...relative.split("/"));
    const stat=await ordinaryFile(file,"Manifest file");
    const data=await fs.readFile(file);
    if(stat.size!==entry.bytes||sha256(data)!==entry.sha256)fail("Manifest hash/size mismatch: "+relative);
    bytes+=stat.size;
  }
  if(bytes!==manifest.totalBytes)fail("Manifest totalBytes mismatch");

  const actual=[];
  async function walk(dir,relative){
    for(const entry of await fs.readdir(dir,{withFileTypes:true})){
      if(entry.name==="release-manifest.json")continue;
      const abs=path.join(dir,entry.name);
      const rel=relative?relative+"/"+entry.name:entry.name;
      const stat=await fs.lstat(abs);
      if(stat.isSymbolicLink())fail("Symlink found in itch package: "+rel);
      if(stat.isDirectory())await walk(abs,rel);
      else if(stat.isFile())actual.push(rel);
    }
  }
  await walk(root,"");
  actual.sort();
  const listed=[...expected.keys()].sort();
  if(JSON.stringify(actual)!==JSON.stringify(listed))fail("Package contains unmanifested or missing files");

  const html=await fs.readFile(path.join(root,"index.html"),"utf8");
  if(!html.includes('ccg-lost-sizzler-build" content="'+version.build+'"'))fail("Staged index build identity mismatch");
  if(!html.includes('ccg-lost-sizzler-cache" content="'+version.cacheToken+'"'))fail("Staged index cache identity mismatch");
  if(!html.includes("js/itch-release-runtime.js"))fail("Itch offline gate missing");
  if(/ccg-supabase-config|ccg-supabase-client|js\/weekly-challenge\.js/.test(html))fail("Website account bootstrap leaked into itch package");
  if(/(?:href|src)="\/(?!\/)/.test(html))fail("Root-relative URL remains in itch package");
  if(!html.includes(WEEKLY_URL))fail("Website Weekly Vault handoff missing");
  if(!html.includes("https://www.cheekycommodoregamer.co.uk/games/ccg-games/"))fail("Website exit handoff missing");
  if(await exists(path.join(root,"js","ccg-supabase-config.js"))||await exists(path.join(root,"js","ccg-supabase-client.js")))fail("Supabase website bootstrap must not be packaged");
  console.log("C64 Dungeon Carnage itch package verified: "+manifest.fileCount+" files, "+manifest.build);
}
async function build(output,sourceSha){
  const outputRoot=path.resolve(output);
  if(outputRoot===REPO_ROOT||outputRoot===SOURCE_ROOT||outputRoot===path.parse(outputRoot).root)fail("Unsafe itch output root: "+outputRoot);
  await fs.rm(outputRoot,{recursive:true,force:true});
  await fs.mkdir(outputRoot,{recursive:true});

  const copied=[];
  for(const name of INCLUDE_FILES){
    const from=path.join(SOURCE_ROOT,name);
    const to=path.join(outputRoot,name);
    assertAllowed(name);
    await ordinaryFile(from,"Source file");
    await fs.copyFile(from,to);
    copied.push(name);
  }
  for(const name of INCLUDE_DIRS)await copyTree(path.join(SOURCE_ROOT,name),path.join(outputRoot,name),name,copied);
  for(const [sourceRelative,packageRelative] of EXTERNAL_FILES){
    assertAllowed(packageRelative);
    const from=path.join(REPO_ROOT,...sourceRelative.split("/"));
    const to=path.join(outputRoot,...packageRelative.split("/"));
    await ordinaryFile(from,"External runtime file");
    await fs.mkdir(path.dirname(to),{recursive:true});
    await fs.copyFile(from,to);
    copied.push(packageRelative);
  }

  const version=JSON.parse(await fs.readFile(path.join(outputRoot,"version.json"),"utf8"));
  const indexPath=path.join(outputRoot,"index.html");
  const sourceIndex=await fs.readFile(indexPath,"utf8");
  await fs.writeFile(indexPath,transformIndex(sourceIndex,version.cacheToken),"utf8");
  await fs.writeFile(path.join(outputRoot,"js","itch-release-runtime.js"),offlineRuntime(version.cacheToken),"utf8");

  const manifest=await collectManifest(outputRoot,version,sourceSha);
  await fs.writeFile(path.join(outputRoot,"release-manifest.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
  await verify(outputRoot);
  console.log("C64 Dungeon Carnage itch package built: "+manifest.fileCount+" files, "+manifest.totalBytes+" bytes, "+manifest.build);
}
function parse(argv){
  const opts={};
  for(let i=2;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--output"||arg==="--verify"||arg==="--source-sha"){opts[arg.slice(2)]=argv[++i];continue}
    if(arg==="--help"||arg==="-h"){opts.help=true;continue}
    fail("Unknown argument: "+arg);
  }
  return opts;
}

try{
  const args=parse(process.argv);
  if(args.help){
    console.log("Usage: node scripts/build-c64-dungeon-carnage-itch-package.mjs --output <dir> [--source-sha <sha>] | --verify <dir>");
    process.exit(0);
  }
  if(args.output)await build(args.output,args["source-sha"]);
  else if(args.verify)await verify(args.verify);
  else fail("--output or --verify is required");
}catch(error){
  console.error("C64 Dungeon Carnage itch package failed: "+(error?.message||error));
  process.exitCode=1;
}
