# Community SEO

This directory no longer contains a standalone community SEO generator.

The previous workflow expected a script at:

```bash
tools/community-seo/generate-community-seo.mjs
```

That file is not part of the current repository, and the related generated
`community/seo/*.html` output directory is also absent.

## Current state

Community pages are served from the checked-in `community/*.html` files and the
existing front-end modules under `resources/js/community/`.

If a static community SEO generator is needed again in the future, restore the
generator script and any corresponding output targets before reintroducing an
automation workflow.
