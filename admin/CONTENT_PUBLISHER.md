# CCG Content Publisher

## Purpose

`/admin/content-publisher.html` is the preferred front end for adding new C64/Amiga games and new CCG video features. It writes only authoritative source data plus an optional game thumbnail. Existing repository automation remains responsible for generated pages, archives, structured data, the Video Library and sitemap output.

The legacy Game Builder and Retro Video Builder remain available as fallbacks.

## Security model

- The YouTube Data API v3 key is **never** exposed to this browser page.
- Verified YouTube metadata is read from `/data/video-metadata.json` for health/preview information.
- New video IDs are verified later by the existing GitHub Actions secret `YOUTUBE_API_KEY`.
- The publisher currently uses the same browser-side GitHub token model as the legacy Retro Video Builder. By default the token is kept for the browser session only. The user can explicitly choose to remember it on that browser.
- If a direct update to `main` is rejected, the publisher creates a review branch and pull request instead of forcing the ref.

## Adding a game

The game form collects the authoritative fields used by `games/games.json`:

- title, system, year, slug and ID
- genres and collections
- description and CCG rating
- YouTube URL / ID
- thumbnail path and optional local thumbnail upload
- manual/PDF and disk URLs
- Lemon64 URL
- music filenames
- publisher/developer/programmer/graphics/musician/producer/re-release credits

The publisher refreshes the current GitHub `games/games.json` immediately before writing, rejects duplicate slug/ID values, rejects thumbnail path collisions and creates an atomic Git commit containing:

- `games/games.json`
- the optional local thumbnail at `resources/images/thumbnails/all/...`

It does **not** write generated game pages or sitemap files itself.

After a direct main commit, the existing workflows handle the rest:

1. Reliable Games Publishing rebuilds canonical game routes, archives, search/index data and normal sitemap coverage.
2. SEO Automation securely refreshes verified YouTube metadata.
3. Video SEO generates verified `VideoObject` data where YouTube supplies an upload date.
4. The Video Library and video sitemaps are regenerated.
5. Sitemap/SEO/protected-file validation runs.
6. The publisher polls the matching workflow runs and then checks the final live URL.

## Adding a video / feature

Supported source datasets are:

- `data/retro-specials.json` (including Zzap!64 long-form videos)
- `data/retro-events.json`
- `data/amiga-demo-music.json`

Paste a normal YouTube URL, youtu.be URL, Shorts URL, live URL or embed URL. The publisher extracts the 11-character video ID and previews the YouTube thumbnail.

If the video is already present in verified metadata, the form displays its title, upload date, duration and the number of timestamp-style chapter lines currently detected in its YouTube description.

For a new video, the browser deliberately does not call the YouTube Data API. After the source commit reaches `main`, SEO Automation uses the GitHub secret to retrieve the official metadata. If YouTube does not return the video, the generators withhold `VideoObject` markup rather than inventing dates or durations.

## Publishing status

The Status tab tracks:

1. source commit
2. verified YouTube metadata
3. generated page and structured data
4. `/videos/` library
5. existing sitemaps
6. validation
7. live canonical URL

This is a browser view of the repository automation; the GitHub workflow results remain the source of truth.

## Legacy tools

- `/admin/games-editor.html`
- `/admin/retro-events-editor.html`

The legacy Retro Video Builder now links prominently to the unified publisher so existing admin navigation still leads users to the new workflow.
