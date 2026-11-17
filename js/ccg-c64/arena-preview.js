/**
 * CCG Crossfire High Score Arena: browser-side OPT-IN pilot only.
 *
 * This module NEVER submits a score, reads account details, or claims a
 * trustworthy run. The live emulator does not load it without the explicit
 * ccg_arena_preview=crossfire URL parameter and exact verified PRG.
 */
import { identifyArenaMedia, createArenaDiagnosticObserver }
  from "../../scripts/high-score-arena/arena-game-profiles.mjs";
import { renderArenaBoard, normaliseArenaBoard }
  from "../../scripts/high-score-arena/view/arena-board.mjs";

const STYLE_URL="/resources/css/ccg-high-score-arena-preview.css?ccg_rev=20261117_crossfire_preview_v1";
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

export async function mountCrossfirePreview({ entry, bytes, stage, doc=globalThis.document, subtle }={}) {
  if(!stage || !doc?.createElement || !doc.head ||
     !(await verifyCrossfirePreviewMedia(entry,bytes,subtle??globalThis.crypto?.subtle)))return null;
  const observer=createArenaDiagnosticObserver({
    platform:"c64",catalogId:entry.id,format:"prg",
    sha256:entry.sha256,byteLength:bytes.byteLength
  });
  if(!observer)return null;

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
  notice.textContent="PREVIEW ONLY · SCORES ARE NOT SUBMITTED";
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
  stage.insertAdjacentElement("afterend",section);

  let mode="alltime", disposed=false, lastScore=null, final=false;
  const expected=boardName=>({gameKey:GAME_KEY,board:boardName,challengeSlug:null});
  const show=()=>{
    if(disposed)return;
    alltime.setAttribute("aria-pressed",String(mode==="alltime"));
    challenge.setAttribute("aria-pressed",String(mode==="challenge"));
    // No backend exists in production yet. Empty is mandatory and never a fake rank.
    renderArenaBoard(board,normaliseArenaBoard({
      ok:true,gameKey:GAME_KEY,board:mode,challengeSlug:null,
      status:mode==="challenge"?"no-published-challenge":"unavailable",
      records:[]
    },expected(mode)),{mode});
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
      if(observer.lastScore!==null && lastScore!==observer.lastScore){
        lastScore=observer.lastScore;
        local.textContent=lastScore.toLocaleString("en-GB");
        hint.textContent="LOCAL DIAGNOSTIC ONLY · NOT A VERIFIED SUBMISSION";
      }
      if(candidate){
        final=true;
        local.textContent=candidate.score.toLocaleString("en-GB");
        hint.textContent="GAME OVER · LOCAL RESULT NOT RECORDED";
      }
    },
    invalidate() {
      if(disposed)return;
      final=true;
      local.textContent="—";
      hint.textContent="SESSION ENDED · NO SCORE RECORDED";
    },
    dispose() {
      if(disposed)return;
      disposed=true;
      section.remove();
      link.remove();
    }
  });
}
