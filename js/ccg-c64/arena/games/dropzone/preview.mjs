/**
 * Dropzone CRT-only high-score Arena VISUAL stage.
 * The exact CRT HUD reader and visual GAME OVER sequence are verified from
 * original emulator captures. The server controls admission and publication.
 */
import { renderArenaBoard } from "../../view/arena-board.mjs";
import { DROPZONE_ATTEMPT_PROFILE } from "../../client/sierra-heliohost-attempt.mjs";
import { SierraHelioHostScoreBridge, isCrtHelioHostScoreIntent, createWebsiteScoreBridge } from "../../client/sierra-browser-score-bridge.mjs";
import { readHelioHostCrtBoard } from "../../client/sierra-heliohost-board.mjs";
import { DropzoneLocalRunObserver } from "./run-observer.mjs";
import { watchWebsiteScoreMode } from "../../client/website-score-session.mjs";
const GAME_KEY = DROPZONE_ATTEMPT_PROFILE.gameKey;
export const DROPZONE_CRT = Object.freeze({
  id: DROPZONE_ATTEMPT_PROFILE.catalogId,
  title: "Dropzone",
  format: "crt",
  filename: "dropzone.crt",
  bytes: DROPZONE_ATTEMPT_PROFILE.mediaBytes,
  sha256: DROPZONE_ATTEMPT_PROFILE.mediaSha256,
  url: "/emulator/c64/media/cartridge-replacements/dropzone.crt"
});
const CSS_URL = "/resources/css/ccg-high-score-arena-dropzone.css?ccg_rev=20261127_arena_unified_v1";

export async function verifyDropzoneMedia(entry, bytes, subtle=globalThis.crypto?.subtle) {
  if (!entry || !bytes || !(bytes instanceof Uint8Array) ||
      !subtle || typeof subtle.digest !== "function" ||
      entry.approved !== true || bytes.length !== DROPZONE_CRT.bytes ||
      Object.entries(DROPZONE_CRT).some(([key,value])=>entry[key]!==value))
    return false;
  try {
    const result = await subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(result),
      byte=>byte.toString(16).padStart(2,"0")).join("");
    return hash===DROPZONE_CRT.sha256;
  } catch { return false; }
}

export async function mountDropzoneArenaPreview({
  entry,bytes,stage,doc=globalThis.document,subtle,
  getMachine=()=>null,isCurrent=()=>true,websiteOrigin="",scoreQuery="",scoreFetchImpl=globalThis.fetch
}={}) {
  if (!stage || !doc?.createElement || !doc.head ||
      !(await verifyDropzoneMedia(entry,bytes,subtle??globalThis.crypto?.subtle)) ||
      !isCurrent()) return null;
  let scoreRequested=isCrtHelioHostScoreIntent(scoreQuery,websiteOrigin,DROPZONE_ATTEMPT_PROFILE);
  const stylesheet=doc.createElement("link");
  stylesheet.rel="stylesheet";
  stylesheet.href=CSS_URL;
  stylesheet.setAttribute("data-ccg-arena-style","dropzone");
  doc.head.append(stylesheet);

  const section=doc.createElement("section");
  section.id="ccg-mobile-arena-panel";
  section.className="ccg-arena-preview";
  section.setAttribute("data-ccg-arena-preview","dropzone");
  section.setAttribute("data-ccg-arena-mobile-status","compact");
  section.setAttribute("aria-label","Dropzone High Score Arena local preview");

  const intro=doc.createElement("div");
  intro.className="ccg-arena-preview__intro";
  const title=doc.createElement("h2");
  title.textContent="DROPZONE · HIGH SCORE ARENA";
  const notice=doc.createElement("p");
  notice.textContent=scoreRequested
    ?"DROPZONE CRT · SCORE SUBMISSIONS REQUESTED"
    :"DROPZONE CRT · SCORE SUBMISSIONS DISABLED";
  intro.append(title,notice);

  const startHint=doc.createElement("p");
  startHint.className="ccg-arena-preview__start";
  startHint.textContent="JOYSTICK PORT 2 · PLAY THE ORIGINAL GAME";

  const modes=doc.createElement("div");
  modes.className="ccg-arena-preview__modes";
  modes.setAttribute("role","group");
  modes.setAttribute("aria-label","Leaderboard view");
  const alltime=doc.createElement("button");
  alltime.type="button"; alltime.textContent="ALL-TIME";
  const challenge=doc.createElement("button");
  challenge.type="button"; challenge.textContent="CHALLENGE";
  modes.append(alltime,challenge);
  let signIn=null;
  if(scoreRequested){
    signIn=doc.createElement("a");
    const returnTo="/emulator/c64/?game="+DROPZONE_CRT.id+"&autoplay=1&scores=1";
    signIn.href="/auth/heliohost-score-login.html?returnTo="+encodeURIComponent(returnTo);
    signIn.textContent="SIGN IN FOR SCORES";
    modes.append(signIn);
  }

  const display=doc.createElement("div");
  display.className="ccg-arena-preview__display";
  const board=doc.createElement("div");
  board.className="ccg-arena-preview__board";
  const run=doc.createElement("div");
  run.className="ccg-arena-preview__run";
  const score=doc.createElement("strong");
  score.textContent="—";
  score.setAttribute("aria-label","Local Dropzone HUD score pending");
  const hint=doc.createElement("p");
  hint.textContent="LOCAL HUD SCORE · UNVERIFIED · NO RANKED SUBMISSIONS";
  run.append(score,hint);
  const remoteHint=doc.createElement("p");
  remoteHint.className="ccg-arena-preview__submission";
  remoteHint.setAttribute("role","status");remoteHint.setAttribute("aria-live","polite");
  if(scoreRequested)run.append(remoteHint);
  display.append(board,run);
  section.append(intro,startHint,modes,display);

  stage.setAttribute("data-ccg-arena-frame","dropzone");
  stage.insertAdjacentElement("afterend",section);
  const mobileConsole=stage.closest?.(".ccg-c64-console");
  const mobileToggle=mobileConsole?.querySelector?.("[data-mobile-arena-toggle]");
  const setOpen=open=>{
    section.classList.toggle("is-mobile-open",open);
    section.setAttribute("data-ccg-arena-mobile-status",open?"expanded":"compact");
    mobileConsole?.classList?.toggle("ccg-arena-mobile-open",open);
    mobileToggle?.setAttribute("aria-expanded",String(open));
    if (mobileToggle) mobileToggle.textContent=open?"CLOSE SCORE":"SCORE";
  };
  const onToggle=()=>setOpen(!section.classList.contains("is-mobile-open"));
  if(mobileToggle){
    mobileToggle.hidden=false;
    mobileToggle.addEventListener("click",onToggle);
  }
  let mode="alltime",disposed=false,lastScore=null,lastPhase="inactive";
  const localRun=new DropzoneLocalRunObserver();
  let boardRequest=null;
  function show(){
    if(disposed)return;
    const view=mode;
    alltime.setAttribute("aria-pressed",String(view==="alltime"));
    challenge.setAttribute("aria-pressed",String(view==="challenge"));
    const options={mode:view,digitWidth:7};
    renderArenaBoard(board,{status:"unavailable",rows:[]},options);
    if(websiteOrigin!=="https://www.cheekycommodoregamer.co.uk")return;
    boardRequest?.abort();
    const request=new AbortController();
    boardRequest=request;
    void readHelioHostCrtBoard(GAME_KEY,{
      enabled:true,board:view,fetchImpl:scoreFetchImpl,signal:request.signal
    }).then(result=>{
      if(!disposed&&isCurrent()&&!request.signal.aborted&&boardRequest===request)
        renderArenaBoard(board,result,options);
    });
  }
  alltime.addEventListener("click",()=>{mode="alltime";show();});
  challenge.addEventListener("click",()=>{mode="challenge";show();});
  show();
  let scoreBridge=scoreRequested?new SierraHelioHostScoreBridge({
    enabled:true,origin:websiteOrigin,fetchImpl:scoreFetchImpl,
    profile:DROPZONE_ATTEMPT_PROFILE,
    onStatus:value=>{if(!disposed)remoteHint.textContent=value;}
  }):null;
  let onlineRun=false, onlineStartTried=false, websiteMode=false;
  const websiteAbort=new AbortController();
  const startConnection=async()=>{
    if(doc.defaultView?.location?.origin===websiteOrigin){
      const selected=await watchWebsiteScoreMode({
        doc,origin:websiteOrigin,gameKey:GAME_KEY,fetchImpl:scoreFetchImpl,signal:websiteAbort.signal,
        onCapability:()=>{
          if(disposed||websiteAbort.signal.aborted)return;
          websiteMode=true;scoreRequested=true;scoreBridge?.stop();scoreBridge=null;onlineRun=false;
          section.setAttribute("data-ccg-arena-online","requested");
          notice.textContent="DROPZONE CRT · CCG WEBSITE SCORING";
          if(!signIn){signIn=doc.createElement("a");modes.append(signIn);}
          signIn.href="/auth/login.html";signIn.target="_blank";signIn.rel="noopener";
          signIn.textContent="SIGN IN TO CCG";
          if(remoteHint.parentNode!==run)run.append(remoteHint);
          remoteHint.textContent="CHECKING CCG WEBSITE LOGIN";
        },
        onIdentity:(credential,capability)=>{
          if(disposed||websiteAbort.signal.aborted)return;
          scoreBridge?.stop();scoreBridge=null;onlineRun=false;
          if(!credential){signIn.hidden=false;remoteHint.textContent="SIGN IN TO CCG · PLAY LOCALLY UNTIL SIGNED IN";return;}
          signIn.hidden=true;
          const next=createWebsiteScoreBridge({
            enabled:true,origin:websiteOrigin,fetchImpl:scoreFetchImpl,profile:DROPZONE_ATTEMPT_PROFILE,
            capability,credential,onStatus:value=>{if(!disposed&&scoreBridge===next)remoteHint.textContent=value;}
          });
          scoreBridge=next;
          void next.connect({loadPublicBoard:false}).then(connected=>{
            if(disposed||scoreBridge!==next)return;
            if(!connected)signIn.hidden=false;
            else if(lastPhase==="active"||lastPhase==="terminal")
              remoteHint.textContent="CCG SIGNED IN · CURRENT RUN LOCAL ONLY · START A NEW GAME";
          });
        }
      });
      if(disposed||websiteAbort.signal.aborted||selected)return;
    }
    if(scoreBridge)void scoreBridge.connect({loadPublicBoard:false});
  };
  void startConnection().catch(()=>{if(!disposed)remoteHint.textContent="SCORE SERVICE UNAVAILABLE · LOCAL PLAY";});
  return Object.freeze({
    observe(ram){
      if(disposed||!isCurrent())return;
      const machine=getMachine();
      if(!machine||machine.mem?.ram!==ram||!machine.vic2?.regs||
         !Number.isInteger(machine.cia2?.vicBank))return;
      const screenBase=(machine.cia2.vicBank+
        (((machine.vic2.regs[0x18]>>>4)&15)*1024))&65535;
      const update=localRun.observe({
        ram,screenBase,frameBuffer:machine.vic2.frameBuffer
      });
      // Website mode must see the actual fresh active transition while connected.
      if(websiteMode&&update.phase==="active"&&lastPhase!=="active"&&!scoreBridge?.connected)
        onlineStartTried=true;
      if(scoreBridge?.connected){
        if(update.phase==="active"&&update.score===0&&
           (lastPhase==="inactive"||lastPhase==="completed"||(!websiteMode&&lastScore===0))&&
           !onlineStartTried){
          onlineStartTried=true;
          onlineRun=scoreBridge.armed();
        }
        if(onlineRun&&(update.phase==="inactive"||
            (lastPhase!=="completed"&&update.score!==null&&lastScore!==null&&update.score<lastScore))){
          scoreBridge.observe({phase:"invalid"});
          onlineRun=false;
        }
        if(onlineRun&&update.phase==="active"){
          scoreBridge.observe({phase:"running",lastScore:update.score});
        }
        if(onlineRun&&update.justCompleted){
          scoreBridge.observe({phase:"completed"},{
            kind:DROPZONE_ATTEMPT_PROFILE.finalKind,
            score:update.score,stableFrames:localRun.terminalCount,
            verified:false,eligibleForSubmission:false
          });
          onlineRun=false;
        }
      }
      if(update.justCompleted)onlineStartTried=false;
      if(update.phase==="completed"){
        if(lastPhase!=="completed"||lastScore!==update.score){
          lastScore=update.score;
          score.textContent=update.score.toLocaleString("en-GB");
          score.setAttribute("aria-label","Local Dropzone GAME OVER score "+update.score);
          hint.textContent=scoreRequested
            ?"GAME OVER · LOCAL FINAL SCORE"
            :"GAME OVER · LOCAL FINAL SCORE · NOT SUBMITTED";
        }
        lastPhase="completed";
        return;
      }
      if(update.score===null)return;
      if(update.score===lastScore&&update.phase===lastPhase)return;
      lastScore=update.score;
      lastPhase=update.phase;
      score.textContent=update.score.toLocaleString("en-GB");
      score.setAttribute("aria-label","Local displayed Dropzone score "+update.score);
      hint.textContent=update.phase==="terminal"
        ?"GAME OVER DETECTED · CONFIRMING LOCAL SCORE"
        :"LOCAL HUD SCORE · NOT VERIFIED FOR SUBMISSION";
    },
    invalidate(){if(!disposed){
      websiteAbort.abort();scoreBridge?.stop();
      localRun.reset();
      lastScore=null;
      lastPhase="inactive";
      score.textContent="—";
      hint.textContent="SESSION ENDED · NO SCORE RECORDED";
    }},
    dispose(){
      if(disposed)return;
      disposed=true;
      boardRequest?.abort();websiteAbort.abort();
      scoreBridge?.stop();
      setOpen(false);
      mobileToggle?.removeEventListener("click",onToggle);
      if(mobileToggle){
        mobileToggle.hidden=true;
        mobileToggle.setAttribute("aria-expanded","false");
        mobileToggle.textContent="SCORE";
      }
      stage.removeAttribute("data-ccg-arena-frame");
      section.remove();
      stylesheet.remove();
    }
  });
}
