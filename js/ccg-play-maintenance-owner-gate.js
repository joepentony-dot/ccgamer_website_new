/* CCG owner-only maintenance preview gate for C64 Dungeon Carnage.
 *
 * Production remains closed to ordinary visitors while maintenance is active.
 * The signed-in Cheeky Commodore Gamer admin profile is allowed through so the
 * live R51 build can be acceptance-tested without reopening the game publicly.
 */
(function () {
  "use strict";

  const PROD_HOSTS = new Set(["www.cheekycommodoregamer.co.uk", "cheekycommodoregamer.co.uk"]);
  const MAINTENANCE_DESTINATION = "/games/ccg-games/";
  const OWNER_USERNAME = "cheekycommodoregamer";
  const OWNER_DISPLAY_NAME = "cheeky commodore gamer";
  const OWNER_ROLE = "admin";
  const AUTH_TIMEOUT_MS = 5000;

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

  function redirectToMaintenance() {
    mark("blocked");
    if (window.location.pathname === MAINTENANCE_DESTINATION) return;
    window.location.replace(MAINTENANCE_DESTINATION);
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

  async function resolveProfile() {
    if (!window.ccgSupabase || typeof window.ccgSupabase.getClient !== "function") return null;
    const client = await window.ccgSupabase.getClient();
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

    const profileResult = await client
      .from("profiles")
      .select("username, display_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult?.error) return null;
    return profileResult?.data || null;
  }

  function isOwnerProfile(profile) {
    if (!profile) return false;
    return normalise(profile.username) === OWNER_USERNAME
      && normalise(profile.display_name) === OWNER_DISPLAY_NAME
      && normalise(profile.role) === OWNER_ROLE;
  }

  async function checkOwner() {
    if (!isProduction()) {
      mark("development");
      return;
    }

    mark(snapshotOwnerHint() ? "checking-owner" : "checking");

    let timeoutId = 0;
    try {
      const timeout = new Promise((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), AUTH_TIMEOUT_MS);
      });
      const profile = await Promise.race([resolveProfile(), timeout]);

      if (isOwnerProfile(profile)) {
        mark("owner-preview");
        window.dispatchEvent(new CustomEvent("ccg:play-maintenance-owner-preview", {
          detail: { allowed: true }
        }));
        return;
      }
    } catch (_error) {
      // Fail closed: maintenance stays in force for every unresolved visitor.
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
    }

    redirectToMaintenance();
  }

  window.CCGPlayMaintenanceOwnerGate = Object.freeze({
    check: checkOwner,
    isOwnerProfile: isOwnerProfile,
    maintenanceDestination: MAINTENANCE_DESTINATION
  });

  void checkOwner();
})();
