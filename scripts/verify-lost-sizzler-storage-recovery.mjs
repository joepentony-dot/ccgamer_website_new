import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"..");
const defaultManifest=path.join(repo,"arcade/lost-sizzler/SUPABASE-STORAGE-RECOVERY-MANIFEST.md");
const EXPECTED_PAIR_COUNT=16;
const EXPECTED_ENABLED_BYTES=72_233_137;

function usage(){
  console.log(`Lost Sizzler Storage recovery verifier (read-only)\n\nUsage:\n  node scripts/verify-lost-sizzler-storage-recovery.mjs --manifest-check\n  node scripts/verify-lost-sizzler-storage-recovery.mjs --self-test\n  node scripts/verify-lost-sizzler-storage-recovery.mjs --enabled-dir <dir> [--disabled-dir <dir>] [--probe] [--report <file>]\n\nOptions:\n  --manifest <file>      Override the frozen Markdown manifest path.\n  --manifest-check       Validate the frozen 16-pair manifest without requiring downloads.\n  --self-test            Prove hash classification plus recovery-root/report filesystem safety.\n  --enabled-dir <dir>    Directory containing the 16 enabled downloads.\n  --disabled-dir <dir>   Optional directory containing the 16 disabled counterparts.\n  --probe                Run ffprobe against recovered files and fail on decode/probe errors.\n  --report <file>        Write a new JSON verification report outside recovered binary trees.\n  --help                 Show this help.\n\nFile lookup accepts each Storage basename, the original filename, or a mirrored Storage path beneath the supplied directory.\nNo network, upload, delete, rename, overwrite or Supabase mutation is performed.`)
}

function parseArgs(argv){
  const out={manifest:defaultManifest,manifestCheck:false,selfTest:false,enabledDir:"",disabledDir:"",probe:false,report:"",help:false};
  for(let i=0;i<argv.length;i++){
    const arg=argv[i];
    if(arg==="--manifest")out.manifest=path.resolve(argv[++i]||"");
    else if(arg==="--manifest-check")out.manifestCheck=true;
    else if(arg==="--self-test")out.selfTest=true;
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

function isInside(root,candidate){
  const relative=path.relative(root,candidate);
  return relative===""||(!relative.startsWith(`..${path.sep}`)&&relative!==".."&&!path.isAbsolute(relative))
}

function assertNoSymlinkComponents(target,label){
  const resolved=path.resolve(target);
  const parsed=path.parse(resolved);
  let current=resolved;
  while(true){
    if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error(`${label} must not traverse a symbolic link: ${current}`);
    if(current===parsed.root)break;
    const parent=path.dirname(current);
    if(parent===current)break;
    current=parent
  }
  return resolved
}

function safeStorageRelativePath(value,label){
  const text=String(value||"").trim();
  if(!text||text.startsWith("/")||text.includes("\\")||path.posix.isAbsolute(text))throw new Error(`${label} is not a safe relative Storage path: ${text||"<empty>"}`);
  const normalized=path.posix.normalize(text);
  if(normalized!==text||normalized==="."||normalized.startsWith("../")||normalized.split("/").includes(".."))throw new Error(`${label} is not a canonical relative Storage path: ${text}`);
  return normalized
}

function safeOriginalFilename(value,label){
  const text=String(value||"").trim();
  if(!text||text==="."||text===".."||text.includes("/")||text.includes("\\")||path.basename(text)!==text)throw new Error(`${label} is not a safe filename: ${text||"<empty>"}`);
  return text
}

function safeRecoveryRoot(value,label){
  const root=path.resolve(value||"");
  if(!value||root===path.parse(root).root)throw new Error(`${label} must be a non-root directory: ${root}`);
  assertNoSymlinkComponents(root,label);
  if(!fs.existsSync(root))throw new Error(`${label} not found: ${root}`);
  const stat=fs.lstatSync(root);
  if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error(`${label} must be a real directory: ${root}`);
  return root
}

function resolveInside(root,relative,label){
  const candidate=path.resolve(root,...relative.split("/"));
  if(!isInside(root,candidate))throw new Error(`${label} escapes recovery root: ${relative}`);
  return candidate
}

function safeReportPath(value,enabledRoot,disabledRoot=""){
  if(!value)throw new Error("Recovery verification report path is required.");
  const target=path.resolve(value);
  if(target===path.parse(target).root)throw new Error(`Recovery verification report must not be a filesystem root: ${target}`);
  for(const [label,root] of [["enabled",enabledRoot],["disabled",disabledRoot]]){
    if(root&&isInside(root,target))throw new Error(`Recovery verification report must remain outside the ${label} recovery tree: ${target}`)
  }
  assertNoSymlinkComponents(path.dirname(target),"Recovery verification report parent");
  if(fs.existsSync(target))throw new Error(`Refusing to overwrite existing recovery verification report: ${target}`);
  return target
}

function writeReport(value,report,enabledRoot,disabledRoot=""){
  const target=safeReportPath(report,enabledRoot,disabledRoot);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  assertNoSymlinkComponents(path.dirname(target),"Recovery verification report parent");
  fs.writeFileSync(target,`${JSON.stringify(value,null,2)}\n`,{encoding:"utf8",flag:"wx"});
  return target
}

function parseManifest(file){
  const manifestPath=path.resolve(file);
  assertNoSymlinkComponents(manifestPath,"Recovery manifest");
  if(!fs.existsSync(manifestPath)||!fs.lstatSync(manifestPath).isFile())throw new Error(`Recovery manifest must be a regular file: ${manifestPath}`);
  const text=fs.readFileSync(manifestPath,"utf8");
  const rows=[];
  for(const line of text.split(/\r?\n/)){
    if(!/^\|\s*\d+\s*\|/.test(line))continue;
    const cells=line.split("|").slice(1,-1).map(cell=>cell.trim());
    if(cells.length!==12)throw new Error(`Unexpected manifest table shape on row: ${line}`);
    const [number,playlist,originalFile,enabledRow,enabledPath,expectedBytes,enabledSha,disabledRow,disabledPath,disabledSha,pairStatus,localDestination]=cells;
    const parsedNumber=Number(number);
    rows.push({
      number:parsedNumber,
      playlist:stripTicks(playlist),
      originalFile:safeOriginalFilename(stripTicks(originalFile),`Recovery manifest row ${parsedNumber} original filename`),
      enabledRow:Number(enabledRow),
      enabledPath:safeStorageRelativePath(stripTicks(enabledPath),`Recovery manifest row ${parsedNumber} enabled path`),
      expectedBytes:Number(String(expectedBytes).replaceAll(",","")),
      recordedEnabledSha:stripTicks(enabledSha),
      disabledRow:Number(disabledRow),
      disabledPath:safeStorageRelativePath(stripTicks(disabledPath),`Recovery manifest row ${parsedNumber} disabled path`),
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
  const safeStorage=safeStorageRelativePath(storagePath,"Recovered Storage path");
  const safeOriginal=safeOriginalFilename(originalFile,"Recovered original filename");
  const mirrored=resolveInside(root,safeStorage,"Mirrored recovered file");
  const storageBasename=resolveInside(root,path.posix.basename(safeStorage),"Recovered Storage basename");
  const original=resolveInside(root,safeOriginal,"Recovered original filename");
  return[mirrored,storageBasename,original].filter((value,index,list)=>list.indexOf(value)===index)
}

function findRecoveredFile(root,storagePath,originalFile){
  for(const candidate of candidateFiles(root,storagePath,originalFile)){
    if(!fs.existsSync(candidate))continue;
    assertNoSymlinkComponents(candidate,"Recovered file");
    const stat=fs.lstatSync(candidate);
    if(stat.isSymbolicLink())throw new Error(`Recovered file must not be a symbolic link: ${candidate}`);
    if(!stat.isFile())throw new Error(`Recovered candidate must be a regular file: ${candidate}`);
    return candidate
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

function hashBytes(value){
  return crypto.createHash("sha256").update(value).digest("hex")
}

function classifyPair(enabled,disabled){
  if(!enabled?.present||!disabled?.present)return"ENABLED ONLY";
  return enabled.sha256===disabled.sha256?"HASH IDENTICAL":"HASH DIFFERENT"
}

function expectFailure(action,label){
  let failed=false;
  try{action()}catch(_){failed=true}
  if(!failed)throw new Error(`Self-test expected failure: ${label}`)
}

function runSelfTest(){
  const left=Buffer.from("AAAA","utf8");
  const right=Buffer.from("BBBB","utf8");
  if(left.length!==right.length)throw new Error("Self-test fixture must use equal byte sizes.");
  const leftHash=hashBytes(left);
  const rightHash=hashBytes(right);
  if(leftHash===rightHash)throw new Error("Self-test fixture unexpectedly produced equal SHA-256 values.");
  const different=classifyPair({present:true,bytes:left.length,sha256:leftHash},{present:true,bytes:right.length,sha256:rightHash});
  if(different!=="HASH DIFFERENT")throw new Error(`Equal-size/different-hash self-test misclassified pair as ${different}.`);
  const identical=classifyPair({present:true,bytes:left.length,sha256:leftHash},{present:true,bytes:left.length,sha256:leftHash});
  if(identical!=="HASH IDENTICAL")throw new Error(`Equal-hash self-test misclassified pair as ${identical}.`);
  const missing=classifyPair({present:true,bytes:left.length,sha256:leftHash},null);
  if(missing!=="ENABLED ONLY")throw new Error(`Missing-counterpart self-test misclassified pair as ${missing}.`);

  expectFailure(()=>safeStorageRelativePath("../escape.mp3","self-test Storage path"),"Storage traversal must be rejected");
  expectFailure(()=>safeOriginalFilename("nested/file.mp3","self-test filename"),"nested original filename must be rejected");

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"lost-sizzler-storage-verifier-"));
  try{
    const enabled=path.join(temp,"enabled");
    const outside=path.join(temp,"outside");
    fs.mkdirSync(enabled,{recursive:true});
    fs.mkdirSync(outside,{recursive:true});
    fs.writeFileSync(path.join(enabled,"test.mp3"),left);
    const safeRoot=safeRecoveryRoot(enabled,"Self-test enabled recovery directory");
    const found=findRecoveredFile(safeRoot,"ccg-arcade-assets/lost-sizzler/enabled/test.mp3","test.mp3");
    if(found!==path.join(enabled,"test.mp3"))throw new Error("Self-test failed to resolve safe recovered basename.");

    fs.rmSync(path.join(enabled,"test.mp3"));
    const outsideFile=path.join(outside,"outside.mp3");
    fs.writeFileSync(outsideFile,left);
    fs.symlinkSync(outsideFile,path.join(enabled,"test.mp3"));
    expectFailure(()=>findRecoveredFile(safeRoot,"ccg-arcade-assets/lost-sizzler/enabled/test.mp3","test.mp3"),"symlinked recovered file must be rejected");
    fs.rmSync(path.join(enabled,"test.mp3"));

    const linkedRoot=path.join(temp,"enabled-link");
    fs.symlinkSync(enabled,linkedRoot,"dir");
    expectFailure(()=>safeRecoveryRoot(linkedRoot,"Self-test linked recovery root"),"symlinked recovery root must be rejected");

    const report=path.join(temp,"reports","verification.json");
    const reportValue={schema:"self-test",readOnly:true};
    writeReport(reportValue,report,safeRoot);
    if(!fs.existsSync(report))throw new Error("Self-test report was not written.");
    expectFailure(()=>writeReport(reportValue,report,safeRoot),"existing report must not be overwritten");
    expectFailure(()=>writeReport(reportValue,path.join(enabled,"verification.json"),safeRoot),"report inside recovery root must be rejected");

    const redirectedParent=path.join(temp,"redirected-report-parent");
    fs.symlinkSync(enabled,redirectedParent,"dir");
    expectFailure(()=>writeReport(reportValue,path.join(redirectedParent,"verification.json"),safeRoot),"symlinked report parent must be rejected");
    if(fs.existsSync(path.join(enabled,"verification.json")))throw new Error("Rejected redirected report unexpectedly wrote inside recovery tree.")
  }finally{
    fs.rmSync(temp,{recursive:true,force:true})
  }

  console.log("Lost Sizzler recovery verifier self-test passed: hash identity, safe relative paths, real recovery roots/files and immutable external report evidence are enforced.")
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
  assertNoSymlinkComponents(file,"Recovered file");
  const stat=fs.lstatSync(file);
  if(stat.isSymbolicLink()||!stat.isFile())throw new Error(`Recovered file must remain a real regular file: ${file}`);
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
  if(args.selfTest){runSelfTest();return}
  const {rows,total}=parseManifest(args.manifest);
  if(args.manifestCheck){
    console.log(`Lost Sizzler recovery manifest OK: ${rows.length} pairs, ${total.toLocaleString("en-GB")} enabled bytes.`);
    return
  }
  if(!args.enabledDir){usage();throw new Error("--enabled-dir is required unless --manifest-check or --self-test is used.")}
  const enabledRoot=safeRecoveryRoot(args.enabledDir,"Enabled recovery directory");
  const disabledRoot=args.disabledDir?safeRecoveryRoot(args.disabledDir,"Disabled recovery directory"):"";

  const failures=[];
  const results=[];
  for(const row of rows){
    const enabled=await inspectRecovered(enabledRoot,row,"enabled",args.probe);
    const disabled=disabledRoot?await inspectRecovered(disabledRoot,row,"disabled",args.probe):null;
    if(!enabled.present)failures.push(`#${row.number} enabled file missing`);
    else{
      if(!enabled.sizeMatches)failures.push(`#${row.number} enabled size mismatch (${enabled.bytes} != ${row.expectedBytes})`);
      if(args.probe&&!enabled.probe?.ok)failures.push(`#${row.number} enabled decode/probe failed: ${enabled.probe?.error||"unknown"}`)
    }
    if(disabledRoot){
      if(!disabled.present)failures.push(`#${row.number} disabled counterpart missing`);
      else{
        if(!disabled.sizeMatches)failures.push(`#${row.number} disabled size mismatch (${disabled.bytes} != ${row.expectedBytes})`);
        if(args.probe&&!disabled.probe?.ok)failures.push(`#${row.number} disabled decode/probe failed: ${disabled.probe?.error||"unknown"}`)
      }
    }
    const pairStatus=classifyPair(enabled,disabled);
    results.push({manifest:row,enabled,disabled,pairStatus});
    console.log(`${String(row.number).padStart(2,"0")} ${row.playlist}/${row.originalFile} | enabled ${enabled.present?(enabled.sizeMatches?"SIZE OK":"SIZE BAD"):"MISSING"} | ${disabledRoot?`disabled ${disabled?.present?(disabled.sizeMatches?"SIZE OK":"SIZE BAD"):"MISSING"} | ${pairStatus}`:"disabled NOT CHECKED"}`)
  }

  const enabledPresent=results.filter(result=>result.enabled.present).length;
  const hashIdentical=results.filter(result=>result.pairStatus==="HASH IDENTICAL").length;
  const hashDifferent=results.filter(result=>result.pairStatus==="HASH DIFFERENT").length;
  const report={
    generatedAt:new Date().toISOString(),
    readOnly:true,
    manifest:path.resolve(args.manifest),
    enabledDir:enabledRoot,
    disabledDir:disabledRoot||null,
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
    const target=writeReport(report,args.report,enabledRoot,disabledRoot);
    console.log(`Report written: ${displayPath(target)}`)
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
