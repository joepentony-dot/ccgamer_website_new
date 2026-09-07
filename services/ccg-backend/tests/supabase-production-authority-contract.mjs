import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('../../../', import.meta.url);
const authority = await readFile(new URL('services/ccg-backend/SUPABASE-PRODUCTION-AUTHORITY.md', repoRoot), 'utf8');
const loader = await readFile(new URL('js/ccg-auth-supabase-loader.js', repoRoot), 'utf8');

assert.match(authority, /Supabase remains the production account and profile authority\./);
assert.match(authority, /Render CCG backend and PostgreSQL database are non-production migration\/staging experiments only\./);
assert.match(authority, /No production browser page may select the experimental CCG\/Render auth provider\./);
assert.match(authority, /core game playability must not depend on Supabase being reachable at run time\./);
assert.match(loader, /window\.__ccgAuthProviderLocked = 'supabase'/);
assert.match(loader, /Object\.defineProperty\(window, 'ccgAuthRuntimeConfig'/);
assert.doesNotMatch(loader, /ccgAuthProvider/);
assert.doesNotMatch(loader, /ccgAuthBaseUrl/);

console.log('Supabase production authority contract passed: browser auth is locked to Supabase while core Lost Sizzler play remains backend-independent.');
