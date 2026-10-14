# Wasteland (1988) — C64 owner game-publication checkpoint

This guarded source branch stages **one new game only**, for the existing CCG Reliable Games Publishing pipeline. Both owner artwork assets are committed. The PR is **not ready to merge** until its latest exact-head checks and release gates pass. Do not hand-edit generated game pages, sitemaps, or magazine ratings.

## Verified source record
- `games/games.json`: 665 → 666 game entries; one new `wasteland` record inserted between Walker and Water Polo, without changing old records.
- 1988 Commodore 64; developer Interplay Productions; publisher Electronic Arts; programmer Alan Pavlish, graphics Todd J. Camasta, producer Dave Albert.
- Owner YouTube video ID `7Cn_7PWy3_w`; YouTube upload date/public reachability are **not asserted** and remain for canonical YouTube sync.
- Owner rating 8/10, with a first-person reason reflecting the hard early encounters and Wasteland's considerable potential.
- Curated 139-word game description targeting Commodore 64 RPG, post-apocalyptic world, Desert Rangers, skills, persistent world, locations, and Fallout's historical connection.
- Lemon64 evidence: https://www.lemon64.com/game/wasteland . Let standard publishing pipeline source and populate magazine reviews rather than manually inserting percentages.

## Manual
- Owner's original 28-page `Wasteland.pdf` already exists on Google Drive.
- Verified Google Drive exact-file metadata, reader access `type:anyone`, `role:reader`, and original URL:
  https://drive.google.com/file/d/1O81lhqxKwn-RL03SIkaX4sV31jZ8rjs8/view?usp=drivesdk
- No separate manual GitHub upload is required under the normal CCG publishing contract.

## Owner-supplied artwork — both uploaded; thumbnail container repaired
- Thumbnail `resources/images/thumbnails/all/wasteland.webp` committed by the owner. Original 460 × 215 VP8 WebP had valid pixels but an unsupported simple header for the existing dimension parser; changed **container metadata only** to VP8X (30,236 bytes, blob `4e4e503ed15294ed797798c27d364055cf29d4f4`), confirmed image pixels unchanged against the owner upload.
- Original 3D box **is now committed**, in the correct path `resources/images/games/boxes-3d/wasteland.webp`: 928 × 1470, 69,070 bytes, repository blob `eaab047fbc9d416bf9ae4955216b21ff95eed117`. This is the owner's unmodified WebP, under the 500 KB hard limit.
- A smaller WebP was also prepared locally (800 × 1267, 51,838 bytes) but not committed; no need to replace the owner's original solely for a negligible size reduction.
- Owner inadvertently uploaded JPEG `resources/images/thumbnails/all/wasteland.jpg` (460 × 215, 32,319 bytes), whereas `games.json` correctly requires `.../wasteland.webp` and new-game performance contract requires WebP. The unused JPEG has now been removed from the same review branch.
- Both required media paths now exist on the PR branch and WebP image budget / Lighthouse checks passed on the initial corrected-thumb head. No additional upload is required.

## Required qualification
1. **Done:** both WebP binary assets committed to the expected source paths; owner need not upload again.
2. Confirm no competing `wasteland` slug/ID and no concurrent main catalogue change is overwritten; rebase/reconcile if needed.
3. Two catalogue-count test assertions were repaired on this branch (665 → 666). All four remaining CI failures on head `80ec9b7b` traced to the thumbnail dimensions or generated Wasteland page not existing in the source-only PR. The VP8X container-only fix cured the image metadata failure; the SEO Automation workflow now builds **disposable canonical shells only for source-changing PRs** before game-video SEO, leaving authoritative game output ownership unchanged. Requalify newest exact-head `node scripts/rebuild-games.js`, game-source validation, Lighthouse, magazine/UTA enrichment, SEO/sitemaps, and full CI; do not transfer earlier-head results.
4. Confirm the generated canonical /games/wasteland/ route, hero/3D images, manual, correct 8/10 rating/reason, video link, source magazine scores and index/sitemap discovery.
5. Only then merge after green exact-head qualification and live owner acceptance.
