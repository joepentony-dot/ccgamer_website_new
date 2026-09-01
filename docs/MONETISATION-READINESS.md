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
- A new Amazon.co.uk Associates application is active provisionally and is awaiting the programme's post-sale review after the required qualifying orders.

## Amazon.co.uk Associates reactivation

The previous Amazon.co.uk Associates account used by the site was closed on 1 September 2026 after failing to reach the programme's initial qualifying-sales requirement. A new application was created on the same date and the retailer programme has therefore been reintroduced as a separate, auditable implementation rather than restoring the old link set.

### Tracking-ID controls

- active tracking ID: `cheekycomm00d-21`;
- retired tracking ID: `cheekycommo0d-21`;
- the retired ID must never be used by new product links;
- the new product renderer validates every configured Amazon URL against the active ID before displaying it; and
- direct Amazon.co.uk product URLs are used instead of shortened `amzn.to` links so the ASIN and tracking ID remain auditable.

### Product catalogue and placement

The active catalogue is centralised in `resources/data/affiliate-products.json`. It contains a deliberately small set of C64, Amiga, controller, emulation, book and wider-retro recommendations supplied for the new account.

Game-page placement is contextual rather than generic:

- C64 pages receive up to three C64-focused recommendations;
- Amiga pages receive up to three Amiga-focused recommendations;
- selected joystick-heavy games can receive a dedicated joystick group;
- no game page should display more than three affiliate cards from the central renderer; and
- the old expandable "Computer Peripherals" presentation is superseded by an always-visible, focused `CCG Picks` presentation once valid game-system data is available.

The renderer deliberately does not mass-edit generated game HTML. Existing hidden product-section markup is reused as a mounting point, which reduces regression risk across the generated archive.

### THEA1200 home spotlight

THEA1200 is the main home-page commercial spotlight from 1 September through 31 December 2026. The product is listed as releasing on 4 December 2026. Before the release date the call to action is presented as a pre-order; after that date it becomes a standard Amazon product link.

The spotlight explains that using the CCG Amazon link helps support the channel at no extra cost to the visitor. The renderer automatically stops displaying the spotlight after 31 December 2026, avoiding a stale permanent campaign.

### Disclosure and link attributes

Every rendered Amazon recommendation includes the required statement:

> As an Amazon Associate I earn from qualifying purchases.

Affiliate calls to action use `nofollow sponsored noopener`, open Amazon in a new tab and link to the site's dedicated `/affiliate-disclosure.html` page for further information. The disclosure page also explains editorial independence and avoids presenting Amazon prices as live or guaranteed.

### Legacy link safeguards

The existing shared runtime guard continues to remove old hardcoded Amazon Associates links from legacy static markup, including the retired tracking ID and old shortened links. New recommendations are rendered after that legacy cleanup pass and are independently validated against the new active ID.

This means old emulation-page retailer buttons are not silently reactivated. They remain blocked unless they are deliberately migrated to the new catalogue in a later reviewed change.

## Deliberately not activated

### Google AdSense

AdSense cannot be activated safely without the approved account's publisher ID and Google's site approval. Do not add a guessed publisher ID.

After approval:

1. Add the exact `ca-pub-...` identifier supplied by Google.
2. Add the exact authorised seller record to `/ads.txt`.
3. Load advertising scripts only after `advertising` consent is granted.
4. Restrict ad placements to substantial editorial pages.
5. Keep ads away from download controls, navigation, quizzes, authentication, account pages and admin pages.

### Payment and tax accounts

Patreon and PayPal links are connected to the public CCG destinations already used by the site. Amazon, Patreon and PayPal account ownership, tax records, payment verification and payout settings remain external account responsibilities and should not be stored in the public repository.

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
- Patreon, PayPal, Amazon Associates, sponsorship or other commercial arrangements;
- user accounts or community submissions;
- download licensing position;
- business identity or contact details; or
- applicable UK privacy, consumer or advertising rules.

These pages do not replace advice from a qualified legal or tax professional.

## Amazon reactivation validation sequence

1. Confirm every configured product URL uses `tag=cheekycomm00d-21` and none uses the retired `cheekycommo0d-21` ID.
2. Confirm configured product paths contain the expected ASINs.
3. Confirm C64 game pages display no more than three C64-focused recommendations.
4. Confirm Amiga game pages display no more than three Amiga-focused recommendations, with THEA1200 prominent in the group.
5. Confirm joystick-heavy overrides display the joystick-focused group.
6. Confirm the old accordion toggle is not required to see recommendations.
7. Confirm the Amazon disclosure statement and disclosure-page link appear with every rendered recommendation unit.
8. Confirm THEA1200 appears prominently below the home hero during the configured campaign window and automatically disappears after 31 December 2026.
9. Confirm THEA1200's call to action changes from pre-order wording after the 4 December 2026 release date.
10. Confirm legacy emulation-page affiliate buttons remain blocked rather than inheriting the new programme automatically.
11. Test the recommendation layouts at desktop, tablet and mobile widths.
12. Verify affiliate-click analytics only fires when analytics consent has been granted.
13. Verify Google Analytics remains absent from network requests before analytics consent.
