import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"..");
const defaultManifest=path.join(repo,"arcade/lost-sizzler/SUPABASE-STORAGE-RECOVERY-MANIFEST.md");
const EXPECTED_PAIR_COUNT=16;
const EXPECTED_ENABLED_BYTES=72_233_137;

function usage(){
  console.log(`Lost Sizzler Storage recovery verifier (read-only)\n\nUsage:\n  node scripts/verify-lost-sizzler-storage-recovery.mjs --manifest-check\n  node scripts/verify-lost-sizzler-storage-recovery.mjs --enabled-dir <dir> [--disabled-dir <dir>] [--probe] [--report <file>]\n\nOptions:\n  --manifest <file>      Override the frozen Markdown manifest path.\n  --manifest-check       Validate the frozen 16-pair manifest without requiring downloads.\n  --enabled-dir <dir>    Directory containing the 16 enabled downloads.\n  --disabled-dir <dir>   Optional directory containing the 16 disabled counterparts.\n  --probe                Run ffprobe against recovered files and fail on decode/probe errors.\n  --report <file>        Write a JSON verification report. Source files and manifest stay unchanged.\n  --help                 Show this help.\n\nFile lookup accepts each Storage basename, the original filename, or a mirrored Storage path beneath the supplied directory.\nNo network, upload, delete, rename, overwrite or Supabase mutation is performed.`)
}

function parseArgs(argv){
  const out={manifest:defaultManifest,manifestCheck:false,enabledDir:"",disabledDir:"",probe:false,report:"",help:false};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--manifest")out.manifest=path.resolve(argv[++i]||"");
    else if(arg==="--manifest-check")out.manifestCheck=true;
    else if(arg==="--enabled-dir")out.enabledDir=path.resolve(argv[++i]||"");
    else if(arg==="--disabled-dir")out.disabledDir=path.resolve(argv[++i]||"");
    else if(arg==="--probe")out.probe=true;
    else if(arg==="--report")out.report=path.resolve(argv[++i]||"");
    else if(arg==="--help"||arg==="-h")out.help=true;
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return out
}

function stripTicks(value){
  const text=String(value||"").trim();
  return text.startsWith("`")&&text.endsWith("`")?text.slice(1,-1):text
}

function parseManifest(file){
  const text=fs.readFileSync(file,"utf8");
  const rows=[];
  for(const line of text.split(/\r?\n/)){
    if(!/^\|\s*\d+\s*\|/.test(line))continue;
    const cells=line.split("|").slice(1,-1).map(cell=>cell.trim());
    if(cells.length!==12)throw new Error(`Unexpected manifest table shape on row: ${line}`);
    const [number,playlist,originalFile,enabledRow,enabledPath,expectedBytes,enabledSha,disabledRow,disabledPath,disabledSha,pairStatus,localDestination]=cells;
    rows.push({
      number:Number(number),
      playlist:stripTicks(playlist),
      originalFile:stripTicks(originalFile),
      enabledRow:Number(enabledRow),
      enabledPath:stripTicks(enabledPath),
      expectedBytes:Number(String(expectedBytes).replaceAll(",","")),
      recordedEnabledSha:stripTicks(enabledSha),
      disabledRow:Number(disabledRow),
      disabledPath:stripTicks(disabledPath),
      recordedDisabledSha:stripTicks(disabledSha),
      recordedPairStatus:stripTicks(pairStatus),
      recordedLocalDestination:stripTicks(localDestination)
    })
  }
  if(rows.length!==EXPECTED_PAIR_COUNT)throw new Error(`Expected ${EXPECTED_PAIR_COUNT} recovery pairs, found ${rows.length}.`);
  rows.sort((a,b)=>a.number-b.number);
  rows.forEach((row,index)=>{
    if(row.number!==index+1)throw new Error(`Recovery manifest numbering is not contiguous at row ${row.number}.`);
    if(!row.playlist||!row.originalFile||!row.enabledPath||!row.disabledPath)throw new Error(`Recovery manifest row ${row.number} is incomplete.`);
    if(!Number.isSafeInteger(row.expectedBytes)||row.expectedBytes<=0)throw new Error(`Recovery manifest row ${row.number} has an invalid expected byte size.`)
  });
  const total=rows.reduce((sum,row)=>sum+row.expectedBytes,0);
  if(total!==EXPECTED_ENABLED_BYTES)throw new Error(`Enabled manifest byte total changed: expected ${EXPECTED_ENABLED_BYTES}, found ${total}.`);
  const enabledPaths=new Set(rows.map(row=>row.enabledPath));
  const disabledPaths=new Set(rows.map(row=>row.disabledPath));
  if(enabledPaths.size!==rows.length||disabledPaths.size!==rows.length)throw new Error("Recovery manifest contains duplicate Storage paths.");
  return{rows,total}
}

function candidateFiles(root,storagePath,originalFile){
  if(!root)return[];
  const mirrored=path.join(root,...storagePath.split("/"));
  const storageBasename=path.join(root,path.basename(storagePath));
  const original=path.join(root,originalFile);
  return[mirrored,storageBasename,original].filter((value,index,list)=>list.indexOf(value)===index)
}

function findRecoveredFile(root,storagePath,originalFile){
  for(const candidate of candidateFiles(root,storagePath,originalFile)){
    try{if(fs.statSync(candidate).isFile())return candidate}catch(_){}
  }
  return null
}

function sha256(file){
  return new Promise((resolve,reject)=>{
    const hash=crypto.createHash("sha256");
    const stream=fs.createReadStream(file);
    stream.on("data",chunk=>hash.update(chunk));
    stream.on("error",reject);
    stream.on("end",()=>resolve(hash.digest("hex")))
  })
}

function probeFile(file){
  const result=spawnSync("ffprobe",["-v","error","-show_entries","format=duration","-show_entries","stream=codec_name,codec_type","-of","json",file],{encoding:"utf8"});
  if(result.error){
    if(result.error.code==="ENOENT")return{ok:false,error:"ffprobe not found"};
    return{ok:false,error:String(result.error.message||result.error)}
  }
  if(result.status!==0)return{ok:false,error:String(result.stderr||`ffprobe exited ${result.status}`).trim()};
  try{
    const parsed=JSON.parse(result.stdout||"{}");
    const audioStreams=(parsed.streams||[]).filter(stream=>stream.codec_type==="audio");
    return{ok:audioStreams.length>0,duration:Number(parsed.format?.duration||0)||null,codecs:[...new Set(audioStreams.map(stream=>stream.codec_name).filter(Boolean))],error:audioStreams.length?"":"no audio stream reported"}
  }catch(error){return{ok:false,error:`invalid ffprobe JSON: ${error.message}`}}
}

async function inspectRecovered(root,row,kind,probe){
  const storagePath=kind==="enabled"?row.enabledPath:row.disabledPath;
  const file=findRecoveredFile(root,storagePath,row.originalFile);
  if(!file)return{present:false,file:null,bytes:null,expectedBytes:row.expectedBytes,sizeMatches:false,sha256:null,probe:null};
  const stat=fs.statSync(file);
  return{
    present:true,
    file,
    bytes:stat.size,
    expectedBytes:row.expectedBytes,
    sizeMatches:stat.size===row.expectedBytes,
    sha256:await sha256(file),
    probe:probe?probeFile(file):null
  }
}

function displayPath(file){
  if(!file)return"MISSING";
  const relative=path.relative(process.cwd(),file);
  return relative&&!relative.startsWith("..")?relative:file
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  if(args.help){usage();return}
  const {rows,total}=parseManifest(args.manifest);
  if(args.manifestCheck){
    console.log(`Lost Sizzler recovery manifest OK: ${rows.length} pairs, ${total.toLocaleString("en-GB")} enabled bytes.`);
    return
  }
  if(!args.enabledDir){usage();throw new Error("--enabled-dir is required unless --manifest-check is used.")}
  if(!fs.existsSync(args.enabledDir)||!fs.statSync(args.enabledDir).isDirectory())throw new Error(`Enabled recovery directory not found: ${args.enabledDir}`);
  if(args.disabledDir&&(!fs.existsSync(args.disabledDir)||!fs.statSync(args.disabledDir).isDirectory()))throw new Error(`Disabled recovery directory not found: ${args.disabledDir}`);

  const failures=[];
  const results=[];
  for(const row of rows){
    const enabled=await inspectRecovered(args.enabledDir,row,"enabled",args.probe);
    const disabled=args.disabledDir?await inspectRecovered(args.disabledDir,row,"disabled",args.probe):null;
    if(!enabled.present)failures.push(`#${row.number} enabled file missing`);
    else{
      if(!enabled.sizeMatches)failures.push(`#${row.number} enabled size mismatch (${enabled.bytes} != ${row.expectedBytes})`);
      if(args.probe&&!enabled.probe?.ok)failures.push(`#${row.number} enabled decode/probe failed: ${enabled.probe?.error||"unknown"}`)
    }
    if(args.disabledDir){
      if(!disabled.present)failures.push(`#${row.number} disabled counterpart missing`);
      else{
        if(!disabled.sizeMatches)failures.push(`#${row.number} disabled size mismatch (${disabled.bytes} != ${row.expectedBytes})`);
        if(args.probe&&!disabled.probe?.ok)failures.push(`#${row.number} disabled decode/probe failed: ${disabled.probe?.error||"unknown"}`)
      }
    }
    let pairStatus="ENABLED ONLY";
    if(disabled?.present&&enabled.present)pairStatus=enabled.sha256===disabled.sha256?"HASH IDENTICAL":"HASH DIFFERENT";
    results.push({manifest:row,enabled,disabled,pairStatus});
    console.log(`${String(row.number).padStart(2,"0")} ${row.playlist}/${row.originalFile} | enabled ${enabled.present?(enabled.sizeMatches?"SIZE OK":"SIZE BAD"):"MISSING"} | ${args.disabledDir?`disabled ${disabled?.present?(disabled.sizeMatches?"SIZE OK":"SIZE BAD"):"MISSING"} | ${pairStatus}`:"disabled NOT CHECKED"}`)
  }

  const enabledPresent=results.filter(result=>result.enabled.present).length;
  const hashIdentical=results.filter(result=>result.pairStatus==="HASH IDENTICAL").length;
  const hashDifferent=results.filter(result=>result.pairStatus==="HASH DIFFERENT").length;
  const report={
    generatedAt:new Date().toISOString(),
    readOnly:true,
    manifest:path.resolve(args.manifest),
    enabledDir:args.enabledDir,
    disabledDir:args.disabledDir||null,
    probeRequested:args.probe,
    expectedPairs:EXPECTED_PAIR_COUNT,
    expectedEnabledBytes:EXPECTED_ENABLED_BYTES,
    enabledPresent,
    hashIdentical,
    hashDifferent,
    failures,
    results:results.map(result=>({
      number:result.manifest.number,
      playlist:result.manifest.playlist,
      originalFile:result.manifest.originalFile,
      expectedBytes:result.manifest.expectedBytes,
      enabledRow:result.manifest.enabledRow,
      enabledStoragePath:result.manifest.enabledPath,
      enabled:{...result.enabled,file:result.enabled.file?path.resolve(result.enabled.file):null},
      disabledRow:result.manifest.disabledRow,
      disabledStoragePath:result.manifest.disabledPath,
      disabled:result.disabled?{...result.disabled,file:result.disabled.file?path.resolve(result.disabled.file):null}:null,
      pairStatus:result.pairStatus
    }))
  };

  if(args.report){
    fs.mkdirSync(path.dirname(args.report),{recursive:true});
    fs.writeFileSync(args.report,`${JSON.stringify(report,null,2)}\n`,"utf8");
    console.log(`Report written: ${displayPath(args.report)}`)
  }

  console.log(`Summary: enabled ${enabledPresent}/${EXPECTED_PAIR_COUNT}; hash-identical ${hashIdentical}; hash-different ${hashDifferent}; failures ${failures.length}.`);
  if(failures.length){
    for(const failure of failures)console.error(`FAIL: ${failure}`);
    process.exitCode=1
  }
}

main().catch(error=>{
  console.error(`Lost Sizzler recovery verification failed: ${error.message||error}`);
  process.exitCode=1
});
