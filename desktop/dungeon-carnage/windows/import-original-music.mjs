#!/usr/bin/env node
/**
 * Windows-only staging enhancement: import the 16 ORIGINAL owner-provided MP3s
 * into a verified standalone itch package, then rewrite only its copied
 * Supabase music URLs. Never touches the website source, backend or MP3s.
 * Usage: node import-original-music.mjs --game <staged-game> --music <recovered-files>
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";

const PROJECT="lcslgxpgmttaexsorxik";
const BUCKET="ccg-arcade-assets";
const REMOTE="https://"+PROJECT+".supabase.co/storage/v1/object/public/"+BUCKET+"/music/";
export const TRACKS=Object.freeze([
  ["lostSizzlerDanger","1787411621547-0-combat-01.mp3",3360888,"179b6d0e6f3b0c1e1ec0b74c2b43f6d6"],
  ["lostSizzlerDanger","1787411622953-1-combat-03.mp3",3999864,"1c6d67528d1fd1a93b6ae937c04fe4de"],
  ["lostSizzlerDanger","1787411636390-14-combat-02.mp3",5665656,"265f40fbf060c5f6f870229fcf6741ab"],
  ["lostSizzlerExploration","1787411626645-5-exploration-01.mp3",7227773,"8102f0627c612f49e252e8919e91e1aa"],
  ["lostSizzlerExploration","1787411628149-6-exploration-02.mp3",4186493,"b21ecdc8dcd864a7a6231090866aa568"],
  ["lostSizzlerExploration","1787411629062-7-exploration-03.mp3",6875261,"8bf8a43198626d1e51fe1bfd7846054f"],
  ["lostSizzlerExploration","1787411630429-8-exploration-04.mp3",4794749,"f4948c31fd2d35c4a66d3798033ef626"],
  ["lostSizzlerExploration","1787411631439-9-exploration-05.mp3",5446781,"ba9a90727c301366b8e3e9af6dfc9760"],
  ["lostSizzlerNamed","1787411632588-10-named-01.mp3",5085047,"4192818ce6c1556b142c16ae1f8b1f9a"],
  ["lostSizzlerNamed","1787411633643-11-named-02.mp3",3331703,"6a8c9573ef2a3608a4e886fef87e0d60"],
  ["lostSizzlerNamed","1787411637581-15-named-03.mp3",5134967,"bdd06fb65c441c42171d9fbd9fadfd66"],
  ["lostSizzlerSanctuary","1787411634411-12-sanctuary-01.mp3",5025147,"08075a84439f6762763807713de90cb2"],
  ["lostSizzlerSanctuary","1787411635463-13-sanctuary-02.mp3",4168059,"51c9fd613dd95be82eb10ac4bc339a05"],
  ["lostSizzlerStalker","1787411624060-2-count-loadula-01.mp3",2001535,"72e704f231e03f45dff255f6756e7b98"],
  ["lostSizzlerStalker","1787411624977-3-count-loadula-02.mp3",1946239,"402a45c1c17d9598f5f7b8713a7a685c"],
  ["lostSizzlerStalker","1787411625578-4-count-loadula-03.mp3",3982975,"f3758bddb5267fec3b5e81e22766c5c8"]
]);
export function remapMusicUrls(source){
  let patched=source;
  for(const [category,name] of TRACKS){
    const url=REMOTE+category+"/"+name;
    if(!patched.includes(url))throw new Error("Canonical soundtrack URL missing: "+name);
    patched=patched.split(url).join("assets/audio/music/originals/"+category+"/"+name);
  }
  if(patched.includes(REMOTE))throw new Error("Unexpected original soundtrack URL remains");
  // The guarded R119 preview may override the playlist with bundled WAVs.
  // When all 16 original MP3s have passed their fingerprints, remove only
  // that known staging-only WAV override; never edit live website sources.
  const previewMarker="/* Offline packages must play bundled tracks;";
  if(patched.includes(previewMarker)){
    const start=patched.indexOf(previewMarker);
    const guard=patched.indexOf("if(window.CCGDungeonCarnageItchPackage===true){",start);
    const nextMarker="/* Every enhancement URL inherits";
    const end=patched.indexOf(nextMarker,guard);
    const block=end>=0&&guard>=start?patched.slice(guard,end):"";
    if(guard<start||end<guard||!block.includes("offlineMusic.playlists[state]")||
      !/}\s*$/.test(block))throw new Error("Unrecognised preview WAV-override shape");
    patched=patched.slice(0,start)+
      "/* Owner's 16 verified original MP3 tracks now own offline playback. */\n\n"+
      patched.slice(end);
  }
  return patched;
}
function sha(data){return crypto.createHash("sha256").update(data).digest("hex")}
async function regularFile(filename){
  const stat=await fs.lstat(filename);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error("Non-regular or symlink input: "+filename);
  return stat;
}
async function findOriginal(folder,category,name){
  const choices=[
    path.join(folder,name),
    path.join(folder,category,name),
    path.join(folder,"music",category,name),
    path.join(folder,"originals",category,name)
  ];
  for(const file of choices)try{await regularFile(file);return file}catch(error){
    if(error.code!=="ENOENT")throw error
  }
  throw new Error("Original MP3 not found: "+name);
}
async function verifyMp3(file,expected,storageEtag){
  const stat=await regularFile(file);
  if(stat.size!==expected)throw new Error("File size mismatch; refusing substitute MP3: "+path.basename(file)+" ("+stat.size+" != "+expected+")");
  const f=await fs.open(file,"r");
  try{
    const b=Buffer.alloc(4096);
    const {bytesRead}=await f.read(b,0,b.length,0);
    if(bytesRead<4||!(b.toString("ascii",0,3)==="ID3"||(b[0]===0xff&&(b[1]&0xe0)===0xe0))){
      throw new Error("Not an MP3 header: "+path.basename(file));
    }
  }finally{await f.close()}
  // The live Storage inventory still exposes the original object ETag.
  // On these single-part objects it is an MD5-style 32-hex fingerprint;
  // reject mismatches rather than accepting same-size replacement audio.
  const data=await fs.readFile(file);
  const observed=crypto.createHash("md5").update(data).digest("hex");
  if(observed!==storageEtag)throw new Error("Original Supabase fingerprint mismatch: "+path.basename(file));
  return stat.size;
}
async function run(game,music){
  const stage=path.resolve(game),source=path.resolve(music);
  if(stage===source||stage.startsWith(source+path.sep)||source.startsWith(stage+path.sep)){
    throw new Error("Recovered input MP3s must be outside the staging game directory");
  }
  const manifestPath=path.join(stage,"release-manifest.json");
  const jsPath=path.join(stage,"js","asset-overrides.js");
  const [original,manifestText]=await Promise.all([fs.readFile(jsPath,"utf8"),fs.readFile(manifestPath,"utf8")]);
  const manifest=JSON.parse(manifestText);
  if(manifest.schema!=="ccg-c64-dungeon-carnage-itch-package-v1")throw new Error("Only canonical staged Dungeon package supported");
  if(manifest.originalMusic)throw new Error("Original soundtrack already installed; do not inject twice");
  const patched=remapMusicUrls(original),verified=[];
  for(const [category,name,size,storageEtag] of TRACKS){
    const file=await findOriginal(source,category,name);
    await verifyMp3(file,size,storageEtag);
    verified.push({category,name,size,storageEtag,file,relative:"assets/audio/music/originals/"+category+"/"+name});
  }
  const bytes=verified.reduce((sum,t)=>sum+t.size,0);
  if(verified.length!==16||bytes!==72233137)throw new Error("Original soundtrack inventory mismatch");
  for(const track of verified){
    const target=path.join(stage,...track.relative.split("/"));
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.copyFile(track.file,target);
    track.sha256=sha(await fs.readFile(target));
  }
  await fs.writeFile(jsPath,patched,"utf8");
  const provenance={
    schema:"ccg-owner-original-mp3-recovery-v1",
    source:"Owner recovered 16 original Supabase objects; validated exact stored object sizes and MP3 header",
    originalSupabaseBucket:BUCKET,
    count:verified.length,bytes,
    tracks:verified.map(({category,name,size,storageEtag,relative,sha256})=>({category,name,bytes:size,storageEtag,path:relative,sha256}))
  };
  const provenancePath="assets/audio/music/originals/RECOVERED-MUSIC-MANIFEST.json";
  await fs.writeFile(path.join(stage,...provenancePath.split("/")),JSON.stringify(provenance,null,2)+"\n","utf8");
  const entries=new Map(manifest.files.map(entry=>[entry.path,entry]));
  for(const name of ["js/asset-overrides.js",provenancePath,...verified.map(t=>t.relative)]){
    const data=await fs.readFile(path.join(stage,...name.split("/")));
    entries.set(name,{path:name,bytes:data.length,sha256:sha(data)});
  }
  manifest.files=[...entries.values()].sort((a,b)=>a.path.localeCompare(b.path,"en"));
  manifest.fileCount=manifest.files.length;
  manifest.totalBytes=manifest.files.reduce((sum,item)=>sum+item.bytes,0);
  manifest.originalMusic={count:16,bytes,source:"owner-recovered-original-mp3",remotePlaybackRemoved:true};
  await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+"\n","utf8");
  console.log("Original MP3 soundtrack installed in staging: "+verified.length+" files, "+bytes+" bytes; no Supabase music URLs remain");
  console.log("Staging manifest refreshed; run existing standalone package --verify before Electron build");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2),opts={};
  for(let i=0;i<args.length;i+=2){
    if(!["--game","--music"].includes(args[i])||!args[i+1])throw new Error("Usage: --game <staged-game> --music <recovered-folder>");
    opts[args[i]]=args[i+1];
  }
  if(!opts["--game"]||!opts["--music"])throw new Error("Specify both --game and --music directories");
  run(opts["--game"],opts["--music"]).catch(error=>{console.error(error.message);process.exitCode=1});
}
