"use strict";
const path=require("node:path");
const TYPES=Object.freeze({
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",
  ".css":"text/css; charset=utf-8",".txt":"text/plain; charset=utf-8",
  ".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",
  ".jpg":"image/jpeg",".jpeg":"image/jpeg",".gif":"image/gif",
  ".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav",
  ".flac":"audio/flac",".mp4":"video/mp4",".webm":"video/webm",
  ".woff":"font/woff",".woff2":"font/woff2",".ico":"image/x-icon",
  ".bin":"application/octet-stream",".wasm":"application/wasm",
  ".pdf":"application/pdf",".map":"application/json; charset=utf-8"
});
function resolveGamePath(pathname,gameRoot){
  if(typeof pathname!=="string"||!pathname.startsWith("/")||pathname.includes("\0"))return null;
  let decoded;
  try{decoded=decodeURIComponent(pathname)}catch(_){return null}
  if(decoded.includes("\\")||decoded.includes("\0")||decoded.includes("//"))return null;
  if(decoded==="/")decoded="/index.html";
  const components=decoded.split("/");
  if(components.some(part=>part==="."||part===".."||part.startsWith(".")))return null;
  const root=path.resolve(gameRoot);
  const candidate=path.resolve(root,"."+decoded);
  if(candidate===root||!candidate.startsWith(root+path.sep))return null;
  const ext=path.extname(candidate).toLowerCase();
  if(!Object.hasOwn(TYPES,ext))return null;
  return {file:candidate,contentType:TYPES[ext]};
}
function parseRange(header,length){
  if(!header)return null;
  if(typeof header!=="string"||!/^bytes=\d*-\d*$/.test(header))return false;
  const parts=header.slice(6).split("-");
  const first=parts[0],last=parts[1];
  if(first===""&&last==="")return false;
  let start,end;
  if(first===""){
    const suffix=Number(last);
    if(!Number.isSafeInteger(suffix)||suffix<=0)return false;
    start=Math.max(0,length-suffix);end=length-1;
  }else{
    start=Number(first);end=last===""?length-1:Number(last);
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end)return false;
    end=Math.min(end,length-1);
  }
  if(start>=length||end<0)return false;
  return {start,end};
}
module.exports={resolveGamePath,parseRange};
