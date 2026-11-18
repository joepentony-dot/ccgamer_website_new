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
import { readSierraCrossfireScreenScores } from "./arena/read-sierra-crossfire-screen-score.mjs";
import { SierraCrossfireLocalRunObserver } from "./arena/observe-sierra-crossfire-run.mjs";
import { isSierraOneClickLaunchQuery, SierraOneClickStarter } from "./arena/sierra-one-click-launch.mjs";

const STYLE_URL="/resources/css/ccg-high-score-arena-preview.css?ccg_rev=20261118_sierra_arena_layout_v2";
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
  entry, bytes, stage, doc=globalThis.document, subtle, isCurrent=()=>true,
  launchQuery="", startF1=null, releaseF1=null,
  scoreQuery="", websiteOrigin="", scoreFetchImpl=globalThis.fetch
}={}) {
  if(!stage || !doc?.createElement || !doc.head ||
     !(await verifyCrossfirePreviewMedia(entry,bytes,subtle??globalThis.crypto?.subtle)))return null;
  if(typeof isCurrent === "function" && !isCurrent()) return null;
  // Only a deliberate official-site Sierra deep link may request member
  // score transport; the server still independently admits every attempt.
  let scoreRequested=false;
  try {
    const q=new URLSearchParams(scoreQuery);
    scoreRequested=websiteOrigin==="https://www.cheekycommodoregamer.co.uk" &&
      q.getAll("scores").length===1 && q.get("scores")==="1" &&
      q.getAll("game").length===1 && q.get("game")===EXPECTED_CATALOG_ID;
  } catch { scoreRequested=false; }
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
  section.setAttribute("data-ccg-arena-mobile-status","compact");
  const intro=doc.createElement("div");
  intro.className="ccg-arena-preview__intro";
  const title=doc.createElement("h2");
  title.textContent="CROSSFIRE · HIGH SCORE ARENA";
  const notice=doc.createElement("p");
  notice.textContent=scoreRequested
    ? "SIERRA ONLINE CRT · HELIOHOST SUBMISSION REQUESTED"
    : "SIERRA ONLINE CRT · SCORE SUBMISSIONS DISABLED";
  intro.append(title,notice);
  const startHint=doc.createElement("p");
  startHint.className="ccg-arena-preview__start";
  startHint.textContent="PRESS F1 TO START";

  const modes=doc.createElement("div");
  modes.className="ccg-arena-preview__modes";
  modes.setAttribute("role","group");
  modes.setAttribute("aria-label","Leaderboard view");
  const alltime=doc.createElement("button");
  alltime.type="button";alltime.textContent="ALL-TIME";
  const challenge=doc.createElement("button");
  challenge.type="button";challenge.textContent="CHALLENGE";
  modes.append(alltime,challenge);
  // The existing Supabase website login does NOT create a HelioHost member
  // session. Provide an isolated, intentional sign-in path for Sierra scores.
  // The link is available inside the expanded mobile Arena, not over gameplay.
  if(scoreRequested){
    const scoreSignIn=doc.createElement("a");
    scoreSignIn.href="/auth/heliohost-score-login.html?returnTo="+encodeURIComponent(
      "/emulator/c64/?game="+EXPECTED_CATALOG_ID+"&autoplay=1&start=1&scores=1"
    );
    scoreSignIn.textContent="SIGN IN FOR SCORES";
    scoreSignIn.setAttribute("data-ccg-sierra-member-signin","true");
    modes.append(scoreSignIn);
  }

  const display=doc.createElement("div");
  display.className="ccg-arena-preview__display";
  const board=doc.createElement("div");
  board.className="ccg-arena-preview__board";
  const run=doc.createElement("div");
  run.className="ccg-arena-preview__run";
  const local=doc.createElement("strong");
  local.textContent="—";
  local.setAttribute("aria-label","Unverified current local score; not ranked");
  const hint=doc.createElement("p");
  hint.textContent="CRT SCORE DETECTION NOT YET VERIFIED";
  run.append(local,hint);
  const remoteHint=doc.createElement("p");
  remoteHint.className="ccg-arena-preview__submission";
  // Only display a submission status if explicitly requested on the official
  // website for this checksum-verified Sierra cartridge.
  if(scoreRequested){
    remoteHint.textContent="HELIOHOST SUBMISSION · CHECKING CONNECTION";
    run.append(remoteHint);
  }
  display.append(board,run);
  section.append(intro,startHint,modes,display);
  stage.setAttribute("data-ccg-arena-frame","crossfire");
  stage.insertAdjacentElement("afterend",section);

  const mobileConsole=stage.closest?.(".ccg-c64-console");
  const mobileToggle=mobileConsole?.querySelector?.("[data-mobile-arena-toggle]");
  const setMobileOpen=open=>{
    section.classList?.toggle?.("is-mobile-open",open);
    section.setAttribute("data-ccg-arena-mobile-status",open?"expanded":"compact");
    mobileConsole?.classList?.toggle?.("ccg-arena-mobile-open",open);
    mobileToggle?.setAttribute("aria-expanded",String(open));
    if(mobileToggle) mobileToggle.textContent=open?"CLOSE ARENA":"ARENA";
  };
  const onMobileToggle=()=>setMobileOpen(!section.classList.contains("is-mobile-open"));
  if(mobileToggle){
    mobileToggle.hidden=false;
    mobileToggle.addEventListener("click",onMobileToggle);
  }

  let mode="alltime", disposed=false, scoreBridge=null;
  let scoreGate=scoreRequested?"checking":"disabled";
  let scoreWaitFrames=0, scoreArmPending=false, resolveScoreReady=null;
  let scoreReadySettled=!scoreRequested;
  const scoreReadyPromise=scoreRequested
    ? new Promise(resolve=>{resolveScoreReady=resolve;}) : Promise.resolve(false);
  const finishScoreHandshake=state=>{
    if(scoreReadySettled)return;
    scoreReadySettled=true;
    scoreGate=state;
    resolveScoreReady?.(state==="ready");
  };
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
  alltime.addEventListener("click",()=>{
    mode="alltime";show();void scoreBridge?.loadBoard("alltime");
  });
  challenge.addEventListener("click",()=>{
    mode="challenge";show();void scoreBridge?.loadBoard("challenge");
  });
  show();
  // A server score session is opt-in and only belongs to the exact verified
  // Sierra CRT. The server independently checks member auth, CSRF, game state,
  // nonce and release switches; a browser can never approve its own score.
  if(scoreRequested) {
    void import("./arena/client/sierra-browser-score-bridge.mjs").then(mod=>{
      if(disposed || (typeof isCurrent==="function" && !isCurrent()) ||
         scoreGate!=="checking") {
        finishScoreHandshake("unavailable");
        return;
      }
      if(!mod.isSierraHelioHostScoreIntent(scoreQuery,websiteOrigin)) {
        remoteHint.textContent="INVALID HELIOHOST SCORE LINK";
        finishScoreHandshake("unavailable");
        return;
      }
      scoreBridge=new mod.SierraHelioHostScoreBridge({
        enabled:true,origin:websiteOrigin,fetchImpl:scoreFetchImpl,
        onStatus:value=>{
          if(disposed)return;
          remoteHint.textContent=value;
          if(value.startsWith("SCORE ") && value.includes("RECEIVED · PENDING REVIEW")){
            hint.textContent="GAME OVER · SCORE SUBMITTED FOR REVIEW";
          }
        },
        onBoard:(view,data)=>{
          if(!disposed && mode===view)renderArenaBoard(board,data,{mode});
        }
      });
      void scoreBridge.connect().then(connected=>{
        if(disposed)return finishScoreHandshake("unavailable");
        finishScoreHandshake(connected?"ready":"unavailable");
        // Manual F1 may have occurred while the dynamic import/authentication
        // was pending. Re-arm only when that SAME genuine game is still at 0.
        if(connected && scoreArmPending &&
           (localRun.phase==="armed" ||
            (localRun.phase==="running" && localRun.lastScore===0))) {
          scoreBridge.armed();
        } else if(connected && scoreArmPending) {
          remoteHint.textContent="CURRENT RUN LOCAL ONLY · HELIOHOST WAS NOT READY";
        }
      }).catch(()=>finishScoreHandshake("unavailable"));
    }).catch(()=>{
      if(!disposed)remoteHint.textContent="HELIOHOST UNAVAILABLE · SCORE LOCAL ONLY";
      finishScoreHandshake("unavailable");
    });
  }
  let lastVisibleScore=null;
  const localRun=new SierraCrossfireLocalRunObserver();
  // The only permitted automatic F1 is an explicit exact-edition deep link
  // after a successful independent Sierra cartridge SHA-256 verification.
  const autoStarter=isSierraOneClickLaunchQuery(launchQuery) &&
    typeof startF1==="function" && typeof releaseF1==="function"
      ? new SierraOneClickStarter({
          onArm:()=>{
            const started=localRun.armFromUserF1();
            if(started) {
              scoreArmPending=scoreRequested;
              if(scoreBridge?.connected)scoreBridge.armed();
            }
            return started;
          },
          canStart:()=>{
            if(!scoreRequested || scoreGate!=="checking")return true;
            // A slow/nonexistent auth server must not block offline play
            // indefinitely. After five seconds of *ready gameover* frames,
            // decline online submission and launch a local-only game.
            if(++scoreWaitFrames>=250) {
              remoteHint.textContent="HELIOHOST TIMED OUT · LOCAL GAME ONLY";
              scoreBridge?.stop();
              finishScoreHandshake("unavailable");
            }
            return scoreGate!=="checking";
          },
          onPress:startF1,
          onRelease:releaseF1
        }) : null;
  return Object.freeze({
    oneClickEnabled: Boolean(autoStarter),
    whenHelioHostReady() { return scoreReadyPromise; },
    cancelOneClick() { autoStarter?.cancel(); },
    armFromUserF1() {
      if(disposed)return false;
      const armed=localRun.armFromUserF1();
      if(armed) {
        hint.textContent="RUN START REQUESTED · LOCAL ONLY";
        scoreArmPending=scoreRequested;
        scoreBridge?.armed();
      }
      return armed;
    },
    observe(ram) {
      if(disposed)return;
      // Original Sierra cartridge was SHA verified during mount. Inspect only
      // emulator RAM; no member or score network traffic is ever initiated.
      const candidate=readSierraCrossfireScreenScores(ram);
      const completed=localRun.observe(ram);
      scoreBridge?.observe(localRun,completed);
      // Drive one user-requested F1 only from actual emulated PAL frames.
      autoStarter?.tick(ram);
      if(candidate && candidate.score!==lastVisibleScore) {
        lastVisibleScore=candidate.score;
        local.textContent=String(candidate.score).padStart(6,"0");
        hint.textContent="LIVE LOCAL SCORE · NOT VERIFIED OR SUBMITTED";
      }
      if(completed) {
        local.textContent=String(completed.score).padStart(6,"0");
        hint.textContent="GAME OVER · LOCAL FINAL · NOT SUBMITTED";
      }
    },
    invalidate() {
      if(disposed)return;
      autoStarter?.cancel();
      scoreBridge?.stop();
      finishScoreHandshake("unavailable");
      localRun.invalidate();
      lastVisibleScore=null;
      local.textContent="—";
      hint.textContent="SESSION ENDED · NO SCORE RECORDED";
    },
    dispose() {
      if(disposed)return;
      disposed=true;
      autoStarter?.cancel();
      scoreBridge?.stop();
      finishScoreHandshake("unavailable");
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
