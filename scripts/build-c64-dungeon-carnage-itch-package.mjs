#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REPO_ROOT=path.resolve(new URL("..",import.meta.url).pathname);
const SOURCE_ROOT=path.join(REPO_ROOT,"arcade","lost-sizzler");
const CANONICAL_GAME_URL="https://www.cheekycommodoregamer.co.uk/arcade/c64-dungeon-carnage/";
const INCLUDE_DIRS=["css","js","assets"];
const INCLUDE_FILES=["index.html","version.json"];
const EXTERNAL_FILES=[["games/games.json","games/games.json"],["resources/images/hero/c64-dungeon-carnage-home-v2.webp","assets/c64-dungeon-carnage-loader.webp"]];
const FORBIDDEN_BASENAMES=new Set([".env","ccg-supabase-config.js","ccg-supabase-client.js","service-account.json","service_account.json"]);
const FORBIDDEN_SUFFIXES=[".pem",".key",".p12",".pfx"];

function fail(message){throw new Error(message)}
function sha256(buffer){return crypto.createHash("sha256").update(buffer).digest("hex")}
function sameOrWithin(parent,child){
  const relative=path.relative(parent,child);
  return relative===""||(!relative.startsWith(".."+path.sep)&&relative!==".."&&!path.isAbsolute(relative));
}
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

/**
 * Asset variants not wired into the live game are retained in the source
 * repository for licensed development and testing, but must not be copied
 * into downloadable itch.io releases. This is particularly important for
 * creator-licensed packs that prohibit distributing standalone assets.
 *
 * The source and staged package carry the same asset-manifest catalogue.
 * Read the catalogue instead of maintaining a second hard-coded file list.
 */
function r118PackageSelection(catalogue){
  const art=catalogue?.images?.visualOverhaul||{};
  const cc0=art.r118LicensedCC0||null;
  const commercial=art.r118FreeCommercial||null;
  const sourceOnly=new Set(),requiredActive=new Set();
  const prefix="assets/pixel/user-r118/";
  const check=relative=>{
    if(typeof relative!=="string"||!safeRelative(relative)||!relative.startsWith(prefix)||!relative.endsWith(".png")){
      fail("Unsafe R118 package artwork path: "+String(relative));
    }
    return relative;
  };
  for(const group of [cc0,commercial]){
    if(!group)continue;
    if(!Array.isArray(group.stagedNotWired))fail("R118 staged artwork catalogue must be an array");
    for(const relative of group.stagedNotWired){
      const path=check(relative);
      if(sourceOnly.has(path))fail("Duplicate staged artwork across licence groups: "+path);
      sourceOnly.add(path);
    }
  }
  if(cc0){
    if(cc0.license!=="CC0-1.0")fail("R118 CC0 source catalogue lost its license");
    for(const relative of cc0.activeWallTorchFrames||[])requiredActive.add(check(relative));
    for(const name of ["activeKeyCandidate","activeCrateSprite","activeBarrelSprite","activePillarSprite"]){
      if(cc0[name])requiredActive.add(check(cc0[name]));
    }
  }
  if(commercial){
    if(!String(commercial.license||"").toLowerCase().includes("commercial"))fail("R118 free-commercial artwork licence missing");
    for(const relative of commercial.activeCreditCoinFrames||[])requiredActive.add(check(relative));
  }
  for(const path of requiredActive){
    if(sourceOnly.has(path))fail("R118 release would exclude a required runtime sprite: "+path);
  }
  return {sourceOnly,requiredActive};
}

async function copyTree(source,destination,relativeRoot,files,sourceOnly=new Set()){
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
    if(sourceOnly.has(relative)){
      if(!stat.isFile())fail("Staged R118 artwork must be an ordinary file: "+relative);
      continue;
    }
    if(stat.isDirectory())await copyTree(from,to,relative,files,sourceOnly);
    else if(stat.isFile()){
      await fs.mkdir(path.dirname(to),{recursive:true});
      await fs.copyFile(from,to);
      files.push(relative);
    }else fail("Unsupported source entry: "+relative);
  }
}
async function disableStagedOverrideUrls(root,sourceOnly){
  if(!sourceOnly.size)return;
  const file=path.join(root,"js","asset-overrides.js");
  let contents=await fs.readFile(file,"utf8"),replaced=0;
  for(const relative of sourceOnly){
    // Only replace exact, manifest-listed sprite value literals. Never touch
    // other owner overrides, licence text or the source-repository file.
    const literal=":"+JSON.stringify(relative);
    if(contents.includes(literal)){
      contents=contents.split(literal).join(":null");
      replaced++;
    }
    if(contents.includes(JSON.stringify(relative))){
      fail("Staged R118 asset path remains in packaged owner overrides: "+relative);
    }
  }
  await fs.writeFile(file,contents,"utf8");
  console.log("R118 package disabled "+replaced+" staged-only owner override URLs");
}

function offlineRuntime(cacheToken){
  return [
    "(()=>{",
    "\"use strict\";",
    "const retiredState=Object.freeze({ready:true,signedIn:false,locked:true,weekStart:\"\",playerName:\"\",seed:\"\",attempt:null,leaderboard:[],ghost:null,itchPackage:true,retired:true});",
    "window.CCGWeeklyChallenge={get state(){return retiredState},refresh:async()=>retiredState,refreshGhost:async()=>null,claim:async()=>{throw new Error(\"Retired feature\")},finish:async()=>null,render:()=>false,renderCountdown:()=>false,renderLeaderboard:()=>false};",
    "window.CCGDungeonCarnageItchRelease=Object.freeze({mode:\"itch-html5\",cache:"+JSON.stringify(cacheToken)+",supportedModes:Object.freeze([\"Solo\",\"Tutorial\"])});",
    "})();",
    ""
  ].join("\n");
}
function packageDemoPaywallRuntime(){
  return [
    "(()=>{",
    "\"use strict\";",
    "if(window.__CCG_LOST_SIZZLER_V142_DEMO_PAYWALL__)return;",
    "window.__CCG_LOST_SIZZLER_V142_DEMO_PAYWALL__=true;",
    "const state={itchPackage:true,demoMode:false,commerce:false};",
    "function showPaywall(){return false}",
    "function closePaywall(){return false}",
    "async function refreshEntitlement(){return false}",
    "function diagnostics(){return {...state}}",
    "window.CCGLostSizzlerV142DemoPaywall=Object.freeze({productSlug:\"c64-dungeon-carnage\",demoMode:false,showPaywall,closePaywall,refreshEntitlement,diagnostics});",
    "})();",
    ""
  ].join("\n");
}
function transformIndex(source,cacheToken){
  let html=source;
  html=html.replace("<head>","<head>\n<script>window.CCGDungeonCarnageItchPackage=true;</script>");
  // The website keeps Dungeon runtime scripts inert until server-validated access.
  // The paid itch package is a self-contained authorised distribution, so restore
  // those placeholders to ordinary script tags before applying offline transforms.
  html=html
    .split('<script type="application/ccg-protected-runtime" data-ccg-protected-runtime')
    .join('<script');
  html=html.replace(/^\s*<script src="\/js\/ccg-supabase-config\.js(?:\?v=[^"]+)?"><\/script>\s*$/m,"");
  html=html.replace(/^\s*<script src="\/js\/ccg-supabase-client\.js(?:\?v=[^"]+)?"><\/script>\s*$/m,"");
  html=html.replace(/^\s*<script src="\/js\/ccg-play-maintenance-owner-gate\.js(?:\?v=[^"]+)?"[^>]*><\/script>\s*$/m,"");
  html=html.replace(/^\s*<script src="js\/weekly-challenge\.js\?v=[^"]+"><\/script>\s*$/m,"");
  html=html.replace(/href="\/games\/ccg-games\/"/g,'href="https://www.cheekycommodoregamer.co.uk/games/ccg-games/" target="_blank" rel="noopener noreferrer"');
  html=html.replace(/src="\/resources\/images\/hero\/c64-dungeon-carnage-home-v2\.webp(?:\?v=[^"]*)?"/g,'src="assets/c64-dungeon-carnage-loader.webp"');
  html=html.replace(/<script src="js\/v10-41-load-watchdog\.js\?v=([^"]+)"><\/script>/,'<script src="js/v10-41-load-watchdog.js?v=$1"></script>\n<script src="js/itch-release-runtime.js?v='+cacheToken+'"></script>');
  if(!html.includes("js/itch-release-runtime.js"))fail("Could not inject itch release runtime");
  if(/src="\/js\/ccg-supabase-|js\/weekly-challenge\.js/.test(html))fail("Website account scripts remain in staged itch index");
  if(/(?:href|src)="\/(?!\/)/.test(html))fail("Root-relative URL remains in staged itch index");
  return html;
}
async function collectManifest(root,version,sourceSha,sourceOnlyAssetsExcluded=[]){
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
    websiteAccountFeatures:[],
    localModes:["Solo","Tutorial"],
    sourceOnlyAssetsExcluded,
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
  // Guard actual downloadable bytes: staged-only author assets may stay in
  // the repository but must never leak into the commercial release archive.
  const artCatalogue=JSON.parse(await fs.readFile(path.join(root,"assets","asset-manifest.json"),"utf8"));
  const {sourceOnly,requiredActive}=r118PackageSelection(artCatalogue);
  const excluded=[...sourceOnly].sort();
  if(JSON.stringify(manifest.sourceOnlyAssetsExcluded||[])!==JSON.stringify(excluded)){
    fail("Itch R118 source-only exclusion list differs from audited manifest");
  }
  for(const relative of sourceOnly){
    if(await exists(path.join(root,...relative.split("/"))))fail("Unused R118 candidate leaked into itch package: "+relative);
  }
  for(const relative of requiredActive){
    await ordinaryFile(path.join(root,...relative.split("/")),"Licensed active R118 artwork");
  }
  const packagedOwners=await fs.readFile(path.join(root,"js","asset-overrides.js"),"utf8");
  for(const relative of sourceOnly){
    if(packagedOwners.includes(JSON.stringify(relative))){
      fail("Inactive R118 artwork URL leaked into packaged game runtime: "+relative);
    }
  }

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
  if(html.includes("data-ccg-protected-runtime"))fail("Website protected-runtime placeholders leaked into authorised itch package");
  if(/(?:href|src)="\/(?!\/)/.test(html))fail("Root-relative URL remains in itch package");
  if(!html.includes("https://www.cheekycommodoregamer.co.uk/games/ccg-games/"))fail("Website exit handoff missing");
  if(/Weekly High-Score Vault|Weekly Dungeon|2P Split Screen|P2:|#weekly-vault/i.test(html))fail("Retired public mode copy leaked into itch package");
  if(!Array.isArray(manifest.localModes)||manifest.localModes.join("|")!=="Solo|Tutorial")fail("Itch manifest must expose Solo and Tutorial only");
  if(!Array.isArray(manifest.websiteAccountFeatures)||manifest.websiteAccountFeatures.length!==0)fail("Retired Weekly Vault account feature must not remain in itch manifest");
  if(await exists(path.join(root,"js","ccg-supabase-config.js"))||await exists(path.join(root,"js","ccg-supabase-client.js")))fail("Supabase website bootstrap must not be packaged");
  const stagedPaywall=await fs.readFile(path.join(root,"js","v10-42-demo-paywall.js"),"utf8");
  if(!/demoMode:false/.test(stagedPaywall)||!/commerce:false/.test(stagedPaywall))fail("Package demo-paywall compatibility owner is missing its disabled-commerce boundary");
  if(/paypal|checkout|entitlement provider|\/auth\/|ccg-backend|signed-download|private-download/i.test(stagedPaywall))fail("Retired commerce/auth implementation leaked into staged demo-paywall owner");
  console.log("C64 Dungeon Carnage itch package verified: "+manifest.fileCount+" files, "+manifest.build);
}
async function build(output,sourceSha){
  const outputRoot=path.resolve(output);
  if(outputRoot===path.parse(outputRoot).root||sameOrWithin(REPO_ROOT,outputRoot)||sameOrWithin(outputRoot,REPO_ROOT)||sameOrWithin(SOURCE_ROOT,outputRoot)||sameOrWithin(outputRoot,SOURCE_ROOT)){
    fail("Unsafe itch output root; release staging must be outside the repository tree: "+outputRoot);
  }
  await fs.rm(outputRoot,{recursive:true,force:true});
  await fs.mkdir(outputRoot,{recursive:true});

  const sourceCatalogue=JSON.parse(await fs.readFile(path.join(SOURCE_ROOT,"assets","asset-manifest.json"),"utf8"));
  const selection=r118PackageSelection(sourceCatalogue);
  const excluded=[...selection.sourceOnly].sort();
  const copied=[];
  for(const name of INCLUDE_FILES){
    const from=path.join(SOURCE_ROOT,name);
    const to=path.join(outputRoot,name);
    assertAllowed(name);
    await ordinaryFile(from,"Source file");
    await fs.copyFile(from,to);
    copied.push(name);
  }
  for(const name of INCLUDE_DIRS)await copyTree(path.join(SOURCE_ROOT,name),path.join(outputRoot,name),name,copied,selection.sourceOnly);
  for(const [sourceRelative,packageRelative] of EXTERNAL_FILES){
    assertAllowed(packageRelative);
    const from=path.join(REPO_ROOT,...sourceRelative.split("/"));
    const to=path.join(outputRoot,...packageRelative.split("/"));
    await ordinaryFile(from,"External runtime file");
    await fs.mkdir(path.dirname(to),{recursive:true});
    await fs.copyFile(from,to);
    copied.push(packageRelative);
  }

  await disableStagedOverrideUrls(outputRoot,selection.sourceOnly);

  const version=JSON.parse(await fs.readFile(path.join(outputRoot,"version.json"),"utf8"));
  const indexPath=path.join(outputRoot,"index.html");
  const sourceIndex=await fs.readFile(indexPath,"utf8");
  await fs.writeFile(indexPath,transformIndex(sourceIndex,version.cacheToken),"utf8");
  await fs.writeFile(path.join(outputRoot,"js","itch-release-runtime.js"),offlineRuntime(version.cacheToken),"utf8");
  await fs.writeFile(path.join(outputRoot,"js","v10-42-demo-paywall.js"),packageDemoPaywallRuntime(),"utf8");

  const manifest=await collectManifest(outputRoot,version,sourceSha,excluded);
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
