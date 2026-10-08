"use strict";
/*
 * C64 Dungeon Carnage native-window launcher.
 * Playable files reside in app.asar/game, not a loose public web directory.
 * All browser game HTTP requests are restricted to a stable loopback origin.
 * The port must never change between launches: browser-origin storage, save
 * slots and preferences depend on the exact port being stable.
 */
const electron=require("electron");
const app=electron.app,BrowserWindow=electron.BrowserWindow;
const shell=electron.shell,session=electron.session;
const fs=require("node:fs"),http=require("node:http");
const path=require("node:path");
const {resolveGamePath,parseRange}=require("./path-guard.cjs");
const GAME_ROOT=path.join(__dirname,"game");
// Reserve one stable origin for save games across installations and updates.
// Never switch to an arbitrary port: this would hide existing browser saves.
const GAME_PORT=47731;
const EXTERNAL_HOSTS=new Set([
  "cheekycommodoregamer.co.uk","www.cheekycommodoregamer.co.uk",
  "itch.io","www.itch.io","patreon.com","www.patreon.com",
  "discord.gg","www.youtube.com","youtube.com"
]);
let gameServer=null,gameWindow=null;
function externalDestination(raw){
  try{
    const url=new URL(raw);
    if(url.protocol!=="https:"||url.username||url.password)return null;
    if(!EXTERNAL_HOSTS.has(url.hostname.toLowerCase()))return null;
    return url.toString();
  }catch(_){return null}
}
function serve(req,res){
  const host=String(req.headers.host||"");
  const port=gameServer&&gameServer.address()&&gameServer.address().port;
  if(host!=="127.0.0.1:"+port){res.writeHead(403);res.end();return}
  if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405);res.end();return}
  let url;
  try{url=new URL(req.url||"","http://127.0.0.1")}
  catch(_){res.writeHead(400);res.end();return}
  // Preserve origin-root absolute paths used by the existing offline runtime.
  const relative=url.pathname||"/";
  const target=resolveGamePath(relative,GAME_ROOT);
  if(!target){res.writeHead(404);res.end();return}
  let stat;
  try{stat=fs.statSync(target.file)}
  catch(_){res.writeHead(404);res.end();return}
  if(!stat.isFile()){res.writeHead(404);res.end();return}
  const headers={
    "Content-Type":target.contentType,
    "Accept-Ranges":"bytes",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer"
  };
  const range=parseRange(req.headers.range,stat.size);
  if(range===false){
    res.writeHead(416,{...headers,"Content-Range":"bytes */"+stat.size});
    res.end();return;
  }
  if(range){
    headers["Content-Length"]=range.end-range.start+1;
    headers["Content-Range"]="bytes "+range.start+"-"+range.end+"/"+stat.size;
    res.writeHead(206,headers);
  }else{
    headers["Content-Length"]=stat.size;
    res.writeHead(200,headers);
  }
  if(req.method==="HEAD"){res.end();return}
  const stream=fs.createReadStream(target.file,range||undefined);
  stream.on("error",()=>res.destroy());
  stream.pipe(res);
}
async function startGame(){
  gameServer=http.createServer((req,res)=>serve(req,res));
  await new Promise((resolve,reject)=>{
    gameServer.once("error",reject);
    gameServer.listen(GAME_PORT,"127.0.0.1",resolve);
  });
  const base="http://127.0.0.1:"+GAME_PORT+"/";
  const gameOrigin=new URL(base).origin;
  session.defaultSession.webRequest.onBeforeRequest(
    {urls:["http://*/*","https://*/*"]},
    (details,callback)=>{
      let local=false;
      try{
        const url=new URL(details.url);
        local=url.origin===gameOrigin;
      }catch(_){}
      callback({cancel:!local});
    }
  );
  session.defaultSession.setPermissionRequestHandler((_wc,permission,callback)=>{
    callback(permission==="fullscreen");
  });
  gameWindow=new BrowserWindow({
    title:"C64 Dungeon Carnage",show:false,
    width:1440,height:900,minWidth:800,minHeight:550,
    autoHideMenuBar:true,backgroundColor:"#101019",
    webPreferences:{
      nodeIntegration:false,contextIsolation:true,sandbox:true,
      webSecurity:true,webviewTag:false,devTools:false
    }
  });
  gameWindow.removeMenu();
  gameWindow.webContents.setWindowOpenHandler(({url})=>{
    const target=externalDestination(url);
    if(target)shell.openExternal(target).catch(()=>{});
    return {action:"deny"};
  });
  gameWindow.webContents.on("will-navigate",(event,url)=>{
    if(url.startsWith(base))return;
    event.preventDefault();
    const target=externalDestination(url);
    if(target)shell.openExternal(target).catch(()=>{});
  });
  gameWindow.webContents.on("will-attach-webview",event=>event.preventDefault());
  gameWindow.once("ready-to-show",()=>{if(gameWindow)gameWindow.show()});
  await gameWindow.loadURL(base+"index.html");
  gameWindow.show();
  gameWindow.on("closed",()=>{gameWindow=null;app.quit()});
}
if(process.platform==="win32")app.setAppUserModelId("uk.co.cheekycommodoregamer.dungeoncarnage");
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on("second-instance",()=>{
    if(gameWindow){if(gameWindow.isMinimized())gameWindow.restore();gameWindow.focus()}
  });
  app.whenReady().then(startGame).catch(error=>{
    console.error("Dungeon Carnage Windows startup failed",error);
    const message=error?.code==="EADDRINUSE"
      ?"Dungeon Carnage cannot open its saved-game port (47731). Close other instances or applications using this port and start it again. Your saves have not been deleted."
      :"Dungeon Carnage could not start. "+String(error?.message||error);
    try{electron.dialog.showErrorBox("Dungeon Carnage — launch failed",message)}catch(_){}
    app.quit();
  });
}
app.on("before-quit",()=>{
  if(gameServer){gameServer.close();gameServer=null}
});
app.on("window-all-closed",()=>app.quit());
