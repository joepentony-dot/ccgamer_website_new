# Lost Sizzler update policy

The public game uses `version.json` as its no-cache release marker. `js/version-check.js` compares the build in the loaded page with the latest published `version.json` and shows the existing **Update Available** panel when they differ.

For every public Lost Sizzler release:

1. Bump `version.json` (`releaseVersion`, `build`, `cacheToken`, `released`).
2. Match `index.html` meta values to the same `build` and `cacheToken`.
3. Change every Lost Sizzler CSS/JS `?v=` cache token in `index.html` to the new `cacheToken`.
4. Keep the version checker cache-busted with the same token.

This ensures older open/cached copies detect the new build, prompt the visitor to refresh, and then request fresh game assets instead of reusing the previous release URLs.
