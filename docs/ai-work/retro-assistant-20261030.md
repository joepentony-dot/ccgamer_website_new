# CCG Retro Assistant — 30 October 2026 — PARKED / DRAFT, NO PUBLIC AI SERVICE

## Scope / release boundary
User-requested branded C64/Amiga retro game assistant. This work is isolated from the sole active Dungeon R153 implementation PR #2958. No intro files, game JSON, emulator, global navigation or generated game pages may change. Do not merge this draft, deploy the Edge Function, modify the live database or turn on paid AI while R153 remains the active website workstream. Preserve CCG MASTER CONTROL ownership and request fresh owner release approval after qualification.

## Included
- Homepage-only fixed launcher loaded by a single deferred script. Panel is opt-in, keyboard-accessible, and inherits existing C64/Amiga mode palette without overriding locked Omega CSS.
- Local archive-backed responses using lazy `/games/games.json` fetch; game links derive from validated original slugs, never from model output or guessed slugs. The local fallback is functional without a paid API, even if AI is disabled.
- Optional Supabase Edge Function that is **off by default**, validates permitted Origin and Cloudflare Turnstile before an AI call, enforces atomic daily global and best-effort per-client quotas through service-role-only SQL, fetches the current CCG catalogue for response context, and sends capped stateless OpenAI Responses requests (`store:false`). Service secrets never appear in browser files. No AI output is HTML-interpreted.
- No background tracking, local storage, newsletter signup, autoplay, analytics, extra embeds, new image assets, eager catalogue download, or page reflow caused by the fixed launcher.

## Checks run prior to staging
- `node --check js/ccg-retro-assistant.js`
- `node tests/ccg-retro-assistant.test.cjs` (archive matching, canonical slug and platform invariants)
- Browser smoke of open/close, catalogue lazy load, suggestions, Esc, theme and mobile required before merge.
- Full repository CI and production deployment **not** completed by offline package tests.

## Required before public AI enablement
1. Review & apply SQL with DB backup, security advisors, permissions inspection and migration history; deploy Edge Function with JWT=false **only after** reviewing schema, CORS and security.
2. Set Supabase Edge secrets: `OPENAI_API_KEY`, `CCG_TURNSTILE_SECRET`, long random `CCG_ASSISTANT_SALT`, `CCG_ASSISTANT_ENABLED=1`, optional `CCG_ASSISTANT_MODEL`; never commit these values. Verify actual account API budget separately from ChatGPT subscription.
3. Configure a Cloudflare Turnstile widget with allowed CCG hostnames; set its **public** site key in the homepage script `data-turnstile-sitekey`, set `data-endpoint` to the exact deployed Edge Function URL, and only then `data-ai-enabled=true`.
4. Update site's privacy information and consent disclosure to cover server-side processing of questions via AI provider, CAPTCHA/Turnstile, and short-lived pseudonymous abuse counters; review UK GDPR/data retention and provider terms.
5. Test live signed-out visitor flow, captcha expiry, abuse/global caps, OpenAI failures and backend disabled mode across desktop/mobile; run Site Safety / Lighthouse / generated publishing and independent code review at exact PR head.
6. Fresh-main, no unresolved review, owner authorisation, guarded squash merge, Pages CI and independent browser/live verification. Do not use remote green checks from older heads.

## Known limitations
- Homepage-only entry point in v1; broader sitewide / generated game-page rollout requires a follow-up after performance and usage observation.
- The local matcher uses only catalogue fields and may not understand indirect clues or deliver magazine review analysis; it labels these responses as archive search, not AI.
- Per-client IP quotas are best effort due to proxy headers; the global daily quota and Turnstile validation are the primary spend controls. Actual API organisation budget must be separately capped.
- No paid AI connectivity until an actual API key and Turnstile site key are configured and verified.

## 30 October — Homepage CLS guard remediation

GitHub PR exact-head CI `CCG Game Page Release Safeguards` failed its intentionally strict `tests/sitewide-cls-repair.test.mjs` homepage integrity check when the pilot added a script to `home.html`. That check must not be weakened. The follow-up candidate restores `home.html` byte-for-byte to base main and attaches the opt-in feature after DOM readiness from the existing homepage-only `js/ccg-archive-pulse-randomizer.js`, which is already loaded by the real homepage. AI remains disabled. Re-run exact-head CI on the new commit; earlier checks are stale. Do not merge until guard passes and the normal performance, review, and one-active-workstream rules are met.

## 30 October — Public code cache guard

Exact-head CI additionally caught stale public JS code-cache namespace v205. As required by the permanent cache protocol, this isolated candidate advances `service-worker.js` `CODE_CACHE_VERSION` from v205 to v206 without changing the SW behaviour or cache policy. All previous-head CI receipts are obsolete. Fresh exact-head source, browser and Lighthouse qualification plus independent review are still required.

## 30 October — free-only archive assistant expansion (BRANCH ONLY)

After formal parking of the separate high-risk Dungeon R153 PR #2958 (all six workflows passed, no submitted independent high-risk review or owner Windows acceptance), #2959 is the single ACTIVE website implementation. This branch adds bounded genre aliases, platform/year/multiplayer follow-up filters, five-at-a-time archive pagination, source-grounded answers for publisher, year, credited musician and CCG rating, and two checked hardware facts (SID three voices; Paula four sampled channels). It explicitly refuses to invent magazine percentages, returns only canonical slug-validated game links, and never requests the catalogue before interaction except when needed. Regression tests now exercise actual unchanged `games/games.json`, follow-up reset, pagination, facts, magazine restraint, and empty-rating refusal. Source JS was locally parsed/executed in the authorised cloud V8 sandbox; GitHub exact-head CI and fresh desktop/mobile acceptance are **PENDING**, not inherited from the earlier 15/15 successful `c9afeaa` head.

Paid AI remains **OFF** in the launcher; optional Supabase/OpenAI source is inert and no schema/function/secrets/paid provider have been deployed or enabled. No protected Home HTML, Omega intro, catalogue, emulator or game-page generation changed. Amazon Retro Shop #2957 remains PARKED pending owner confirmation of Idea List labels and UK earning attribution for `joepentony-20`; no Amazon release occurred. After exact-head CI and release checks, owner authorises a guarded ordinary-website free-only v1 merge under the review waiver where native rules allow, followed by independent Pages/live desktop/mobile verification. Do not mark LIVE before that evidence.

## 30 October 2026 — edition-specific factual integrity correction (BRANCH ONLY)

A real-source V8 negative control on the preceding candidate returned C64 publisher/year when asked specifically for an Amiga edition of an identically titled game. Source commit a0358cd05c9da21dd2b9e181f33df0caec88b44a restricts catalogue factual lookup to the named C64/Amiga platform; conflicting C64+Amiga and unsupported Spectrum/Atari ST fact queries decline rather than borrowing another platform's attribution. Test commit e4b78699abd428309bb31ade67fa39e541833d01 adds eight regression assertions across publisher, musician, year, absent edition and unsupported platform. Five source-executed candidate cases passed before writing; this is not the full Node/Chromium matrix.

The previous head's 15/16 Actions are stale: Full Dungeon 41108563873 reported failure with inconsistent running/queued jobs, and a single targeted rerun was denied by GitHub (403). This material source correction is not an empty CI-retrigger commit; new exact-head Actions must finish before any guarded merge. Free-only launcher and paid AI OFF state unchanged; no production deployment. Amazon #2957 and high-risk Dungeon #2958 remain separately parked; Windows commercial HOLD and owner acceptance unchanged.
