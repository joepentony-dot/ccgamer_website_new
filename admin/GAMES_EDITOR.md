# CCG Games JSON Editor

## Setup
1. Deploy `/admin/edge-functions/games-json-proxy/index.ts` as Supabase Edge Function named `games-json-proxy`.
2. Set edge function secrets:
   - `GH_REPO_OWNER`
   - `GH_REPO_NAME`
   - `GH_REPO_BRANCH`
   - `GH_TOKEN` (repo write scope)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Run `admin/games-editor-supabase.sql`.
4. Ensure `user_roles` contains `editor`, `admin`, or `superadmin`.
5. Open `/admin/games-editor.html`.

## Permissions
- **editor**: view + edit in browser only, no save.
- **admin**: edit + save.
- **superadmin**: edit + save + restore backups.

## Workflow
1. Filter/search and select record.
2. Edit in modal with live preview.
3. Use **Diff** to inspect JSON changes.
4. Save pipeline runs: validate -> backup -> commit -> deployment confirmation message.

## Recovery
- Backups are stored in `games_json_backups` before each save.
- Last 20 backups are retained automatically.
- Superadmins can click **Restore** on a backup item.

## Troubleshooting
- `Missing CSRF token`: clear session storage and refresh.
- `Invalid auth session`: re-login via `/admin/login.html`.
- `Role cannot save`: role is editor.
- `GitHub API failed`: check token, repo path, and branch settings.

## Best practices
- Keep slugs stable to avoid URL regressions.
- Resolve warnings for missing file paths before save.
- Use meaningful commit messages (auto-generated, but editable in API payload if needed).
- Review diff output on every bulk edit.

## Test plan
- Auth gate checks for unauthenticated user.
- Role enforcement for editor/admin/superadmin.
- Record validation errors block save.
- Backup creation and trim-to-20 verified in Supabase.
- Restore path only available to superadmin.
- 1000 record pagination remains responsive with table/card toggles.

## Regression checks
- Existing `/admin/dashboard.html`, login, and legacy manager remain unchanged.
- `games/games.json` key order preserved by save transformer.

## Performance impact
- Initial load uses one games payload + one repo tree payload.
- UI renders paginated slices (25 per page) to avoid full DOM cost.

## Lighthouse notes
- Admin page is noindex and internal; still supports responsive layout and semantic controls.
- Further improvement: add code-split chunking if admin bundle grows.
