/**
 * Dropzone CRT-only high-score Arena VISUAL stage.
 * No score address, life counter or game-over RAM signature has been
 * verified for this cartridge. Never read unrelated Crossfire addresses,
 * read/write remote leaderboards, or submit fabricated score candidates.
 */
import { renderArenaBoard, normaliseArenaBoard } from "../../view/arena-board.mjs";
import { readDropzoneHudScore } from "./score-reader.mjs";
const GAME_KEY = "c64-dropzone";
export const DROPZONE_CRT = Object.freeze({
  id: "owner-crt-more-dropzone",
  title: "Dropzone",
  format: "crt",
  filename: "dropzone.crt",
  bytes: 82144,
  sha256: "0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7",
  url: "/emulator/c64/media/cartridge-replacements/dropzone.crt"
});
const CSS_URL = "/resources/css/ccg-high-score-arena-dropzone.css?ccg_rev=20261119_dropzone_arena_visual_v1";

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
  getMachine=()=>null,isCurrent=()=>true
}={}) {
  if (!stage || !doc?.createElement || !doc.head ||
      !(await verifyDropzoneMedia(entry,bytes,subtle??globalThis.crypto?.subtle)) ||
      !isCurrent()) return null;
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
  notice.textContent="DROPZONE CRT · SCORE SUBMISSIONS DISABLED";
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

  const display=doc.createElement("div");
  display.className="ccg-arena-preview__display";
  const board=doc.createElement("div");
  board.className="ccg-arena-preview__board";
  const run=doc.createElement("div");
  run.className="ccg-arena-preview__run";
  const score=doc.createElement("strong");
  score.textContent="—";
  score.setAttribute("aria-label","Local score unavailable until Dropzone's game-specific reader is verified");
  const hint=doc.createElement("p");
  hint.textContent="LOCAL HUD SCORE · UNVERIFIED · NO RANKED SUBMISSIONS";
  run.append(score,hint);
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
  let mode="alltime",disposed=false,lastScore=null;
  function show(){
    if(disposed)return;
    alltime.setAttribute("aria-pressed",String(mode==="alltime"));
    challenge.setAttribute("aria-pressed",String(mode==="challenge"));
    // There is no Dropzone server game key or trusted completed-run observer.
    // Unavailable board data MUST NOT be replaced with another game's scores.
    renderArenaBoard(board,normaliseArenaBoard({
      ok:true,gameKey:GAME_KEY,board:mode,challengeSlug:null,
      status:mode==="challenge"?"no-published-challenge":"unavailable",
      records:[]
    },{gameKey:GAME_KEY,board:mode,challengeSlug:null}),{mode});
  }
  alltime.addEventListener("click",()=>{mode="alltime";show();});
  challenge.addEventListener("click",()=>{mode="challenge";show();});
  show();
  return Object.freeze({
    // Until actual cartridge-specific memory forensics: no guessed score.
    observe(ram){
      if(disposed||!isCurrent())return;
      const machine=getMachine();
      if(!machine||machine.mem?.ram!==ram||!machine.vic2?.regs||
         !Number.isInteger(machine.cia2?.vicBank))return;
      const screenBase=(machine.cia2.vicBank+
        (((machine.vic2.regs[0x18]>>>4)&15)*1024))&65535;
      const local=readDropzoneHudScore(ram,{screenBase});
      if(local===null||local===lastScore)return;
      lastScore=local;
      score.textContent=local.toLocaleString("en-GB");
      score.setAttribute("aria-label","Local displayed Dropzone score "+local);
      hint.textContent="LOCAL HUD SCORE · NOT VERIFIED FOR SUBMISSION";
    },
    invalidate(){if(!disposed){
      lastScore=null;
      score.textContent="—";
      hint.textContent="SESSION ENDED · NO SCORE RECORDED";
    }},
    dispose(){
      if(disposed)return;
      disposed=true;
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
