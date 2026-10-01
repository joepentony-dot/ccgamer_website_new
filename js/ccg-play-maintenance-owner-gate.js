/* CCG owner + tester-code preview gate for C64 Dungeon Carnage.
 *
 * Production remains closed to ordinary visitors while maintenance is active.
 * The signed-in Cheeky Commodore Gamer admin profile is allowed through,
 * assigned website-member playtesters are admitted from their normal account,
 * and invited testers can unlock the browser build with the current tester code.
 *
 * Tester-code authorization is server-verifiable: sessionStorage may retain the
 * entered code for this tab, but every restore is revalidated by Supabase.
 */
(function () {
  "use strict";

  const PROD_HOSTS = new Set(["www.cheekycommodoregamer.co.uk", "cheekycommodoregamer.co.uk"]);
  const MAINTENANCE_DESTINATION = "/games/ccg-games/";
  const OWNER_USERNAME = "cheekycommodoregamer";
  const OWNER_DISPLAY_NAME = "cheeky commodore gamer";
  const OWNER_ROLE = "admin";
  const AUTH_TIMEOUT_MS = 5000;
  const TESTER_SESSION_KEY = "ccg_dungeon_carnage_tester_code_v2";

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

  function readTesterSessionCode() {
    try {
      return String(sessionStorage.getItem(TESTER_SESSION_KEY) || "");
    } catch (_error) {
      return "";
    }
  }

  function rememberTesterSessionCode(value) {
    try {
      sessionStorage.setItem(TESTER_SESSION_KEY, normalise(value));
    } catch (_error) {}
  }

  function clearTesterSessionCode() {
    try {
      sessionStorage.removeItem(TESTER_SESSION_KEY);
    } catch (_error) {}
  }

  function dispatchAllowed(access) {
    window.dispatchEvent(new CustomEvent("ccg:play-maintenance-access-granted", {
      detail: { allowed: true, access: access }
    }));
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

  async function isValidTesterCode(value) {
    const candidate = String(value || "").trim();
    if (candidate.length < 4 || candidate.length > 128) return false;

    const client = await getSupabaseClient();
    if (!client || typeof client.rpc !== "function") return false;

    try {
      const result = await client.rpc("ccg_validate_dungeon_carnage_tester_code", {
        p_code: candidate
      });
      return !result?.error && result?.data === true;
    } catch (_error) {
      return false;
    }
  }

  async function validateTesterCodeWithTimeout(value) {
    let timeoutId = 0;
    try {
      const timeout = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve(false), AUTH_TIMEOUT_MS);
      });
      return await Promise.race([isValidTesterCode(value), timeout]);
    } catch (_error) {
      return false;
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }
  }

  function removeTesterGate() {
    const gate = document.getElementById("ccg-tester-access-gate");
    if (gate) gate.remove();
    if (document.documentElement.dataset.ccgTesterOverflowLock === "1") {
      document.documentElement.style.overflow = "";
      delete document.documentElement.dataset.ccgTesterOverflowLock;
    }
  }

  function showTesterGate() {
    mark("tester-code-required");
    if (document.getElementById("ccg-tester-access-gate")) return;

    const gate = document.createElement("div");
    gate.id = "ccg-tester-access-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "ccg-tester-access-title");
    gate.innerHTML = [
      '<style>',
      '#ccg-tester-access-gate{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 18%,rgba(64,35,95,.48),rgba(4,3,10,.97) 58%);font-family:Arial,sans-serif;color:#fff;}',
      '#ccg-tester-access-gate *{box-sizing:border-box;}',
      '#ccg-tester-access-card{width:min(520px,100%);border:1px solid rgba(193,132,255,.68);border-radius:16px;padding:28px;background:linear-gradient(180deg,rgba(22,12,35,.98),rgba(8,5,15,.99));box-shadow:0 28px 80px rgba(0,0,0,.58),0 0 42px rgba(149,74,219,.16);text-align:center;}',
      '#ccg-tester-access-card .ccg-kicker{display:block;margin-bottom:8px;color:#d7a8ff;font-size:12px;font-weight:800;letter-spacing:.18em;}',
      '#ccg-tester-access-card h1{margin:0 0 10px;font-size:clamp(26px,6vw,38px);line-height:1.02;text-transform:uppercase;}',
      '#ccg-tester-access-card p{margin:0 0 20px;color:#d4cee0;line-height:1.55;}',
      '#ccg-tester-access-form{display:grid;gap:12px;text-align:left;}',
      '#ccg-tester-access-form label{font-size:12px;font-weight:800;letter-spacing:.12em;color:#cbb7dc;}',
      '#ccg-tester-access-code{width:100%;border:1px solid #69448a;border-radius:9px;padding:14px 15px;background:#09060f;color:#fff;font:700 17px/1.2 monospace;outline:none;}',
      '#ccg-tester-access-code:focus{border-color:#c389f0;box-shadow:0 0 0 3px rgba(195,137,240,.14);}',
      '#ccg-tester-access-submit{border:0;border-radius:9px;padding:14px 18px;background:#9c5ed0;color:#fff;font-weight:900;letter-spacing:.06em;cursor:pointer;}',
      '#ccg-tester-access-submit:disabled{opacity:.55;cursor:wait;}',
      '#ccg-tester-access-error{min-height:20px;margin:0;color:#ff9f9f;font-size:13px;font-weight:700;text-align:center;}',
      '#ccg-tester-access-exit{display:inline-block;margin-top:14px;color:#bcaacb;font-size:13px;text-decoration:none;}',
      '#ccg-tester-access-exit:hover{text-decoration:underline;}',
      '</style>',
      '<div id="ccg-tester-access-card">',
      '<span class="ccg-kicker">CHEEKY COMMODORE GAMER</span>',
      '<h1 id="ccg-tester-access-title">C64 Dungeon Carnage</h1>',
      '<p>This beta build is currently available to assigned CCG website members and invited testers. Signed-in playtesters are admitted automatically; otherwise enter your tester access code.</p>',
      '<form id="ccg-tester-access-form" autocomplete="off">',
      '<label for="ccg-tester-access-code">TESTER ACCESS CODE</label>',
      '<input id="ccg-tester-access-code" name="ccg-tester-access-code" type="password" inputmode="text" autocapitalize="none" spellcheck="false" autocomplete="off" required>',
      '<button id="ccg-tester-access-submit" type="submit">ENTER DUNGEON</button>',
      '<p id="ccg-tester-access-error" role="alert" aria-live="polite"></p>',
      '</form>',
      '<a id="ccg-tester-access-exit" href="' + MAINTENANCE_DESTINATION + '">Return to CCG Games</a>',
      '</div>'
    ].join("");

    document.documentElement.dataset.ccgTesterOverflowLock = "1";
    document.documentElement.style.overflow = "hidden";
    (document.body || document.documentElement).appendChild(gate);

    const form = gate.querySelector("#ccg-tester-access-form");
    const input = gate.querySelector("#ccg-tester-access-code");
    const submit = gate.querySelector("#ccg-tester-access-submit");
    const error = gate.querySelector("#ccg-tester-access-error");

    gate.addEventListener("keydown", (event) => event.stopPropagation());
    gate.addEventListener("keyup", (event) => event.stopPropagation());

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      error.textContent = "";

      const candidate = input.value;
      const valid = await validateTesterCodeWithTimeout(candidate);
      if (!valid) {
        mark("tester-code-rejected");
        error.textContent = "That tester code is not recognised.";
        input.select();
        submit.disabled = false;
        return;
      }

      rememberTesterSessionCode(candidate);
      removeTesterGate();
      mark("tester-preview");
      dispatchAllowed("tester");
    });

    window.setTimeout(() => input.focus(), 0);
  }

  async function checkAccess() {
    if (!isProduction()) {
      mark("development");
      dispatchAllowed("development");
      return;
    }

    const storedTesterCode = readTesterSessionCode();
    if (storedTesterCode) {
      mark("checking-tester");
      if (await validateTesterCodeWithTimeout(storedTesterCode)) {
        mark("tester-preview");
        dispatchAllowed("tester");
        return;
      }
      clearTesterSessionCode();
    }

    mark(snapshotOwnerHint() ? "checking-owner" : "checking");

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
      // Account resolution failed; invited testers can still use the code gate.
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }

    showTesterGate();
  }

  window.CCGPlayMaintenanceOwnerGate = Object.freeze({
    check: checkAccess,
    isOwnerProfile: isOwnerProfile,
    isValidTesterCode: isValidTesterCode,
    validateTesterCodeWithTimeout: validateTesterCodeWithTimeout,
    resolveAccountAccess: resolveAccountAccess,
    maintenanceDestination: MAINTENANCE_DESTINATION
  });

  void checkAccess();
})();
