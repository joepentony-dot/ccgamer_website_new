# CCG Admin Auth Setup (Supabase)

This admin system is isolated under `/admin/` and does not modify public pages.

## 1) Create Supabase Auth users

1. In Supabase Dashboard, open **Authentication → Users**.
2. Create users with email/password for each admin.
3. Enable email confirmations per your security policy.

## 2) Run SQL setup

1. Open **SQL Editor**.
2. Execute the full script in [`/admin/supabase-setup.sql`](./supabase-setup.sql).
3. Confirm `public.user_roles` exists and RLS is enabled.

## 3) Assign roles

Suggested roles:

- `superadmin`: full role management and all read access.
- `admin`: broad access, read all roles, no role mutation.
- `editor`: base admin access assigned by policy.

Assign first superadmin (example):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::public.app_role
FROM auth.users
WHERE email = 'your-admin@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
```

Assign other users similarly with `admin` or `editor`.

## 4) Configure frontend safely

Edit [`/admin/js/config.js`](./js/config.js):

- `SUPABASE_URL` → your project URL (e.g. `https://<project-ref>.supabase.co`)
- `SUPABASE_ANON_KEY` → anon/public key only

### Security notes

- Never place `service_role` keys in browser code.
- Do not embed secrets in HTML.
- Keep RLS enabled in production.
- Restrict dashboard URL exposure with `noindex` and private links.

## 5) Auth flow overview

- `login.html` performs email/password sign-in.
- `dashboard.html` validates session + role before rendering secured data.
- Silent token refresh is handled with periodic checks and Supabase auto refresh.
- Session invalidation redirects to `login.html` with reason query params.

## 6) Testing checklist

1. Sign in with a valid admin/editor account.
2. Verify dashboard loads and shows email + role.
3. Remove the role row for a user and verify access is denied.
4. Force session expiry and verify auto redirect to login.
5. Use reset password flow and verify reset email sends.
6. Sign out and verify you cannot return to dashboard without login.

## 7) Failure scenarios

- **Missing role**: user authenticates but is blocked at role validation.
- **Expired session**: guard refresh fails, user is redirected.
- **RLS misconfiguration**: role fetch errors appear in status panel.
- **Wrong project URL/key**: login fails immediately.

## 8) Recovery procedures

1. Ensure at least one known `superadmin` role exists.
2. If lockout occurs, use Supabase SQL editor as owner to restore:
   - reinsert superadmin row in `public.user_roles`
   - verify `current_user_role()` function exists and policies were not altered.
3. Rotate compromised anon keys in Supabase dashboard, then update `config.js`.

## 9) Deployment checklist

- [ ] `config.js` populated with production Supabase URL + anon key.
- [ ] SQL script applied in production project.
- [ ] At least one `superadmin` account assigned.
- [ ] `/admin/login.html` and `/admin/dashboard.html` reachable.
- [ ] Browser console has no auth or CSP errors.
- [ ] No public-facing files changed.

## 10) Validation + Lighthouse impact notes

- This system adds separate admin-only pages, so public Lighthouse scores are unaffected.
- Admin pages include minimal JS modules and no heavy runtime dependencies beyond Supabase client.
- CSS is loaded as static assets and should remain performant on modern devices.

## 11) Asset manager setup

### Deploy edge function
Deploy `/admin/edge-functions/asset-manager-proxy/index.ts` with environment variables:

- `GH_REPO_OWNER`
- `GH_REPO_NAME`
- `GH_REPO_BRANCH`
- `GH_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VIRUS_SCAN_WEBHOOK` (optional)

### Optional DB table for snapshots
```sql
CREATE TABLE IF NOT EXISTS public.asset_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  payload JSONB NOT NULL
);
```

### Validate asset manager
1. Open `/admin/asset-manager.html` as editor and verify upload-only posture.
2. Open as admin and run scan + health + snapshot.
3. Verify uploads create commits and preserve original + optimized files.

## 12) Supabase password recovery URLs

Configure these values in the Supabase Dashboard before using admin password recovery:

- **Authentication → URL Configuration → Site URL:** `https://www.cheekycommodoregamer.co.uk`
- **Authentication → URL Configuration → Redirect URLs:** `https://www.cheekycommodoregamer.co.uk/admin/reset-password.html`

The admin login uses `/admin/forgot-password.html`, and reset emails must return to `/admin/reset-password.html`. Do not point admin recovery emails at the public `/auth/reset.html` page.
