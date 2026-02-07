# Cheeky Commodore Gamer – SEO Automation

This repository now includes a lightweight, dependency-free Node.js SEO toolchain that generates game sitemaps and audits internal game links at build time. The goal is to make sure search engines can discover and index every canonical game page without changing runtime behaviour.

## What was added

- `tools/seo/generate-sitemap.js`
  - Reads `games/games.json`
  - Validates slug presence/format/uniqueness
  - Excludes invalid or missing HTML targets
  - Generates:
    - `/sitemap-games.xml`
    - `/sitemap-pages.xml`
    - `/sitemap.xml` (sitemap index)
  - Sorts entries alphabetically
  - Uses `tools/seo/static-pages.json` to control non-game sitemap entries
  - Uses git timestamps for `<lastmod>` when available
  - Falls back to the current date when git history is unavailable

- `tools/seo/seo-audit.js`
  - Scans the repo for:
    - Missing game pages referenced by `games.json`
    - Orphan game pages (HTML without a matching slug)
    - Non-canonical `/games/` links
    - Legacy `?id=` routes
    - Broken `/games/` links
  - Produces a human-readable console report
  - Fails CI only on critical data issues in `games.json` (missing/invalid/duplicate slugs)

- `/sitemap-games.xml`, `/sitemap-pages.xml`, and `/sitemap.xml`
  - Generated from `games/games.json`
  - Safe for static hosting

- `tools/seo/static-pages.json`
  - Explicit allowlist of non-game HTML pages to include in `/sitemap-pages.xml`
  - Prevents accidental indexing of temporary or utility pages

- `/.github/workflows/seo.yml`
  - Runs the sitemap generator and SEO audit on pushes to `main`
  - Fails the build if:
    - Critical data issues are detected, or
    - Generated sitemap files are not committed

- `/_headers`
  - Adds explicit XML content-type headers for sitemap files

## How to run locally

From the repository root:

```bash
node tools/seo/generate-sitemap.js
node tools/seo/seo-audit.js
```

### Optional: override the site URL

The generator uses `CNAME` to determine the canonical base URL. You can override it locally if needed:

```bash
node tools/seo/generate-sitemap.js --base-url https://example.com
```

## Expected workflow

1. Update game data/pages as normal.
2. If you add a new non-game HTML page that should be indexed, add it to `tools/seo/static-pages.json`.
3. Regenerate the sitemap:
   - `node tools/seo/generate-sitemap.js`
4. Audit for SEO issues:
   - `node tools/seo/seo-audit.js`
5. Commit all sitemap files if they changed.

The CI workflow enforces that the sitemap files are kept up to date.

## Safety notes

- The SEO tools:
  - Do not introduce runtime dependencies
  - Do not change client-side routing or behaviour
  - Do not modify `games/games.json`
  - Only write sitemap files at the repo root
- The audit report may surface pre-existing issues. These are reported for visibility and do not fail CI unless they are critical `games.json` data errors.

## Admin Package Builder (Omega)

The CCG Admin Package Builder lives at `/admin/games-editor.html` and generates a ZIP bundle with metadata, SEO stubs, and local assets. It is designed to be resilient to missing files while still producing a downloadable bundle.

### Required libraries

- JSZip 3.10.1 (loaded from the JSZip CDN in the admin pages).

### Export flow

1. Complete the wizard steps and run validation.
2. Generate the output previews (games.json entry, SEO stub, metadata, manifest, README).
3. Run **Build package** or **Download bundle**.
4. The ZIP will include the updated games.json entry, SEO stub, manifest, metadata, README, and any local assets that could be fetched.
5. Missing assets are recorded in `missing-assets.txt` and reported in the export status panel.

### Troubleshooting

- **“Invalid JSZip detected — export disabled”**: The JSZip CDN did not load. Refresh the page or verify network access.
- **Missing assets warning**: Ensure thumbnail art is in `resources/images/thumbnails/all/` and 3D box art is in `resources/images/games/boxes-3d/`.
- **ZIP download fails**: Check the Package Builder error modal for the stack trace and fix any referenced filenames.
