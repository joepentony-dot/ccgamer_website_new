# CCG Games Editor and Publishing Workflow

## Authoritative workflow

The Game Builder creates a reviewed deployment package. The repository command below is the authoritative publishing step:

```bash
node scripts/rebuild-games.js
```

Do not treat the ZIP's generated archive or sitemap files as final until this command has completed successfully. Phase 6B validates this same command against disposable C64 and Amiga additions before editor-publishing changes can be approved. Repeating the command without changing source data must produce no additional generated diff.

## Before adding a game

Check the historical information manually. The editor validates structure, paths and duplicate IDs/slugs, but it does not independently prove that a release year, publisher, developer, composer or other credit is historically accurate.

Required information:

- title
- C64 or Amiga system
- release year
- unique slug
- unique ID
- at least one supported genre
- description
- valid 11-character YouTube video ID
- publisher
- thumbnail path and thumbnail file
- CCG rating

Optional information includes collections, manual URL, disk/download links, developer, programmer, graphics and musician credits.

## Lemon64 Auto Fill

Lemon64 Auto Fill is an assisted import for C64 records. It may populate:

- title
- release year
- publisher
- programmer
- musician
- graphics
- a recognised genre

The imported information remains editable. Review every imported value against the Lemon64 page and any other source you trust before exporting. The helper must not be treated as an automatic factual guarantee.

## File naming

- Thumbnail: `resources/images/thumbnails/all/<slug>.<png|jpg|jpeg|webp>`
- Optional 3D box: `resources/images/games/boxes-3d/<slug>.webp`
- Game audio is hosted on Cloudflare R2 and resolved from the canonical slug as `<slug>.mp3`; do not add repository audio paths or a `music` filename field to `games.json`
- Manuals and downloads must use the final URLs intended for the public game record

Keep the slug stable after publication because it owns the canonical URL at `/games/<slug>/`.

## Publishing a new game

1. Open `/admin/games-editor.html` and use **Fetch live games.json**.
2. Enter the game details and resolve every validation error.
3. Use Lemon64 Auto Fill only as an optional starting point, then check the imported facts.
4. Confirm the thumbnail exists or include it in the ZIP.
5. Export the **full** deployment package.
6. Place the package files into the repository, including the updated `games/games.json` and required assets.
7. From the repository root, run:

   ```bash
   node scripts/rebuild-games.js
   ```

8. Review the complete generated diff.
9. Commit the source record, assets and generated output to a branch.
10. Open a pull request and wait for the central publishing workflow and read-only validators to pass.
11. Merge only after validation succeeds.

## What the publishing command generates

The authoritative command validates and regenerates, in order:

1. game source integrity
2. canonical wrappers and legacy redirects
3. game index and search data
4. `VideoGame` and `BreadcrumbList` structured data
5. publisher archives
6. developer archives
7. composer archives
8. year archives
9. platform archives
10. archive discovery integration
11. downloads archive and static-page registration
12. page and game sitemaps
13. root sitemap index, sitemap validation, SEO validation and year/platform validation

Retro Events, Retro Specials and Amiga demo pages are deliberately outside this game-publishing command because they have their own source data and generators.

Expected totals are derived from the current `games/games.json`. The validators still reject duplicate IDs/slugs, unsupported platforms, catalogue loss below the protected baseline, missing archive membership, missing canonical routes and malformed output.

## Save and deployment modes

### Full deployment ZIP — recommended editor output

Use this when adding a game. It contains the complete merged game database plus the provisional wrapper, redirect, search/index and sitemap files. The repository rebuild command remains mandatory.

### Entry-only JSON — manual fallback

Use only when you deliberately want to merge one object into `games/games.json` by hand. Maintain the existing key order and sorting discipline, then run the authoritative command.

### Supabase/GitHub save

The Supabase proxy can commit `games/games.json` after role, validation and backup checks. It does not replace the complete publishing command. The resulting GitHub change must still pass the central publishing workflow before merge.

### Browser/local download API

Client-download tools create local files only. They do not update the repository or regenerate the public archive by themselves.

## Recognising success

A successful publish ends with:

```text
[rebuild-games] Complete publishing chain passed
```

The pull request must also show a successful **Reliable Games Publishing** workflow. The new game should appear once in its canonical wrapper, legacy redirect, search data, publisher, developer, composer, year, platform, downloads archive when applicable and game sitemap.

## When validation fails

- Read the first failing command in the terminal or workflow log.
- Correct the source field, missing asset or generated inconsistency.
- Run `node scripts/rebuild-games.js` again.
- Do not manually suppress a validator or change expected totals to force a pass.
- Do not merge a game addition while the central publishing workflow is failing.

## Permissions and recovery

- `editor`: view and edit in browser; saving depends on the configured route.
- `admin`: save where the Supabase/GitHub route is configured.
- `superadmin`: save and restore configured backups.

Supabase backups are retained before direct JSON saves where that deployment is enabled. Repository history and pull requests remain the final recovery path for generated publishing output.
