# CCG Admin Asset Manager

## Scope
This system manages only repository-backed assets under:

- `resources/images/games/boxes-3d/`
- `resources/images/thumbnails/`
- `resources/images/collections/`
- `resources/images/genres/`
- `resources/images/banners/`

It does **not** rename/move existing files automatically.

## Upload Workflow
1. Open `/admin/asset-manager.html`.
2. Drag images into the upload dropzone.
3. Select destination folder.
4. Click **Upload Batch**.
5. Pipeline performs:
   - client-side resize (max dimension 1600)
   - WebP conversion targeting 500KB
   - original + optimized upload commit
   - MIME + extension + size validation in proxy
   - optional virus scan webhook call (`VIRUS_SCAN_WEBHOOK`)

## Naming Rules
- Slug-based (`a-z0-9-`)
- Lowercase
- Hyphen-separated
- No spaces
- `.jpeg` normalizes to `.jpg`
- Suggested only (no forced rename pass)

## Games JSON Linking
- Use **Game Linking** panel.
- Provide game slug + asset path.
- Validation checks:
  - asset exists in indexed catalog
  - game exists in `games/games.json`
- Result outputs a patch object to apply through the existing Games JSON Editor.

## Health Check
Health scan reports:
- oversized assets (>500KB)
- duplicate blobs (same git SHA)
- missing referenced assets in `games/games.json`

Recommended cadence: run after each upload batch and before release.

## Backup + Recovery
### Snapshot
- Admin/superadmin can create a metadata snapshot via **Create Snapshot**.
- Snapshot writes to `asset_snapshots` if table exists.

### GitHub backup
Every upload creates a repository commit. This is the primary backup chain.

### Restore
1. Locate commit in repository history (`admin(asset-manager): upload ...`).
2. Revert commit or restore specific files.
3. Run health check.

## Access Control
- **editor**: upload + preview + validation only.
- **admin**: upload + scan + snapshot + manage.
- **superadmin**: full lifecycle, including delete/purge routes when added.

## Security Controls
- CSRF header required.
- JWT auth required.
- extension whitelist.
- MIME guard.
- per-user rate limiting.
- optional virus scan hook.
- temporary upload data stays client-side until commit call.

## Troubleshooting
- `Missing CSRF token`: reload and retry.
- `Invalid auth session`: sign out/in again.
- `Role denied`: confirm `user_roles` table entry.
- `Snapshot table unavailable`: create `asset_snapshots` table or rely on Git history.
- `Virus hook rejected`: inspect webhook response and scanner policy.
