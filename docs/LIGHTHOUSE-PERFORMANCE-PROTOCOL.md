# CCG Lighthouse Performance Protocol

## Status

This is a permanent repository-wide development contract for the public Cheeky Commodore Gamer website.

It applies to new pages, shared templates, CSS, JavaScript, images, embeds, generated output, admin publishing tools and any automation that can change the public site.

The objective is to improve or preserve Lighthouse performance **without simplifying the Omega presentation or removing useful functionality**.

## Non-regression rule

Every website change must be designed so that it does not knowingly regress the site's Lighthouse/Core Web Vitals behaviour.

A change must not be justified by visual or feature value alone if it introduces avoidable layout shift, main-thread blocking, oversized assets, duplicate network work or eager third-party payloads. Equally, a higher Lighthouse score must not be obtained by stripping the site's established Omega identity, typography, modes, effects, artwork or useful functionality.

When performance and presentation appear to conflict, optimise the implementation first. Do not silently downgrade the experience.

## Target envelope

Use these as the working targets for public page families:

- Lighthouse Performance: **90+ where realistically achievable**
- LCP: **2.5 s or better**
- CLS: **0.10 or better**
- TBT: **200 ms or better**
- Accessibility / Best Practices / SEO: preserve existing high scores and do not trade them away for performance

These are programme targets, not permission to falsify or weaken measurement. Lab variance is expected, so score comparisons should use repeatable runs/medians where a release decision depends on a small difference.

## Required implementation rules

### Layout stability

- Reserve width/height or aspect ratio for images, video, embeds and other media before they load.
- Do not render a materially different temporary header/navigation/content geometry that is replaced after hydration.
- Avoid late DOM insertion above already-visible content unless space is reserved.
- Webfont changes must be assessed for visual quality and layout shift together.

### Images

- New game thumbnails uploaded through the admin pipeline use WebP.
- New or modified game thumbnails must stay within the repository thumbnail performance budget.
- Use responsive dimensions appropriate to the rendered size; do not ship multi-megabyte or needlessly oversized raster assets.
- Hero/LCP images may load eagerly with high priority when justified. Below-the-fold imagery should normally be lazy/async.
- Do not convert artwork in a way that visibly damages the source just to improve a score.

### Video and third-party content

- Do not introduce new eager YouTube or other heavy third-party embeds where a facade/click-to-load or deferred path can preserve the same user experience.
- Third-party analytics and non-critical integrations must not compete with the first meaningful render when they can safely start later.
- New external scripts should use defer/async/module semantics unless a documented first-paint dependency requires otherwise.

### JavaScript and data

- Avoid duplicate fetches for the same shared data.
- Avoid repeated forced layout/reflow in loops or high-frequency handlers.
- Prefer passive/debounced/idle work for non-critical scroll, analytics and enhancement tasks.
- Do not add large shared bundles to every page for a feature used by only one page family.

### CSS

- Do not add new render-blocking stylesheets globally when the rules are page-specific and can be safely deferred/scoped.
- Preserve the established design while reducing duplicate, unused or unnecessarily global CSS.
- Shared first-paint CSS changes require regression coverage for mobile and desktop layout behaviour.

### Caching and generated output

- Static public assets should remain cache-friendly and versioned through the existing public-code cache discipline when shared code changes.
- Generated game pages must preserve canonical SEO, media dimensions, priority hints and deferred scripts supplied by the authoritative generator.
- Generated output is repaired through its owning generator/workflow, not by hand-editing thousands of generated pages.

## New-game publishing contract

A new game published through the CCG admin/publishing chain must satisfy all of the following before publication is considered complete:

1. its thumbnail is inside `resources/images/thumbnails/all/`;
2. a newly supplied thumbnail is WebP and within the changed-thumbnail performance budget;
3. an optional 3D box is WebP and within the uploader hard limit;
4. the canonical generated game route reserves hero-image dimensions and marks the hero/LCP image with the existing eager/high-priority contract;
5. the canonical page keeps scripts deferred where owned by the shared template;
6. the page does not gain a new eager third-party video payload merely because a YouTube ID exists;
7. the authoritative rebuild and Lighthouse performance contract validators pass.

The legacy Game Builder remains a fallback UI, but it does not bypass the repository performance validators.

## Development workflow

Before changing a public website surface:

1. identify the page family and shared owner;
2. read this protocol plus the relevant `docs/ai-work/` checkpoint;
3. prefer a shared fix over many page-specific copies;
4. add or update regression coverage for the performance-sensitive behaviour;
5. run the applicable targeted checks;
6. use Lighthouse evidence for affected representative pages when the change can materially affect loading/layout/runtime work;
7. merge only after the normal repository qualification is green and the change is not known to regress the performance contract.

The full site-wide Lighthouse matrix remains the broad diagnostic sweep. The source/publishing protocol tests are the hard pre-merge guard against known classes of regression.

## Exceptions

An exception requires an explicit, documented reason in the pull request and must include a bounded mitigation plan. Convenience is not an exception. A temporary exception must not weaken unrelated repository guards.
