# CCG Monetisation Readiness

Last reviewed: 6 August 2026

## Implemented in this upgrade

- Consent-first Google Analytics loading.
- Equal-access Accept, Reject and Manage choices controls.
- Persistent privacy controls in public-page footers.
- Site-wide links to Privacy, Cookies, Terms, Copyright, Affiliate Disclosure, Support CCG and Work with CCG pages.
- Automatic Amazon affiliate-link detection.
- Automatic `sponsored`, `nofollow` and `noopener` link attributes for detected Amazon links.
- Visible `Paid link` labels and a page-level Amazon Associates disclosure.
- Privacy-enhanced YouTube embed host conversion where standard embedded URLs are detected.
- Dedicated Patreon, PayPal and YouTube support landing page.
- Dedicated sponsorship and collaboration enquiry page.
- Rights-holder review and takedown process.

## Deliberately not activated

### Google AdSense

AdSense cannot be activated safely without the approved account's publisher ID and Google's site approval. Do not add a guessed publisher ID.

After approval:

1. Add the exact `ca-pub-...` identifier supplied by Google.
2. Add the exact authorised seller record to `/ads.txt`.
3. Load advertising scripts only after `advertising` consent is granted.
4. Restrict ad placements to substantial editorial pages.
5. Keep ads away from download controls, navigation, quizzes, authentication, account pages and admin pages.

### Affiliate tracking IDs

The global bootstrap labels Amazon links already present on the site. It does not create or alter affiliate tracking IDs. Existing tracking parameters must be verified inside the retailer account.

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
- Patreon, PayPal, affiliate or sponsorship arrangements;
- user accounts or community submissions;
- download licensing position;
- business identity or contact details; or
- applicable UK privacy, consumer or advertising rules.

These pages do not replace advice from a qualified legal or tax professional.

## Recommended launch sequence

1. Merge and deploy this consent and disclosure upgrade.
2. Test consent choices in a fresh browser profile on desktop and mobile.
3. Verify Google Analytics remains absent from network requests before analytics consent.
4. Verify every Amazon link receives a visible disclosure and sponsored attributes.
5. Complete and retain the download-rights register.
6. Apply for AdSense only after the rights review and content-quality review.
7. Add the approved publisher ID and `ads.txt` record in a separate, auditable pull request.
