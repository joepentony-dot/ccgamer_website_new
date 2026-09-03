# The Lost Sizzler — Desktop Delivery Contract

This document defines the boundary between the shared Lost Sizzler web game and a future downloadable Windows wrapper.

It is intentionally framework-neutral. Electron, Tauri, WebView2 or another desktop shell may be chosen later, but the game must continue to use one shared codebase and the wrapper must satisfy this contract.

## Architectural rule

**Offline game first; online enhancements second.**

The packaged game must be able to launch, start Solo, run the Tutorial, use 2P Split Screen, save locally, continue a saved Solo run and retain local achievements/progression with networking disabled before the process starts.

The desktop wrapper must not create a second fork of Lost Sizzler gameplay code.

## Injection timing

When a desktop build is used, the wrapper must inject `window.__CCG_LOST_SIZZLER_DELIVERY__` **before** `arcade/lost-sizzler/js/online-services-gate.js` executes.

The page must never boot in `web` mode and then be switched to desktop mode afterward. Delivery mode is a startup property.

Minimal offline example:

```js
window.__CCG_LOST_SIZZLER_DELIVERY__ = {
  mode: "desktop-offline",
  resolveLocalAsset(relativePath, meta) {
    return resolvePackagedAsset(relativePath, meta);
  },
  openExternal(url, meta) {
    return openInSystemBrowser(url, meta);
  },
  exitGame() {
    return requestNativeExit();
  }
};
```

Minimal online example:

```js
window.__CCG_LOST_SIZZLER_DELIVERY__ = {
  mode: "desktop-online",
  resolveLocalAsset(relativePath, meta) {
    return resolvePackagedAsset(relativePath, meta);
  },
  openExternal(url, meta) {
    return openInSystemBrowser(url, meta);
  },
  exitGame() {
    return requestNativeExit();
  },
  onlineScripts: {
    config: "app://lost-sizzler/online/ccg-supabase-config.js",
    client: "app://lost-sizzler/online/ccg-supabase-client.js"
  }
};
```

The example scheme is illustrative only. The final wrapper may use a custom scheme, a stable local HTTP origin or an injected service bridge.

## Required delivery modes

### `web`

Normal website behaviour.

- No wrapper object is required.
- Online services remain lazy and load only after a deliberate online-feature request.
- Website navigation behaves normally.
- Generic sharing may use the current page URL.

### `desktop-offline`

Guaranteed offline-capable desktop mode.

- Supabase activation is refused.
- Any `window.ccgSupabase` bridge that was accidentally injected before game boot must be quarantined and replaced by the offline null-client boundary; the injected bridge's original `getClient()` must not be consulted.
- Weekly Vault, online multiplayer and website-account controls remain unavailable.
- Solo, Tutorial, 2P Split Screen, local saves, achievements, permanent collection and dossier state remain available.
- No website-root Supabase scripts may be loaded.
- No website link may replace the game inside the desktop window.
- Generic Share must expose the public CCG Lost Sizzler URL rather than an internal packaged URL.

### `desktop-online`

Desktop build with optional online services.

- Local gameplay remains authoritative and must continue when the network or account service is unavailable.
- Online services may use an already-injected `window.ccgSupabase` bridge or wrapper-supplied local online-service script locations.
- Desktop mode must not silently inherit website-root `/js/ccg-supabase-*.js` paths.
- Account links and other external links must open in the system browser.
- Multiplayer invite links must use the public CCG Lost Sizzler URL while preserving the `room` and `mode` query parameters.

## Wrapper API

### `mode`

Required string for desktop builds.

Accepted values:

- `desktop-offline`
- `desktop-online`

Unknown values must not be used by the wrapper.

### `resolveLocalAsset(relativePath, meta)`

Recommended for packaged builds.

Purpose:

- resolve release metadata such as `version.json` without assuming website hosting;
- resolve the packaged C64 collectible catalogue without assuming website-root `/games/` routing;
- provide stable packaged URLs that the renderer can fetch;
- keep asset resolution independent from the application installation directory.

Current required calls:

```text
resolveLocalAsset("version.json", { kind: "version-manifest" })
resolveLocalAsset("games/games.json", { kind: "collectible-catalogue" })
```

The returned values must be fetchable by the renderer under the wrapper's security model.

If this function is not supplied, `versionManifestUrl` and `catalogueUrl` may be provided separately for their respective resources.

### `versionManifestUrl`

Optional explicit packaged URL for `version.json`.

A desktop build with neither `resolveLocalAsset()` nor `versionManifestUrl` must treat version-manifest fetching as unconfigured rather than falling back to an accidental website or `file://` assumption.

### `catalogueUrl`

Optional explicit packaged URL for the Lost Sizzler collectible catalogue when `resolveLocalAsset()` is not supplied.

The URL must resolve to the packaged C64 catalogue input (normally `games/games.json`, or an approved generated C64-only derivative). It must not turn the downloadable build into a hidden dependency on the live website catalogue.

A desktop build with neither `resolveLocalAsset()` nor `catalogueUrl` may continue running with the built-in C64 fallback pool, but that state is **not downloadable-build release acceptance**: the intended full packaged collectible catalogue is unavailable and must be treated as a release defect before distribution.

### `openExternal(url, meta)`

Required if the desktop build exposes website/support/account links.

The wrapper must:

1. parse the URL itself;
2. accept only approved `https:` destinations;
3. reject `file:`, `javascript:`, `data:` and unknown/custom destinations supplied by page content;
4. open accepted URLs in the operating system's default browser;
5. never navigate the Lost Sizzler desktop window to the external destination.

The current game may request CCG website/account destinations and existing support destinations such as Patreon, YouTube and PayPal. The final wrapper should implement an explicit host allowlist rather than a general-purpose shell-open function.

`meta.reason` is advisory context such as `account-auth` or `external-link`. It must not be treated as authorization by itself.

### `exitGame()`

Required for desktop builds that expose Exit/QUIT.

The wrapper must close or request closure of the application through a narrow native bridge. It must not translate Exit into website navigation.

The game must remain in place if the wrapper cannot perform the exit.

### `onlineScripts`

Optional and valid only for `desktop-online`.

Shape:

```js
onlineScripts: {
  config: "<packaged/local config script URL>",
  client: "<packaged/local client script URL>"
}
```

These URLs should resolve to packaged/local resources. Do not make the downloadable build depend on loading the website's Supabase bootstrap JavaScript over the network.

A narrower injected `window.ccgSupabase` bridge is also acceptable and avoids loading these scripts dynamically.

## URL rules

### Generic sharing

Website build:

- may share the current page URL.

Desktop build:

- must share `https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/`;
- must never expose `file://`, localhost, custom-protocol or other internal wrapper URLs.

### Multiplayer invitations

Desktop-online multiplayer invitations must use:

```text
https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/?room=<ROOM>&mode=<MODE>
```

The exact query ordering is not important. The public website origin, room code and room mode are important.

Opening such an invite in a normal browser must continue to populate the existing room-code join flow.

### External links

External links belong in the system browser. They must not replace the packaged game renderer.

## Persistence boundary

The wrapper must comply with `DESKTOP-PERSISTENCE-INVENTORY.md`.

In particular:

- the renderer/profile must have a stable, version-independent storage identity;
- Tier A progression must survive restart and application update;
- release-critical data must not live inside the application install directory;
- an update must not silently create a new origin/profile;
- a future migration from web storage to native storage must be conservative and reversible during its acceptance period.

## Networking rules

### Offline acceptance

Networking must be disabled **before process start** when validating `desktop-offline`.

The test is invalid if the game is allowed to boot online first and networking is disabled afterward.

Offline launch must prove:

- no Supabase bootstrap request;
- no Supabase API request;
- no remote Lost Sizzler media request;
- the full intended C64 collectible catalogue resolves from the packaged/local asset boundary rather than the live website;
- a deliberately pre-injected fake `window.ccgSupabase` bridge is quarantined before ordinary runtime use, its original `getClient()` is never called, and `RoomNetwork.getSupabase()` still resolves to `null`;
- Feedback Submit and rating submission remain blocked before legacy direct-client handlers even when such a bridge was injected before boot;
- Solo launch works;
- Tutorial works;
- 2P Split Screen works;
- Save & Quit works;
- Continue works after full application restart;
- local achievements/progression remain available.

### Online degradation

`desktop-online` must degrade rather than convert online failure into game failure.

The following must remain local-first/best-effort:

- Solo cloud-save mirroring;
- achievement account sync;
- Weekly Vault access/submission;
- online multiplayer service activation.

A failed account hydration must not make local Solo unavailable.

## Renderer/native security boundary

The desktop renderer must not receive a general-purpose native API.

Only narrow capabilities required by this contract should be exposed, for example:

- resolve an approved packaged asset;
- open an approved external HTTPS URL;
- request application exit;
- optionally obtain/use the online-services adapter.

The renderer must not receive unrestricted filesystem access, unrestricted process execution, arbitrary shell-open access or secrets that are unsuitable for a browser client.

If the chosen framework supports renderer isolation/sandboxing, use it. Framework-specific security configuration must be reviewed when the wrapper technology is selected.

## Supabase rules

- Never embed a Supabase service-role key in the desktop application.
- Browser/desktop client access must remain limited to credentials and policies suitable for an untrusted client.
- `desktop-offline` must not initialise Supabase.
- `desktop-offline` must fail closed even if a preload/wrapper accidentally injects `window.ccgSupabase`; the game boundary must quarantine that bridge rather than trusting its presence as authorization for online access.
- `desktop-online` must initialise Supabase only after an explicit online feature requires it, unless a wrapper-injected client is already present for the session.
- Local Solo save data remains authoritative; cloud save is a mirror/reconciliation layer.

## Build/update acceptance gate

Before a downloadable build can be called release-ready, test at least two packaged versions, A and B.

1. Install/launch build A offline.
2. Verify the delivery mode reports `desktop-offline`.
3. Verify the full packaged C64 collectible catalogue resolves locally and explicit non-C64 catalogue rows cannot enter the collectible pool.
4. Start Solo and create a later-floor save.
5. Save & Quit, close the application completely and reopen it.
6. Continue the saved run.
7. Earn/persist a local achievement, C64 collection entry and dossier entry.
8. Upgrade/replace with build B without manually copying browser/profile data.
9. Launch build B offline and prove all Tier A state survived.
10. Exercise generic Share and prove only the public CCG Lost Sizzler URL is exposed.
11. Exercise every account/support/Exit link and prove none can replace the game renderer.
12. Run build B in `desktop-online` with the intended online adapter.
13. Create a multiplayer room and prove its invite points to the public CCG URL and retains room/mode parameters.
14. Disable networking during an established desktop-online session and prove local Solo remains usable after returning to the menu/restarting as appropriate.
15. Re-enable networking and separately regression-test account hydration, Weekly Vault, cloud-save reconciliation and supported multiplayer modes.

Any loss of Tier A state, missing intended C64 catalogue, non-C64 collectible leakage, internal-URL disclosure, renderer escape through ordinary links, or offline dependency on Supabase is a **desktop release blocker**.

## Out of scope for this containment PR

This contract does not choose the final Windows framework, installer, signing system, auto-updater or distribution channel.

It also does not replace PR #1852's Solo stabilization programme. Gameplay/ownership fixes remain isolated there until the two programmes are deliberately integrated and regression-tested.

## Re-audit triggers

Re-audit this contract when any of the following changes:

- desktop framework or webview technology;
- application origin/custom protocol;
- persistent profile/user-data directory;
- update/installer mechanism;
- account or Supabase bootstrap architecture;
- external-link destinations;
- multiplayer invite/deep-link format;
- local save/achievement/progression keys;
- version-manifest loading;
- collectible-catalogue loading or filtering;
- the final integration of PR #1852 and PR #1860.
