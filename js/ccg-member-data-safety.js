/* ============================================================
   CCG MEMBER HUB — DATA SAFETY
   ------------------------------------------------------------
   Member accounts may download a CSV copy of their own profile
   and personal game records. JSON import/export controls are
   removed from the Member Hub so the master game archive cannot
   be mistaken for a member-editable file.
============================================================ */

(function () {
  "use strict";

  if (window.CCG_MEMBER_DATA_SAFETY_READY) return;
  window.CCG_MEMBER_DATA_SAFETY_READY = true;

  const LIBRARY_KEY = "ccgPersonalGameLibraryV1";
  const CSS_PATH = "/resources/css/member-data-safety.css";
  let queued = false;

  function isMemberHub() {
    return Boolean(
      document.getElementById("memberHub") ||
      document.documentElement.getAttribute("data-ccg-page") === "member-hub"
    );
  }

  function ensureCss() {
    if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function readLibrary() {
    try {
      const value = JSON.parse(localStorage.getItem(LIBRARY_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  }

  function csvCell(value) {
    const output = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
    return `"${output.replace(/"/g, '""')}"`;
  }

  function statValue(id) {
    return String(document.getElementById(id)?.textContent || "0").trim();
  }

  function profileRows() {
    const loyalty = document.getElementById("memberLoyaltyBadge");
    return [
      ["profile", "display_name", document.getElementById("displayName")?.textContent || "Member"],
      ["profile", "member_since", document.getElementById("joinDate")?.textContent || ""],
      ["profile", "preferred_system", document.getElementById("memberPreferredSystemLabel")?.textContent || "C64 & Amiga"],
      ["profile", "membership_month", loyalty?.dataset.memberMonth || ""],
      ["profile", "membership_badge", loyalty?.dataset.memberTier || ""],
      ["profile", "favourites", statValue("memberStatFavourites")],
      ["profile", "top_picks", statValue("memberStatTopPicks")],
      ["profile", "played", statValue("memberStatPlayed")],
      ["profile", "want_to_play", statValue("memberStatWant")],
      ["profile", "owned_as_a_kid", statValue("memberStatOwned")],
      ["profile", "still_own", statValue("memberStatStill")],
      ["profile", "exported_at", new Date().toISOString()]
    ];
  }

  function buildCsv() {
    const headers = [
      "record_type",
      "profile_field",
      "profile_value",
      "game_title",
      "game_slug",
      "system",
      "year",
      "lists",
      "custom_lists",
      "rating",
      "private_note",
      "updated_at"
    ];

    const rows = [headers];
    profileRows().forEach(([recordType, field, value]) => {
      rows.push([recordType, field, value, "", "", "", "", "", "", "", "", ""]);
    });

    Object.entries(readLibrary())
      .sort((a, b) => String(a[1]?.title || a[0]).localeCompare(String(b[1]?.title || b[0]), "en-GB"))
      .forEach(([slug, entry]) => {
        rows.push([
          "game",
          "",
          "",
          entry?.title || slug,
          slug,
          entry?.system || "",
          entry?.year || entry?.release_year || "",
          Array.isArray(entry?.lists) ? entry.lists : [],
          Array.isArray(entry?.customLists) ? entry.customLists : (Array.isArray(entry?.custom_lists) ? entry.custom_lists : []),
          entry?.rating || "",
          entry?.note || "",
          entry?.updatedAt || entry?.updated_at || ""
        ]);
      });

    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  function downloadCsv() {
    const blob = new Blob([buildCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ccg-member-profile-and-games-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);

    const status = document.getElementById("memberLibrarySyncStatus") || document.getElementById("profileMessage");
    if (status) {
      status.textContent = "Your profile and personal game records were downloaded as CSV.";
      status.dataset.state = "synced";
    }
  }

  function removeJsonControls() {
    [
      "importPersonalLibraryButton",
      "importPersonalLibraryFile",
      "exportPersonalLibraryCsv"
    ].forEach((id) => document.getElementById(id)?.remove());

    document.querySelectorAll('#personalGameLibrary input[type="file"][accept*="json" i]').forEach((input) => input.remove());
  }

  function ensureSafeExportButton() {
    const section = document.getElementById("personalGameLibrary");
    const actions = section?.querySelector(".profile-library__actions");
    if (!section || !actions) return;

    let button = document.getElementById("downloadMemberProfileCsv");
    const oldExport = document.getElementById("exportPersonalLibrary");

    if (!button && oldExport) {
      button = oldExport.cloneNode(false);
      button.id = "downloadMemberProfileCsv";
      button.textContent = "Download Profile & Games CSV";
      oldExport.replaceWith(button);
    }

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "auth-btn";
      button.id = "downloadMemberProfileCsv";
      button.textContent = "Download Profile & Games CSV";
      actions.insertBefore(button, document.getElementById("clearPersonalLibrary") || null);
    }

    if (button.dataset.ccgSafeExportBound !== "true") {
      button.dataset.ccgSafeExportBound = "true";
      button.addEventListener("click", downloadCsv);
    }

    let note = section.querySelector(".member-data-safety-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "member-data-safety-note";
      actions.appendChild(note);
    }
    note.innerHTML = "<strong>Member data safety:</strong> this page exports only your own profile and personal game records as CSV. Master archive JSON cannot be imported or exported here.";
  }

  function enforce() {
    queued = false;
    if (!isMemberHub()) return;
    ensureCss();
    removeJsonControls();
    ensureSafeExportButton();
  }

  function queueEnforce() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(enforce);
  }

  function init() {
    if (!isMemberHub()) return;
    enforce();
    const root = document.getElementById("memberHub") || document.body;
    new MutationObserver(queueEnforce).observe(root, { childList: true, subtree: true });
    setTimeout(enforce, 500);
    setTimeout(enforce, 1600);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
