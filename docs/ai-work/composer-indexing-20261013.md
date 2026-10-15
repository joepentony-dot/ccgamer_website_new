# Composer indexing: sourced biography review — 13 October 2026

## Live noindex remediation — 15 October 2026 (DRAFT, NOT DEPLOYED)

- Owner's Google Search Console smartphone **Test live URL** at 14:08 BST verified that `/music/neil-crossley/` was HTTP fetchable but excluded by an explicit HTML robots `noindex` meta. GSC Wizard live crawl corroborated HTTP 200, self-canonical, `noindex`, 63 words.
- Authoritative composer registry on main: **276 composer routes, 114 indexable and 162 noindexed**. Every noindexed entry is a generated **one-credit** composer page. The responsible generator `scripts/generate-composer-pages.js` required two catalogue credits for `index,follow`; post-processing `scripts/enrich-generated-composer-pages.js` already supports vetted editorial exceptions.
- Single bounded source PR **#2778**, branch `fix/seo-composer-single-credit-indexability-20261015`, changes the generated-page minimum to **one verified catalogue credit**; does not manufacture composer biographies or change actual game-credit attribution. A regression tests one-credit HTML robots/canonical/link, the entire 162-page existing source cohort, existing curated exclusions and the generic query-string fallback's `noindex,follow`.
- Deliberate legacy HTML aliases, retired URLs, standalone generic music/composer query fallbacks and independently curated exclusions must **not** be mass-indexed. No protected game catalogue, Omega intro, emulator, Dungeon, media, member state, DNS or manually generated page HTML is changed.
- After exact-final-head CI (Composer Archives, SEO, Site Safety, Lighthouse, cache, publisher/PWA where triggered) and independent review with owner-approved merge, the **existing** composer-archives workflow must regenerate canonical composer HTML, composer registry, static-page ownership and XML sitemaps. Verify the generated diff and Pages/live deployment before any Google live URL tests or changed sitemap submission. Google still decides whether to index one-credit pages, particularly those with limited on-page text. Do not claim search traffic or indexing gains on source-only changes.


## Evidence

Google Search Console identifies both `/music/rob-hubbard/` and `/music/ben-daglish/` as **Crawled - currently not indexed**. Live audit returns HTTP 200, indexable, self-canonical for both, but only approximately 94 and 103 words of page text respectively, with only three internal links each. These are editorial enrichment opportunities, NOT evidence of a technical indexing restriction.

## Scope

Update ONLY `data/composer-research/part-01.json` (Ben Daglish) and `part-07.json` (Rob Hubbard), preserving all unrelated composer data, credits, dates and routing. Replace brief biographies with specific career and C64 music background based on first-hand interviews and documented biographies, and change generic/homepage references into direct, verifiable source links. New test `tests/composer-nonindexed-biographies.test.mjs` protects source references and shared SEO snippet compatibility.

Sources: Lemon64 and Remix64 interviews with Ben Daglish, Chris Abbott's C64Audio obituary; Remix64 Rob Hubbard interview, MobyGames career biography and C64-Wiki's cited Hubbard interviews. No unsourced credits or private information added.


## Exact regression inclusion

- The initial 4/4 green checks did not execute the newly created focused `tests/composer-nonindexed-biographies.test.mjs`, because the existing composer-archive workflow listed only three older tests. This draft now adds the new regression to both workflow path filters and the existing `node --test` command. Requalify the exact new PR head; do not cite the previous 4/4 status as coverage for this test.

## Release gate

**Review draft only.** Do not merge without exact-head qualification, independent review and owner authorisation. Composer pages are generated output: after an approved source merge, use the authoritative composer generation/publishing workflow, verify rendered biography/source links, structured/social metadata, Site Safety and live deployment, and monitor GSC recrawls. Google alone determines eventual indexing.

Existing separate SEO snippet draft PR #2717 and Mark Cooksey PR #2687 are NOT modified or merged by this candidate.
