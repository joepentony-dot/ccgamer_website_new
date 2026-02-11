# CCG Omega Auth Unification — Phase 11 Report

## 1) Auth Failure Map (captured before implementation changes)

### Method used
- Static source forensic pass over all auth entry points and auth clients.
- Runtime network tooling attempts:
  - Playwright run to capture DevTools-equivalent request/response traces failed in this environment due a Chromium crash (SIGSEGV) before page load.
  - Direct `curl` validation to Supabase auth endpoints failed with environment proxy `403 CONNECT tunnel failed`, preventing external HTTP header capture.

### Failure map table
| Entry point | Auth script path | Endpoint target | Result | Root signal |
|---|---|---|---|---|
| `/auth/login.html` | `resources/js/auth/auth-core.js` -> `resources/js/auth/supabase-client.js` | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/token?grant_type=password` | Fails with `Failed to fetch` | Placeholder Supabase URL/key in standalone auth client. |
| `/auth/forgot.html` | `resources/js/auth/auth-core.js` -> `resources/js/auth/supabase-client.js` | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/recover` | Fails with `Failed to fetch` | Placeholder Supabase URL/key in standalone auth client. |
| `/auth/register.html` | `resources/js/auth/auth-core.js` -> `resources/js/auth/supabase-client.js` | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/signup` | Fails with `Failed to fetch` | Placeholder Supabase URL/key in standalone auth client. |
| `/community/index.html` | `js/ccg-supabase-config.js` + `js/ccg-supabase-client.js` + `js/ccg-community-auth.js` | `https://lcslgxpgmttaexsorxik.supabase.co/auth/v1/*` | Works | Correct production Supabase config and singleton client bootstrap. |
| `/games/index.html` / `/games/collections/index.html` | Same as above | `https://lcslgxpgmttaexsorxik.supabase.co/auth/v1/*` | Works | Same singleton client stack as community. |
| `/about.html` `/contact.html` `/emulation.html` `/quiz/quiz.html` | `js/ccg-supabase-config.js` + `js/ccg-supabase-client.js` + `js/ccg-community-auth.js` | `https://lcslgxpgmttaexsorxik.supabase.co/auth/v1/*` | Shared auth modal stack is structurally valid; any fetch failure here would be transient network/CORS/session. | Not a placeholder-client issue; now covered by improved error classification/logging. |

### Request/headers/status snapshot (forensics)
- Expected request endpoint in broken standalone pages before fix: `https://YOUR_PROJECT_REF.supabase.co/...` (invalid host placeholder).
- Expected request headers from Supabase JS client:
  - `apikey: <anon key>`
  - `authorization: Bearer <anon key>`
  - `x-client-info: supabase-js-...`
  - `origin: https://www.cheekycommodoregamer.co.uk`
- Expected runtime error path:
  - `TypeError: Failed to fetch`
  - bubbles through `supabase.auth.signInWithPassword` / `signUp` / `resetPasswordForEmail`.

> Environment limitation note: full HTTP response header capture for live Supabase CORS from this container was blocked by network proxy.

## 2) Root Cause Report

### Primary root cause
A second standalone auth implementation (`resources/js/auth/supabase-client.js`) used placeholder values (`YOUR_PROJECT_REF`, `YOUR_SUPABASE_ANON_KEY`) and created a separate client instance unrelated to the production singleton (`window.ccgSupabase`). This produced immediate fetch failures on `/auth/*` pages.

### Contributing factors
- Dual client stacks:
  - Production stack: `js/ccg-supabase-config.js` + `js/ccg-supabase-client.js`.
  - Standalone stack: `resources/js/auth/supabase-client.js` (placeholder config).
- No shared error normalization, causing generic "Failed to fetch" without context category.

## 3) Unified Auth Core Module

Implemented unified core at:
- `js/ccg-auth-core.js`

Capabilities now centralized:
- client discovery via existing singleton `window.ccgSupabase`;
- login, logout, register, password reset, password update;
- session/user fetch;
- profile bootstrap (non-blocking) for first-login profile insert;
- normalized error intelligence with `[CCG-AUTH]` logs and user-friendly categories.

Bridged legacy standalone imports:
- `resources/js/auth/auth-core.js` now re-exports from `js/ccg-auth-core.js`.
- `resources/js/auth/supabase-client.js` now delegates to `window.ccgSupabase.getClient()`.

## 4) Full HTML/JS Replacements Applied

### HTML updates
- `auth/login.html`
- `auth/forgot.html`
- `auth/register.html`

Changes:
- load production singleton bootstrap scripts first:
  - `../js/ccg-supabase-config.js`
  - `../js/ccg-supabase-client.js`
- keep existing Omega UI, forms, and password peek controls.
- improved UI error handling to surface normalized auth cause text and detailed console logs.

### JS updates
- Added `js/ccg-auth-core.js`.
- Replaced content of `resources/js/auth/auth-core.js` and `resources/js/auth/supabase-client.js` to unify onto production client.
- Updated `js/ccg-community-auth.js` to normalize and log auth errors (`[CCG-AUTH]` context) instead of raw generic messages.

## 5) Supabase Config Checklist

- [x] Single production URL source: `js/ccg-supabase-config.js`.
- [x] Single anon key source: `js/ccg-supabase-config.js`.
- [x] Standalone auth pages now load production config/client.
- [x] No placeholder URL/key left in active auth flow.
- [x] Session persistence remains enabled through existing client options.
- [x] `detectSessionInUrl` remains enabled for reset/redirect auth flow.
- [ ] Live dashboard verification pending from Supabase console (outside repository):
  - Site URL
  - Redirect URLs (`/auth/reset.html`, `/auth/login.html`, relevant deep-links)
  - Allowed origins for all deployment domains.

## 6) Deployment Notes

1. Deploy changed files as-is (no schema migration required).
2. Ensure CDN/browser cache is invalidated for:
   - `js/ccg-auth-core.js`
   - `resources/js/auth/auth-core.js`
   - `resources/js/auth/supabase-client.js`
   - `/auth/*.html`
3. Validate Supabase dashboard redirect/origin settings for production + any preview domain.

## 7) Verification Evidence

### Command-level checks performed
- Syntax check of changed JS modules using Node parse mode.
- Git diff inspection for all changed auth files.
- Environment network probe command outputs retained in shell history.

### Pending live browser evidence
- Playwright browser artifact collection was attempted but failed because Chromium crashed in this environment before test execution.
