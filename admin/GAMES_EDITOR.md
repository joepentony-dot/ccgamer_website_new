# CCG Games Editor and Publishing Workflow

## What the editor does

`/admin/games-editor.html` helps create one correctly structured game record and a reviewable deployment package. It checks required fields, duplicate IDs and slugs, supported paths, metadata and package structure.

It does **not** independently research or confirm historical facts. Before publishing, manually check the title, release year, platform, publisher, developer, programmer, graphics and music credits against reliable sources.

## Authoritative source and generated output

The authoritative game catalogue is:

- `games/games.json`
- the thumbnail and any optional manual, download, music or box assets referenced by that record

Everything else is generated from those source files by:

```text
npm run rebuild:games
```

Do not treat a manually edited archive page, sitemap or wrapper as the source of truth. The central rebuild replaces generated output with the version derived from `games/games.json`.

## Required fields

Every game must have:

- title
- platform: `C64` or `AMIGA`
- numeric release year
- unique lowercase kebab-case slug
- unique lowercase snake-case ID
- at least one supported genre
- description
- CCG rating from 0 to 10
- publisher
- thumbnail path

A video ID is required by the current builder. Optional fields include collections, rating explanation, PDF manual, download links, music files, 3D box image and additional credits.

## Asset naming

Use stable lowercase filenames and do not rename an existing asset after publication.

- Thumbnail: `resources/images/thumbnails/all/<filename>.png`, `.jpg`, `.jpeg` or `.webp`
- 3D box: `resources/images/games/boxes-3d/<filename>.webp`
- Music: `resources/audio/games/<filename>.mp3`
- Manuals and downloads: use the existing URL/path conventions shown by current records

The thumbnail file must exist before the central publishing workflow can complete. A local thumbnail selected in the builder is included in the downloaded ZIP at the exact path stored in the record.

## Recommended hosted-editor workflow

1. Open `/admin/games-editor.html` and select **Fetch live games.json**.
2. Enter the game information and manually verify every factual credit.
3. Resolve all validation errors and review the preview.
4. Select **full games.json** export unless a developer specifically requests an entry-only export.
5. Download the deployment ZIP.
6. Copy the ZIP files and required assets into a new Git branch or draft pull request.
7. Confirm that the complete `games/games.json` contains the new game exactly once.
8. The **Game Catalogue Publishing** workflow runs the authoritative rebuild.
9. Review the pull request and merge only when the central workflow and read-only validators pass.

The hosted website cannot run repository commands. Its rebuild button is therefore disabled outside `localhost` or `127.0.0.1`.

## Local workflow

For a local repository checkout:

1. Start the loopback admin API:

```text
npm run admin:api
```

2. Serve/open the editor from `localhost` or `127.0.0.1`.
3. After the source JSON and assets are in the repository, select **Run Local Full Rebuild**.

The local endpoint:

- accepts only loopback network requests
- requires the editor’s local rebuild header
- runs only the fixed `scripts/rebuild-games.js` command
- rejects simultaneous rebuilds
- does not accept arbitrary command text

The terminal equivalent is:

```text
npm run rebuild:games
```

## Supabase/GitHub save mode

The existing Supabase Edge Function can validate, back up and commit `games/games.json` for authorised `admin` or `superadmin` users.

That save is a **source-data commit**, not the complete publishing operation. The central GitHub workflow must still regenerate and validate every derived file. Confirm the following deployment settings before relying on this route:

- `GH_REPO_OWNER`
- `GH_REPO_NAME`
- `GH_REPO_BRANCH`
- `GH_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- editor/admin roles in `user_roles`

The browser-only `games-json-editor.html` and `games-api.js` download mode remain fallback tools. They download JSON for manual review and do not publish the website by themselves.

## What the central rebuild generates

The authoritative command updates and validates:

1. games index data
2. games search data
3. canonical `/games/<slug>/` wrappers
4. legacy `/games/<slug>.html` redirects
5. `VideoGame` and `BreadcrumbList` schema
6. publisher archives
7. developer archives
8. composer archives
9. release-year archives
10. C64 and Amiga platform archives
11. archive discovery links
12. downloads archive
13. static-page registry
14. game sitemap
15. page sitemap
16. root sitemap index
17. structured data and SEO
18. internal-link and orphan-page integrity

## How to recognise success

A successful workflow reports that:

- the source catalogue is valid
- the game appears exactly once in index and search data
- its canonical wrapper and legacy redirect exist
- its wrapper owns the correct canonical URL
- one `VideoGame` and one `BreadcrumbList` are valid
- the game appears in the correct publisher, developer, composer, year and platform routes
- download discovery is present when a download link was supplied
- the canonical game URL appears once in the game sitemap
- no game or unrelated registry entry was lost
- no broken internal links or indexable orphan pages were introduced
- repeated generation produces no further changes

## When validation fails

Do not bypass or delete the failing check.

1. Open the failed workflow step and read the first specific error.
2. Correct the source record or missing asset.
3. Keep the slug and ID unchanged unless the record has never been published.
4. Run `npm run rebuild:games` locally, or push the correction so the central workflow reruns.
5. Do not merge until all required checks pass.

Common failures include duplicate IDs/slugs, unsupported platform text, missing thumbnails, invalid years, missing archive membership, malformed schema and sitemap differences caused by incomplete generation.

## Recovery and permissions

- Supabase saves create a backup before committing and retain the configured recent backup set.
- `editor` can view and edit in the browser but cannot save through the protected Supabase route.
- `admin` can save.
- `superadmin` can save and restore backups.
- Review the JSON diff before every bulk edit or restore.

## Permanent regression protection

Phase 6B includes disposable C64 and Amiga publishing transactions. Each test adds one synthetic game inside an isolated Git worktree, runs the complete publishing command, validates all expected routes and then deletes the worktree. Synthetic records and assets never enter the real catalogue.
