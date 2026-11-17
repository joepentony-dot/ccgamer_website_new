/**
 * CCG Crossfire High Score Arena: browser-side OPT-IN pilot only.
 *
 * This module only submits an UNVERIFIED automatic score when its separate,
 * authenticated HelioHost transport is explicitly armed. Otherwise it never
 * sends a score. The live emulator requires the exact checksum-verified PRG
 * and the explicit ccg_arena_preview=crossfire pilot parameter.
 */
import { identifyArenaMedia, createArenaDiagnosticObserver }
  from "./arena/arena-game-profiles.mjs";
import { renderArenaBoard, normaliseArenaBoard }
  from "./arena/view/arena-board.mjs";
import { readHelioHostArenaBoard }
  from "./arena/client/heliohost-board.mjs";
import { CrossfireAutomaticAttempt }
  from "./arena/client/auto-run-controller.mjs";

const STYLE_URL="/resources/css/ccg-high-score-arena-preview.css?ccg_rev=20261117_crossfire_preview_v2";
const GAME_KEY="c64-crossfire-atlantis";
const EXPECTED_CATALOG_ID="archive-02121";

export function previewRequestEnabled(search) {
  if(typeof search!=="string")return false;
  try { return new URLSearchParams(search).get("ccg_arena_preview")==="crossfire"; }
  catch { return false; }
}

export async function verifyCrossfirePreviewMedia(entry, bytes, subtle=globalThis.crypto?.subtle) {
  if(!entry || !(bytes instanceof Uint8Array) || !subtle ||
     typeof subtle.digest!=="function") return false;
  const profile=identifyArenaMedia({
    platform:"c64",
    catalogId:entry.id,
    format:String(entry.format||"").toLowerCase(),
    sha256:entry.sha256,
    byteLength:bytes.byteLength
  });
  if(!profile || profile.key!==GAME_KEY ||
     entry.id!==EXPECTED_CATALOG_ID) return false;
  try {
    const digest=await subtle.digest("SHA-256",bytes);
    const hex=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
    return hex===profile.media.sha256;
  } catch {
    return false;
  }
}

export async function mountCrossfirePreview({
  entry, bytes, stage, doc=globalThis.document, subtle,
  publicBoardRead=globalThis.window?.location?.origin==="https://www.cheekycommodoregamer.co.uk"
    ? readHelioHostArenaBoard : null,
  arenaAttempt=null,arenaAttemptFactory=null
}={}) {
  if(!stage || !doc?.createElement || !doc.head ||
     !(await verifyCrossfirePreviewMedia(entry,bytes,subtle??globalThis.crypto?.subtle)))return null;
  const observer=createArenaDiagnosticObserver({
    platform:"c64",catalogId:entry.id,format:"prg",
    sha256:entry.sha256,byteLength:bytes.byteLength
  });
  if(!observer)return null;
  // The member handshake starts only AFTER exact PRG checksum verification.
  // Disabled by default and never constructs a visitor ID from browser input.
  let eligibleAttempt=arenaAttempt;
  if(!eligibleAttempt && typeof arenaAttemptFactory==='function') {
    try { eligibleAttempt=await arenaAttemptFactory(); }
    catch { eligibleAttempt=null; }
  }
  const automaticAttempt=new CrossfireAutomaticAttempt(eligibleAttempt);

  const link=doc.createElement("link");
  link.rel="stylesheet";
  link.href=STYLE_URL;
  link.setAttribute("data-ccg-arena-style","crossfire");
  doc.head.append(link);

  const section=doc.createElement("section");
  section.className="ccg-arena-preview";
  section.setAttribute("data-ccg-arena-preview","crossfire");
  section.setAttribute("aria-label","Crossfire High Score Arena preview");
  const intro=doc.createElement("div");
  intro.className="ccg-arena-preview__intro";
  const title=doc.createElement("h2");
  title.textContent="CROSSFIRE · HIGH SCORE ARENA";
  const notice=doc.createElement("p");
  notice.textContent=automaticAttempt.enabled
    ?"PILOT · SCORES REQUIRE INDEPENDENT REVIEW"
    :"PREVIEW ONLY · SCORES ARE NOT SUBMITTED";
  intro.append(title,notice);

  const modes=doc.createElement("div");
  modes.className="ccg-arena-preview__modes";
  modes.setAttribute("role","group");
  modes.setAttribute("aria-label","Leaderboard view");
  const alltime=doc.createElement("button");
  alltime.type="button";alltime.textContent="ALL-TIME";
  const challenge=doc.createElement("button");
  challenge.type="button";challenge.textContent="CHALLENGE";
  modes.append(alltime,challenge);

  const display=doc.createElement("div");
  display.className="ccg-arena-preview__display";
  const board=doc.createElement("div");
  board.className="ccg-arena-preview__board";
  const run=doc.createElement("div");
  run.className="ccg-arena-preview__run";
  const local=doc.createElement("strong");
  local.textContent="—";
  local.setAttribute("aria-label","Local score candidate");
  const hint=doc.createElement("p");
  hint.textContent="START A NORMAL LEVEL 1 GAME TO SEE A LOCAL SCORE";
  run.append(local,hint);
  display.append(board,run);
  section.append(intro,modes,display);
  stage.setAttribute("data-ccg-arena-frame","crossfire");
  stage.insertAdjacentElement("afterend",section);

  let mode="alltime", disposed=false, lastScore=null, final=false;
  let boardRequest=0, boardAbort=null;
  const expected=boardName=>({gameKey:GAME_KEY,board:boardName,challengeSlug:null});
  const stopBoardRead=()=>{
    boardRequest++;
    boardAbort?.abort();
    boardAbort=null;
  };
  const show=()=>{
    if(disposed)return;
    stopBoardRead();
    const requestedMode=mode;
    const serial=boardRequest;
    alltime.setAttribute("aria-pressed",String(mode==="alltime"));
    challenge.setAttribute("aria-pressed",String(mode==="challenge"));
    // No fabricated ranks. Inert preview stays empty until the independently
    // released HelioHost API supplies APPROVED public records.
    renderArenaBoard(board,normaliseArenaBoard({
      ok:true,gameKey:GAME_KEY,board:mode,challengeSlug:null,
      status:mode==="challenge" && !publicBoardRead
        ?"no-published-challenge":"unavailable",
      records:[]
    },expected(mode)),{mode});
    if(typeof publicBoardRead!=="function")return;
    boardAbort=typeof AbortController==="function"?new AbortController():null;
    const signal=boardAbort?.signal;
    Promise.resolve()
      .then(()=>publicBoardRead({board:requestedMode,enabled:true,signal}))
      .then(model=>{
        if(disposed || serial!==boardRequest)return;
        renderArenaBoard(board,model,{mode:requestedMode});
      })
      .catch(()=>{
        // Offline or denied backend remains an empty board, never a claimed rank.
      });
  };
  alltime.addEventListener("click",()=>{mode="alltime";show();});
  challenge.addEventListener("click",()=>{mode="challenge";show();});
  show();
  let observerFrames=0;
  return Object.freeze({
    observe(ram) {
      if(disposed || final || !(ram instanceof Uint8Array) || ram.length!==65536) return;
      observerFrames++;
      // Run every emulated frame; the game-over sentinel must persist for
      // twenty consecutive PAL frames. This is only loaded for opted-in PRG.
      const candidate=observer.observe(ram);
      const receipt=automaticAttempt.observe(observer,candidate);
      if(observer.lastScore!==null && lastScore!==observer.lastScore){
        lastScore=observer.lastScore;
        local.textContent=lastScore.toLocaleString("en-GB");
        hint.textContent="LOCAL DIAGNOSTIC ONLY · NOT A VERIFIED SUBMISSION";
      }
      if(candidate){
        final=true;
        local.textContent=candidate.score.toLocaleString("en-GB");
        hint.textContent="GAME OVER · LOCAL RESULT NOT RECORDED";
        if(receipt){
          void receipt.then(result=>{
            if(!disposed && result?.status==="pending-review" &&
               result.scoreReceived===candidate.score){
              hint.textContent="SUBMITTED FOR REVIEW · NOT YET RANKED";
            }
          });
        }
      }
    },
    invalidate() {
      if(disposed)return;
      automaticAttempt.stop();
      stopBoardRead();
      final=true;
      local.textContent="—";
      hint.textContent="SESSION ENDED · NO SCORE RECORDED";
    },
    dispose() {
      if(disposed)return;
      disposed=true;
      automaticAttempt.stop();
      stopBoardRead();
      stage.removeAttribute("data-ccg-arena-frame");
      section.remove();
      link.remove();
    }
  });
}
