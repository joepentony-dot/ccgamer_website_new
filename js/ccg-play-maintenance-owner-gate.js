/* CCG owner/member gate + server-validated public 24-hour playtest pass.
 *
 * Production remains protected by default. Owner and eligible member access
 * continue to work, while the current public share token can temporarily admit
 * anyone for one shared 24-hour window. The public window is enforced by
 * Supabase and begins on the first successful token validation.
 */
(function () {
  "use strict";

  const PROD_HOSTS = new Set(["www.cheekycommodoregamer.co.uk", "cheekycommodoregamer.co.uk"]);
  const MAINTENANCE_DESTINATION = "/games/ccg-games/";
  const OWNER_USERNAME = "cheekycommodoregamer";
  const OWNER_DISPLAY_NAME = "cheeky commodore gamer";
  const OWNER_ROLE = "admin";
  const AUTH_TIMEOUT_MS = 5000;
  const PUBLIC_PLAYTEST_PARAM = "playtest";
  const PUBLIC_PLAYTEST_SESSION_KEY = "ccg_dungeon_public_playtest_token";
  const PROTECTED_RUNTIME_TYPE = "application/ccg-protected-runtime";
  let runtimeAccessGranted = false;
  let runtimeBoundaryReached = false;
  let parserBoundaryEligible = false;
  let runtimeParserResolve = null;
  let runtimeBootPromise = null;

  function normalise(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isProduction() {
    return PROD_HOSTS.has(normalise(window.location.hostname));
  }

  function mark(state) {
    if (!document.documentElement) return;
    document.documentElement.dataset.ccgPlayMaintenanceGate = state;
    if (document.body) document.body.dataset.ccgPlayMaintenanceGate = state;
  }

  function dispatchAllowed(access) {
    runtimeAccessGranted = true;
    window.dispatchEvent(new CustomEvent("ccg:play-maintenance-access-granted", {
      detail: { allowed: true, access: access }
    }));
    startProtectedRuntimeWhenReady();
  }

  function startProtectedRuntimeWhenReady() {
    if (!runtimeAccessGranted || !runtimeBoundaryReached) return;

    void bootstrapProtectedRuntime().catch((error) => {
      mark("runtime-load-failed");
      try { console.error("[CCG] Dungeon protected runtime failed to start.", error); } catch (_error) {}
    });
  }

  function runtimeBoundaryReady() {
    runtimeBoundaryReached = true;
    parserBoundaryEligible = document.readyState === "loading"
      && Boolean(document.currentScript?.hasAttribute?.("data-ccg-runtime-boundary"));
    startProtectedRuntimeWhenReady();
    return true;
  }

  function finishRuntimeBoot() {
    mark("runtime-started");
    window.dispatchEvent(new CustomEvent("ccg:protected-dungeon-runtime-started", {
      detail: { allowed: true }
    }));
    const resolve = runtimeParserResolve;
    runtimeParserResolve = null;
    if (resolve) resolve(true);
    return true;
  }

  function runtimeParserBootComplete() {
    return finishRuntimeBoot();
  }

  function bootstrapProtectedRuntimeDuringParse(placeholders) {
    const escapeAttribute = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");

    const markup = placeholders.map((placeholder) => {
      const attrs = Array.from(placeholder.attributes)
        .filter((attribute) => attribute.name !== "type" && attribute.name !== "data-ccg-protected-runtime")
        .map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`)
        .join("");
      const inline = placeholder.getAttribute("src") ? "" : (placeholder.textContent || "");
      return `<script${attrs}>${inline}<\/script>`;
    }).join("\n");

    placeholders.forEach((placeholder) => placeholder.remove());
    document.write(markup + "\n<script>window.CCGPlayMaintenanceOwnerGate?.runtimeParserBootComplete?.();<\/script>");
  }

  function bootstrapProtectedRuntime() {
    if (!runtimeAccessGranted) {
      return Promise.reject(new Error("Dungeon runtime access has not been validated."));
    }
    if (runtimeBootPromise) return runtimeBootPromise;

    runtimeBootPromise = (async () => {
      mark("runtime-loading");
      const domReadyAlreadyFired = document.readyState !== "loading";
      const placeholders = Array.from(
        document.querySelectorAll('script[data-ccg-protected-runtime][type="' + PROTECTED_RUNTIME_TYPE + '"]')
      );

      if (parserBoundaryEligible && document.readyState === "loading") {
        runtimeBootPromise = new Promise((resolve, reject) => {
          runtimeParserResolve = resolve;
          try {
            bootstrapProtectedRuntimeDuringParse(placeholders);
          } catch (error) {
            runtimeParserResolve = null;
            reject(error);
          }
        });
        return runtimeBootPromise;
      }
      const sourceName = (node) => {
        const raw = String(node?.getAttribute?.("src") || "");
        return raw.split("?")[0].split("/").pop() || "";
      };
      // These scripts were historically parser-loaded before DOMContentLoaded.
      // When the protected runtime starts after access has been validated, they
      // must not observe an already-ready document until the canonical game
      // core has been materialised. Otherwise version/bootstrap/watchdog work
      // can race ahead of game-core.js and execute modules before UI/net exist.
      const deferredUntilCore = ["version-check.js","v10-41-cache-guard.js","v10-41-load-watchdog.js","v10-23-tutorial-guidance.js"];
      const gameMainIndex = placeholders.findIndex((node) => sourceName(node) === "game-main.js");
      let orderedPlaceholders = placeholders;
      if (domReadyAlreadyFired && gameMainIndex >= 0) {
        const deferredSet = new Set(deferredUntilCore);
        const throughGameMain = placeholders.slice(0, gameMainIndex + 1).filter((node) => !deferredSet.has(sourceName(node)));
        const deferredNodes = deferredUntilCore.map((name) => placeholders.find((node) => sourceName(node) === name)).filter(Boolean);
        const afterGameMain = placeholders.slice(gameMainIndex + 1);
        orderedPlaceholders = [...throughGameMain, ...deferredNodes, ...afterGameMain];
      }

      for (const placeholder of orderedPlaceholders) {
        const script = document.createElement("script");
        for (const attribute of Array.from(placeholder.attributes)) {
          if (attribute.name === "type" || attribute.name === "data-ccg-protected-runtime") continue;
          script.setAttribute(attribute.name, attribute.value);
        }

        if (placeholder.src || placeholder.getAttribute("src")) {
          script.async = false;
          const loaded = new Promise((resolve, reject) => {
            script.addEventListener("load", resolve, { once: true });
            script.addEventListener("error", () => reject(new Error(
              "Failed to load protected Dungeon runtime script: " + (placeholder.getAttribute("src") || "")
            )), { once: true });
          });
          placeholder.replaceWith(script);
          await loaded;
        } else {
          script.textContent = placeholder.textContent || "";
          placeholder.replaceWith(script);
        }
      }

      // The protected runtime is intentionally materialised only after access
      // has been validated. When that happens after the parser's real
      // DOMContentLoaded event, legacy Dungeon modules that correctly register
      // DOM-ready initialisers still need one deterministic post-bootstrap
      // readiness pass. This preserves their original startup contract without
      // starting any runtime code before authorization.
      if (domReadyAlreadyFired) {
        document.dispatchEvent(new Event("DOMContentLoaded"));
      }

      return finishRuntimeBoot();
    })();

    return runtimeBootPromise;
  }

  function snapshotOwnerHint() {
    try {
      const raw = sessionStorage.getItem("ccg_header_auth_snapshot");
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      return snapshot?.loggedIn === true && normalise(snapshot.username) === OWNER_DISPLAY_NAME;
    } catch (_error) {
      return false;
    }
  }

  async function getSupabaseClient() {
    if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== "function") return null;
    try {
      return await window.ccgSupabase.getClient();
    } catch (_error) {
      return null;
    }
  }

  function publicPlaytestToken() {
    let token = "";
    try {
      token = new URLSearchParams(window.location.search).get(PUBLIC_PLAYTEST_PARAM) || "";
      token = String(token).trim();
      if (token) sessionStorage.setItem(PUBLIC_PLAYTEST_SESSION_KEY, token);
      if (!token) token = String(sessionStorage.getItem(PUBLIC_PLAYTEST_SESSION_KEY) || "").trim();
    } catch (_error) {
      token = "";
    }
    return token;
  }

  async function resolvePublicPlaytestAccess() {
    const token = publicPlaytestToken();
    if (!token) return null;

    const client = await getSupabaseClient();
    if (!client || typeof client.rpc !== "function") return null;

    try {
      const result = await client.rpc("ccg_validate_dungeon_carnage_public_playtest", {
        p_token: token
      });
      if (result?.error) return { allowed: false, reason: "validation_error" };
      const data = result?.data;
      if (data && typeof data === "object") return data;
      return { allowed: data === true, reason: data === true ? "public_24h_playtest" : "invalid_or_expired" };
    } catch (_error) {
      return { allowed: false, reason: "validation_error" };
    }
  }

  async function resolveAccountAccess() {
    const client = await getSupabaseClient();
    if (!client?.auth) return null;

    const sessionResult = await client.auth.getSession();
    const session = sessionResult?.data?.session || null;
    if (!session?.user?.id) return null;

    let user = session.user;
    try {
      const userResult = await client.auth.getUser();
      user = userResult?.data?.user || user;
    } catch (_error) {}

    if (!user?.id) return null;

    const [profileResult, playtestResult] = await Promise.all([
      client
        .from("profiles")
        .select("username, display_name, role, is_admin, banned")
        .eq("id", user.id)
        .maybeSingle(),
      client.rpc("ccg_has_dungeon_carnage_playtest_access")
    ]);

    return {
      profile: profileResult?.error ? null : (profileResult?.data || null),
      memberPlaytester: playtestResult?.error ? false : playtestResult?.data === true
    };
  }

  function isOwnerProfile(profile) {
    if (!profile) return false;
    return normalise(profile.username) === OWNER_USERNAME
      && normalise(profile.display_name) === OWNER_DISPLAY_NAME
      && normalise(profile.role) === OWNER_ROLE
      && profile.is_admin === true
      && profile.banned !== true;
  }

  function showMemberGate(publicReason = "") {
    const publicEnded = publicReason === "expired";
    mark(publicEnded ? "public-playtest-expired" : "round2-member-required");
    if (document.getElementById("ccg-member-beta-access-gate")) return;

    const gate = document.createElement("div");
    gate.id = "ccg-member-beta-access-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "ccg-member-beta-access-title");
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    gate.innerHTML = [
      '<style>',
      '#ccg-member-beta-access-gate{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 18%,rgba(64,35,95,.48),rgba(4,3,10,.97) 58%);font-family:Arial,sans-serif;color:#fff;}',
      '#ccg-member-beta-access-gate *{box-sizing:border-box;}',
      '#ccg-member-beta-access-card{width:min(560px,100%);border:1px solid rgba(193,132,255,.68);border-radius:16px;padding:28px;background:linear-gradient(180deg,rgba(22,12,35,.98),rgba(8,5,15,.99));box-shadow:0 28px 80px rgba(0,0,0,.58),0 0 42px rgba(149,74,219,.16);text-align:center;}',
      '#ccg-member-beta-access-card .ccg-kicker{display:block;margin-bottom:8px;color:#d7a8ff;font-size:12px;font-weight:800;letter-spacing:.18em;}',
      '#ccg-member-beta-access-card h1{margin:0 0 10px;font-size:clamp(26px,6vw,38px);line-height:1.02;text-transform:uppercase;}',
      '#ccg-member-beta-access-card p{margin:0 0 16px;color:#d4cee0;line-height:1.55;}',
      '#ccg-member-beta-access-card .ccg-round2-note{padding:12px;border:1px solid rgba(215,168,255,.25);border-radius:9px;background:rgba(215,168,255,.06);}',
      '#ccg-member-beta-access-card .ccg-actions{display:grid;gap:10px;margin-top:18px;}',
      '#ccg-member-beta-access-card a{display:block;border-radius:9px;padding:13px 16px;text-decoration:none;font-weight:900;}',
      '#ccg-member-beta-signin{background:#9c5ed0;color:#fff;}',
      '#ccg-member-beta-exit{border:1px solid rgba(255,255,255,.18);color:#d4cee0;}',
      '</style>',
      '<div id="ccg-member-beta-access-card">',
      '<span class="ccg-kicker">C64 DUNGEON CARNAGE · PLAYTEST</span>',
      '<h1 id="ccg-member-beta-access-title">' + (publicEnded ? '24-Hour Playtest Ended' : 'Current Members Only') + '</h1>',
      '<p>' + (publicEnded ? 'This public YouTube playtest link has completed its shared 24-hour test window.' : 'The public game remains protected outside an active share window.') + '</p>',
      '<p class="ccg-round2-note">' + (publicEnded ? 'The same link cannot restart or extend the timer. Owner and currently eligible member access remain separately protected.' : 'Sign in if you already have assigned member access.') + '</p>',
      '<div class="ccg-actions">',
      '<a id="ccg-member-beta-signin" href="/auth/login.html?returnTo=' + returnTo + '">SIGN IN AS AN ASSIGNED MEMBER</a>',
      '<a id="ccg-member-beta-exit" href="' + MAINTENANCE_DESTINATION + '">Return to CCG Games</a>',
      '</div>',
      '</div>'
    ].join("");

    document.documentElement.style.overflow = "hidden";
    (document.body || document.documentElement).appendChild(gate);
    gate.addEventListener("keydown", (event) => event.stopPropagation());
    gate.addEventListener("keyup", (event) => event.stopPropagation());
  }

  async function checkAccess() {
    if (!isProduction()) {
      mark("development");
      dispatchAllowed("development");
      return;
    }

    mark(snapshotOwnerHint() ? "checking-owner" : "checking");

    const sharedToken = publicPlaytestToken();
    let publicReason = "";
    if (sharedToken) {
      let publicTimeoutId = 0;
      try {
        const timeout = new Promise((resolve) => {
          publicTimeoutId = window.setTimeout(() => resolve(null), AUTH_TIMEOUT_MS);
        });
        const access = await Promise.race([resolvePublicPlaytestAccess(), timeout]);
        if (access?.allowed === true) {
          mark("public-24h-playtest");
          window.dispatchEvent(new CustomEvent("ccg:public-playtest-access-granted", {
            detail: { allowed: true, expiresAt: access.expires_at || null }
          }));
          dispatchAllowed("public-24h-playtest");
          return;
        }
        publicReason = String(access?.reason || "");
      } catch (_error) {
        publicReason = "validation_error";
      } finally {
        if (publicTimeoutId) window.clearTimeout(publicTimeoutId);
      }
    }

    let timeoutId = 0;
    try {
      const timeout = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), AUTH_TIMEOUT_MS);
      });
      const access = await Promise.race([resolveAccountAccess(), timeout]);

      if (isOwnerProfile(access?.profile)) {
        mark("owner-preview");
        window.dispatchEvent(new CustomEvent("ccg:play-maintenance-owner-preview", {
          detail: { allowed: true }
        }));
        dispatchAllowed("owner");
        return;
      }

      if (access?.memberPlaytester === true) {
        mark("member-playtester");
        dispatchAllowed("member-playtester");
        return;
      }
    } catch (_error) {
      // Account resolution failed; protected runtime remains closed.
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }

    showMemberGate(publicReason === "expired" ? "expired" : "");
  }

  window.CCGPlayMaintenanceOwnerGate = Object.freeze({
    check: checkAccess,
    isOwnerProfile: isOwnerProfile,
    resolveAccountAccess: resolveAccountAccess,
    resolvePublicPlaytestAccess: resolvePublicPlaytestAccess,
    publicPlaytestToken: publicPlaytestToken,
    maintenanceDestination: MAINTENANCE_DESTINATION,
    runtimeBoundaryReady: runtimeBoundaryReady,
    runtimeParserBootComplete: runtimeParserBootComplete
  });

  void checkAccess();
})();
