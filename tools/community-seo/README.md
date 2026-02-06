# Community SEO generator

This tool creates static community SEO pages from Supabase data.

## Output

Running the generator writes these files:

- `community/seo/top-rated.html`
- `community/seo/most-discussed.html`
- `community/seo/trending.html`
- `community/seo/top-members.html`

## Environment variables

Set both before running:

- `CCG_SUPABASE_URL`
- `CCG_SUPABASE_ANON_KEY`

If env vars are missing, the generator still writes all four pages with empty-state content.

## Local command

```bash
node tools/community-seo/generate-community-seo.mjs
```

## Optional GitHub Actions automation

A workflow is included at `.github/workflows/community-seo.yml`.
Add these repository secrets:

- `CCG_SUPABASE_URL`
- `CCG_SUPABASE_ANON_KEY`

The workflow runs nightly and on manual dispatch, regenerates pages, and commits updates if content changed.
