# Wasteland (1988) — C64 owner game-publication checkpoint

This guarded source branch stages **one new game only**, for the existing CCG Reliable Games Publishing pipeline. It is intentionally **not ready to merge** until the two owner-uploaded binary image assets have been committed and checks pass. Do not hand-edit generated game pages, sitemaps, or magazine ratings.

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

## Owner-supplied artwork — outstanding upload to THIS branch
- Thumbnail source JPEG 460 × 215 converted locally to performance-compliant WebP, 460 × 215, 30,218 bytes, SHA-256 `534f7dfa2b0dff38e5a7202bc36d47a0d3d87f0c4e642b411d355acd6e30602b`.
  Commit exact binary to `resources/images/thumbnails/all/wasteland.webp`.
- Original 3D box source WebP 928 × 1470 converted locally to 800-pixel wide WebP, 51,838 bytes, SHA-256 `48144c76b308379088ee50d9636abd7b5fbbab507a80d7d94b50db1b6e1f18bb`.
  Commit exact binary to `resources/images/games/boxes-3d/wasteland.webp`.
- Both owner artwork files were prepared under the container session; the available GitHub connector cannot directly ingest mounted binary-file paths, so **neither binary is committed yet**. Do not pretend the published page has its images. Do not substitute unrelated online imagery.

## Required qualification
1. Upload the exact two WebP binary files to the specified paths in this branch.
2. Confirm no competing `wasteland` slug/ID and no concurrent main catalogue change is overwritten; rebase/reconcile if needed.
3. Run authoritative `node scripts/rebuild-games.js`, game-source validation, Lighthouse publishing contract, magazine/UTA enrichment, SEO/sitemap audits, and normal CI.
4. Confirm the generated canonical /games/wasteland/ route, hero/3D images, manual, correct 8/10 rating/reason, video link, source magazine scores and index/sitemap discovery.
5. Only then merge after green exact-head qualification and live owner acceptance.
