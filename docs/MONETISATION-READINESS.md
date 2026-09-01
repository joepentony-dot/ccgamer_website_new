# CCG Monetisation Readiness

Last reviewed: 1 September 2026

## Current monetisation state

- Consent-first Google Analytics loading remains active.
- Equal-access Accept, Reject and Manage choices controls remain active.
- Persistent privacy controls remain available in public-page footers.
- Site-wide links to Privacy, Cookies, Terms, Copyright, Support CCG and Work with CCG remain active.
- Privacy-enhanced YouTube embed host conversion remains active where standard embedded URLs are detected.
- Patreon, PayPal and YouTube support routes remain available.
- Sponsorship and collaboration enquiries remain available through Work with CCG.
- Rights-holder review and takedown processes remain available.

## Retailer commission links retired

The Amazon.co.uk Associates account previously used by the site was closed on 1 September 2026. The website must therefore remain in a fail-closed state for that programme unless a future, valid retailer programme is deliberately approved and implemented in a separate change.

Current safeguards:

- the expandable game-page hardware/product panel renderer is disabled;
- its product data source is disabled and contains no live retailer URLs;
- the site-wide analytics/bootstrap layer no longer detects or labels Amazon links and no longer inserts retailer commission disclosures;
- the old disclosure footer link has been removed;
- legacy retailer commission links are defensively removed by the shared runtime guard where older static markup still contains them;
- the old disclosure page is retired, `noindex,nofollow`, and removed from the commerce sitemap; and
- Terms, Privacy, Cookies and Work with CCG no longer describe an active retailer commission-link programme.

Do not restore old tracking IDs, shortened retailer URLs, paid-link labels, product buttons or retailer commission disclosures without confirming that a new programme is active and that its current terms have been reviewed.

## Deliberately not activated

### Google AdSense

AdSense cannot be activated safely without the approved account's publisher ID and Google's site approval. Do not add a guessed publisher ID.

After approval:

1. Add the exact `ca-pub-...` identifier supplied by Google.
2. Add the exact authorised seller record to `/ads.txt`.
3. Load advertising scripts only after `advertising` consent is granted.
4. Restrict ad placements to substantial editorial pages.
5. Keep ads away from download controls, navigation, quizzes, authentication, account pages and admin pages.

### Retailer commission programmes

No retailer commission-link programme is currently enabled. Any future programme should be introduced as a separate, auditable change with verified account details, current disclosure wording, appropriate link attributes and a deliberate rollout plan. Never reuse the retired Amazon Associates tracking ID.

### Payment and tax accounts

Patreon and PayPal links are connected to the public CCG destinations already used by the site. Account ownership, tax records, payment verification and payout settings remain external account responsibilities.

## Required rights review before display advertising

The `/games/downloads/` area and every downloadable file should be classified with evidence under one of these headings:

- public domain;
- freeware;
- released by the creator or rights holder;
- distributed with written permission;
- covered by a licence that allows redistribution; or
- link-only access to an authorised third-party source.

Where evidence is unavailable, remove or restrict the file before applying to an advertising network. Keeping ads off an individual download page does not necessarily prevent a network from reviewing the wider domain.

## Policy review

The policy pages are practical website drafts based on the site's current features. They should be reviewed whenever any of the following changes:

- hosting, database, authentication or email provider;
- analytics or advertising provider;
- Patreon, PayPal, sponsorship or other commercial arrangements;
- user accounts or community submissions;
- download licensing position;
- business identity or contact details; or
- applicable UK privacy, consumer or advertising rules.

These pages do not replace advice from a qualified legal or tax professional.

## Recommended launch sequence

1. Merge and deploy the retailer-programme retirement change.
2. Test public pages in a fresh browser profile on desktop and mobile.
3. Confirm game pages do not display the expandable hardware/product panel.
4. Confirm the emulation page contains no clickable legacy retailer commission buttons or visible disclosure note after page initialisation.
5. Confirm public footers contain no retailer commission disclosure link.
6. Verify Google Analytics remains absent from network requests before analytics consent.
7. Complete and retain the download-rights register.
8. Apply for AdSense only after the rights review and content-quality review.
9. Add any approved advertising publisher ID and `ads.txt` record in a separate, auditable pull request.
