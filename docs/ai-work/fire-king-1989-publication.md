# Fire King (1989, Commodore 64) — guarded publication checklist

This source-only branch stages the verified Fire King record in `games/games.json`. It does **not** bypass Supabase membership security and does not alter existing titles, intro files or styles.

## Binary assets awaiting GitHub upload

The owner supplied three source files in ChatGPT on 8 October 2026. The connector available to this workflow can update UTF-8 repository files but **cannot copy conversation binary attachments into GitHub**.

Before merging, upload and commit these exact files to this branch:

| Destination path in the existing repository | Source | Purpose |
|---|---|---|
| `resources/images/thumbnails/all/fire-king.webp` | Converted from owner-supplied `fire-king.png` (460 × 215) | Game tiles, hero image and social previews |
| `resources/images/games/boxes-3d/fire-king.webp` | Owner-supplied `fire-king.webp` | Original 3D boxed game art |
| `resources/manuals/fireking-manual.pdf` | Owner-supplied `fireking-manual.pdf` (9 scanned pages) | Self-hosted playable manual link |

The separate ChatGPT artifact `fire-king-website-assets.zip` holds these three files with their final repository paths. **Do not merge this branch until all three exist in the branch with the expected sizes/content.** Do not replace them with the Lemon64 image or a generic placeholder.

## Record preflight

- **Identity:** Fire King, C64, 1989, Micro Forté, Strategic Studies Group (SSG). Sources: https://www.lemon64.com/game/fire-king and original supplied manual.
- **Credits:** Coder names from the Lemon64 Commodore 64 record. Stephen Lewis also contributed title artwork, Nick Stathopoulos painted box art, John De Margheriti and Michael Stoney are listed for music. Rob Hubbard was thanked for music-driver assistance only; he is **not** a Fire King composer.
- **Rating:** Cheeky Commodore Gamer 5/10, reason based on the owner's narration; distinct from contemporary magazine scores.
- **Video:** https://youtu.be/9Wlh2bEIRWM (`9Wlh2bEIRWM`). **Private on 8 October 2026**, intended to be made public the following day. The Games Publishing workflow explicitly permits private/scheduled video metadata and will refresh on later synchronisation. Do not invent publication date/duration/video title.
- **Manual:** Set to the above **self-hosted** PDF, not the owner's private Google Drive file.
- **Lemon:** Direct verified `https://www.lemon64.com/game/fire-king` source stored. Reliable Games Publishing will discover/import magazine reviews automatically from the verified Lemon reference. Do not substitute C64 reviews for DOS coverage.
- **Contemporary C64 magazine facts:** The Games Machine #24 (Nov 1989) page 68, **61%**; Your Commodore #60 (Sep 1989) page 73, **50%**; INFO #29 (Nov/Dec 1989) page 75, **3.5/5**. Scans/links must be imported or checked by the established publishing pipeline. Do not mark uncached links as verified direct scans.
- **SEO:** 131-word original factual description, 1989 C64 identity and action-RPG/arcade-adventure keywords; no false download media claim.

## Release gates

1. Upload the 3 binary files to the paths above on **this branch**.
2. Verify each file is served with status 200 from a staging build, with valid WebP and PDF signatures, and check no thumbnails elsewhere were changed.
3. Run reliable game publishing preflight, Lemon magazine capture, generated slug page and affected year/publisher/genre indices. Do not hand-edit generated HTML.
4. Confirm canonical URL `https://www.cheekycommodoregamer.co.uk/games/fire-king/`, two ratings (CCG vs magazines), credits, manual opening, and YouTube private-video placeholder pending publication.
5. Merge through guarded CI; confirm all generated game pages and sitemap output are merged by the existing publishing automation and check the deployed result. No Supabase login is required for GitHub preparation.

**Blocking reason until these gates pass:** binary attachments remain outside GitHub. A textual game record alone would display broken artwork/manual links.
