/**
 * CCG Crossfire High Score Arena: verified-CRT automatic visual pilot.
 *
 * This is a READ-ONLY visual pilot for the Sierra Online CRT. The separate
 * Atlantis/Pantheon PRG observer and backend are NOT this game. There is NO
 * score detection, backend read, login handshake or submission until
 * CRT-specific gameplay eligibility is independently verified.
 * The live emulator mounts automatically after normal LOAD of the exact
 * checksum-verified Sierra CRT, without a special query parameter.
 */
import { identifyArenaMedia } from "./arena/arena-game-profiles.mjs";
import { isVerifiedSierraCrossfireCrt } from "./game-catalog.js";
import { renderArenaBoard, normaliseArenaBoard } from "./arena/view/arena-board.mjs";

const STYLE_URL="/resources/css/ccg-high-score-arena-preview.css?ccg_rev=20261117_crossfire_crt_only_v1";
const GAME_KEY="c64-crossfire-sierra-online";
const EXPECTED_CATALOG_ID="owner-crt-more-crossfiresierraonline-0c60e852f438";

export async function verifyCrossfirePreviewMedia(entry, bytes, subtle=globalThis.crypto?.subtle) {
  if(!isVerifiedSierraCrossfireCrt(entry) || !(bytes instanceof Uint8Array) || !subtle ||
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
  entry, bytes, stage, doc=globalThis.document, subtle, isCurrent=()=>true
}={}) {
  if(!stage || !doc?.createElement || !doc.head ||
     !(await verifyCrossfirePreviewMedia(entry,bytes,subtle??globalThis.crypto?.subtle)))return null;
  if(typeof isCurrent === "function" && !isCurrent()) return null;
  // Do not create a PRG observer, authenticate a member or query the Atlantis
  // leaderboard. Only the exact Sierra CRT may get the visual frame.

  const link=doc.createElement("link");
  link.rel="stylesheet";
  link.href=STYLE_URL;
  link.setAttribute("data-ccg-arena-style","crossfire");
  doc.head.append(link);

  const section=doc.createElement("section");
  section.className="ccg-arena-preview";
  section.id="ccg-mobile-arena-panel";
  section.setAttribute("data-ccg-arena-preview","crossfire");
  section.setAttribute("aria-label","Crossfire High Score Arena preview");
  const intro=doc.createElement("div");
  intro.className="ccg-arena-preview__intro";
  const title=doc.createElement("h2");
  title.textContent="CROSSFIRE · HIGH SCORE ARENA";
  const notice=doc.createElement("p");
  notice.textContent="SIERRA ONLINE CRT · SCORE SUBMISSIONS DISABLED";
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
  hint.textContent="CRT SCORE DETECTION NOT YET VERIFIED";
  run.append(local,hint);
  display.append(board,run);
  section.append(intro,modes,display);
  stage.setAttribute("data-ccg-arena-frame","crossfire");
  stage.insertAdjacentElement("afterend",section);

  const mobileConsole=stage.closest?.(".ccg-c64-console");
  const mobileToggle=mobileConsole?.querySelector?.("[data-mobile-arena-toggle]");
  const setMobileOpen=open=>{
    section.classList.toggle("is-mobile-open",open);
    mobileConsole?.classList.toggle("ccg-arena-mobile-open",open);
    mobileToggle?.setAttribute("aria-expanded",String(open));
    if(mobileToggle) mobileToggle.textContent=open?"CLOSE ARENA":"ARENA";
  };
  const onMobileToggle=()=>setMobileOpen(!section.classList.contains("is-mobile-open"));
  if(mobileToggle){
    mobileToggle.hidden=false;
    mobileToggle.addEventListener("click",onMobileToggle);
  }

  let mode="alltime", disposed=false;
  const expected=boardName=>({gameKey:GAME_KEY,board:boardName,challengeSlug:null});
  const show=()=>{
    if(disposed)return;
    alltime.setAttribute("aria-pressed",String(mode==="alltime"));
    challenge.setAttribute("aria-pressed",String(mode==="challenge"));
    // Never present scores from the unrelated Atlantis/Pantheon PRG backend
    // as scores from Sierra Online's CRT. Empty ranks are not fabricated.
    renderArenaBoard(board,normaliseArenaBoard({
      ok:true,gameKey:GAME_KEY,board:mode,challengeSlug:null,
      status:mode==="challenge"?"no-published-challenge":"unavailable",
      records:[]
    },expected(mode)),{mode});
  };
  alltime.addEventListener("click",()=>{mode="alltime";show();});
  challenge.addEventListener("click",()=>{mode="challenge";show();});
  show();
  return Object.freeze({
    observe(_ram) {
      // The CRT has no verified score/lives/game-over memory signature.
      // Intentionally never report an Atlantis PRG score for this edition.
    },
    invalidate() {
      if(disposed)return;
      local.textContent="—";
      hint.textContent="SESSION ENDED · NO SCORE RECORDED";
    },
    dispose() {
      if(disposed)return;
      disposed=true;
      setMobileOpen(false);
      mobileToggle?.removeEventListener("click",onMobileToggle);
      if(mobileToggle){
        mobileToggle.hidden=true;
        mobileToggle.setAttribute("aria-expanded","false");
        mobileToggle.textContent="ARENA";
      }
      stage.removeAttribute("data-ccg-arena-frame");
      section.remove();
      link.remove();
    }
  });
}
