# Fire King (1989, Commodore 64) — guarded publication checklist

This branch adds exactly one C64 game to the existing GitHub-based publishing pipeline, without Supabase owner login.

## Original artwork — committed to GitHub

Both owner-supplied WebP assets are already committed to the Fire King branch and stored at the site's established image paths:

- `resources/images/thumbnails/all/fire-king.webp` — game thumbnail, 35,012 bytes (extended VP8X WebP, 460 × 215; sRGB ICC metadata for the site's image-dimension reader)
- `resources/images/games/boxes-3d/fire-king.webp` — original boxed-game artwork, 65,538 bytes

The source binaries were SHA-verified against the owner uploads before creating Git blobs. No other existing game image was modified.

## Game manual — original Google Drive link

In keeping with existing game records, the manual is **not uploaded to GitHub**. The source record's `pdf` field points to the original Google Drive document:

https://drive.google.com/file/d/1Pj7XeGHm3Oo84wAd5gNVcp-2zHj25Kyc/view?usp=drive_link

The owner retains the original nine-page PDF on Google Drive. **Important:** Google Drive metadata returned `shared: false` (private) when checked on 8 October 2026. The owner must use **Share → General access → Anyone with the link → Viewer** to allow website visitors to open it. Recheck publicly in a logged-out browser before final deployed acceptance. Do not claim that the PDF is publicly available until confirmed.

## Identity and metadata

- **Game:** Fire King (1989), Commodore 64
- **Developer:** Micro Forté; **publisher:** Strategic Studies Group.
- **Genre:** action adventure, shooting, role-playing; six selectable adventurers and simultaneous two-player play.
- **Credits:** coding names from the matching Lemon64 C64 release; Stephen Lewis (title screen), Nick Stathopoulos (box artwork), John De Margheriti and Michael Stoney (music). Rob Hubbard receives music-driver assistance credit only, not composer credit.
- **CCG rating:** owner's 5/10, with a personalised reason that reflects the accompanying narration.
- **YouTube:** `https://youtu.be/9Wlh2bEIRWM`; video is private until the next day. Normal YouTube metadata synchronisation is designed to tolerate this, then refresh when public.
- **Lemon64:** `https://www.lemon64.com/game/fire-king`
- **Magazine research:** The Games Machine #24 (Nov 1989), page 68, 61%; Your Commodore #60 (Sep 1989), page 73, 50%; INFO #29 (Nov/Dec 1989), page 75, 3.5/5. Maintain the distinction between source index URLs and actual scanned magazine page links; do not invent scans.
- **SEO description:** the original specific C64 description is in `games/games.json`.

## Publication gates

1. Confirm both committed WebP images display correctly and existing art remains unchanged.
2. Run the standard Reliable Games Publishing and enrichment pipeline; create the canonical `/games/fire-king/` page and discoverability from relevant genre/publisher/1989/game-list pages and sitemap.
3. Confirm the independent CCG 5/10 rating, Lemon-sourced magazine ratings and links, credits, manual link and YouTube embed/placeholder.
4. Keep the private video ID in the source; do not invent its title, publication date or duration.
5. Verify the Google Drive manual is accessible to unauthenticated visitors before considering the manual feature complete.
6. Merge only validated changes, confirm generated page outputs have reached main, and check the live game page.

The obsolete binary-asset ZIP handoff has been removed: the two artwork files were committed directly by GitHub Git-tree operations. Supabase admin authentication is not used.
