# Phase 2D Video SEO

## Scope

This phase adds a dedicated video-discovery layer for canonical Cheeky Commodore Gamer game pages without changing `games/games.json` or inventing YouTube metadata.

## What is generated

- `sitemap-videos.xml` containing each canonical game page that has a valid YouTube video ID.
- A visible, statically discoverable YouTube embed on each video-enabled canonical game page.
- A page-specific video heading and description that match the information supplied to the video sitemap.
- A direct YouTube action link in the static HTML.
- `VideoObject` JSON-LD only when a verified YouTube upload date exists in `data/video-metadata.json`.

The existing `VideoGame` and `BreadcrumbList` graph remains the authoritative static schema for canonical game pages. Runtime schema helpers do not duplicate those objects when the static game graph is already present.

## Verified metadata policy

`VideoObject` requires an upload date for Google eligibility. The site therefore does not infer, estimate or copy a game release date into `uploadDate`.

`scripts/sync-youtube-video-metadata.js` can enrich `data/video-metadata.json` from the official YouTube Data API v3 when the `YOUTUBE_API_KEY` environment variable is configured. It records the YouTube title, published date, duration, thumbnail and channel title. If the API key is absent, the sync is a safe no-op.

Duration and publication date are optional in the video sitemap and are included only when verified metadata is available. The sitemap itself can still list a video using the canonical page URL, YouTube player URL, thumbnail, title and description when verified upload dates have not yet been collected.

## Build order

The game publishing chain now runs video SEO after canonical game-page generation and before the sitemap index is regenerated:

1. Build canonical game pages and supporting archives.
2. Generate static video markup and `sitemap-videos.xml`.
3. Regenerate the sitemap index so the video sitemap is included.
4. Validate all sitemaps.
5. Validate video markup and VideoObject eligibility.

## Automation

`.github/workflows/seo.yml` runs on pull requests, pushes to `main`, and manual dispatches. Pull requests generate and validate the artifacts in the runner only. Pushes to `main` also commit generated sitemap/game-page changes when generation produces a diff.

If the repository secret `YOUTUBE_API_KEY` is present, the workflow first refreshes verified metadata. It avoids rewriting the metadata file when the underlying video records have not changed.

## Validation guarantees

`scripts/validate-video-seo.js` verifies that every canonical game page with a video ID has:

- a statically visible video section;
- a matching YouTube privacy-enhanced embed URL;
- a descriptive iframe title;
- a matching YouTube action link;
- exactly one `VideoObject` when a verified upload date exists, and none when it does not;
- a matching entry in `sitemap-videos.xml`.

`scripts/validate-sitemaps.js` additionally verifies the Google video sitemap namespace, required video sitemap fields, canonical game routes, valid YouTube player URLs and optional duration bounds.

## Search Console expectation

After deployment and recrawling, Google has an explicit sitemap source for the site's game videos rather than discovering them only through page rendering. Search Console can take time to process a newly introduced child sitemap and video indexing remains subject to Google's crawl and indexing decisions.

## Rollback

Revert the Phase 2D merge and any subsequent `seo-bot` generated-artifact commit. The source game database is not modified by this phase.
