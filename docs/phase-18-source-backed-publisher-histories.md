# Phase 18 — Source-Backed Publisher Histories

## Purpose

Improve major publisher archive pages with concise historical context that visitors can verify themselves. This phase avoids automated filler: a publisher receives the **Source-backed publisher profile** label only when its claims have been checked against first-party, government, museum or established digital-heritage material.

Eight major archive routes receive this treatment:

- Ocean Software
- Mastertronic
- Firebird
- Codemasters
- Activision
- Electronic Arts
- Elite Systems
- MicroProse Software

Other existing summaries remain available as **Curated CCG context** and are not presented as source-backed history until equivalent evidence is available.

## Evidence policy

A source-backed profile must contain:

1. At least two short factual statements.
2. One or more visitor-visible evidence links.
3. A source type, such as government record, official company, museum or digital heritage archive.
4. A `high` confidence flag.
5. An ISO review date.
6. Conservative wording that does not go beyond the linked evidence.

The Phase 18 audit restricts evidence links to a reviewed host list. A new domain cannot be added silently: the audit must be updated alongside the data, forcing a deliberate review.

## Source hierarchy

Preferred evidence, in order:

1. Government and corporate registry records.
2. First-party company or successor-studio histories.
3. Museum and university-backed computing archives.
4. First-person historical archives with documented company provenance.
5. Established specialist archives used only to support limited supplementary context.

General fan wikis, anonymous summaries, scraped biographies and search-result snippets are not accepted as sole evidence.

## Separation of facts and CCG archive observations

Each enhanced profile distinguishes between:

- **Documented company facts** — statements supported by the linked sources.
- **Archive strengths** — a concise description of the games represented in the CCG database.
- **Related labels and archives** — existing CCG navigation routes.

This prevents a catalogue observation such as “strong C64 sports selection” from being presented as a formal statement about the publisher's entire commercial history.

## Visitor presentation

Source-backed pages show:

- the source-backed label;
- the evidence review date;
- documented facts;
- archive strengths;
- related CCG routes;
- labelled evidence links opening in a separate tab;
- a note explaining any archive or territorial limitation.

External source links use `noopener`, `noreferrer` and `external` relationship values.

## Initial source ledger

| Publisher | Evidence used |
|---|---|
| Ocean Software | Centre for Computing History company profile |
| Mastertronic | Anthony Guter history preserved by the Mastertronic Collectors Archive; archive provenance page |
| Firebird | Play It Again digital heritage archive |
| Codemasters | Official Codemasters/EA studio history; Codemasters Archive history |
| Activision | Activision investor-relations company archive |
| Electronic Arts | EA company information and EA anniversary history |
| Elite Systems | Companies House record and Elite's official corporate profile |
| MicroProse | Firaxis official studio history |

## Accuracy boundary

No historical summary can honestly be guaranteed infallible. Phase 18 instead provides a stronger standard: limited claims, reputable evidence, visible citations, a review date and an automated schema check that prevents incomplete sourced profiles from being merged.

Where accounts conflict or evidence is weak, the disputed detail is omitted.

## No manual page editing

Publisher pages continue loading their profile from `data/publisher-histories.json`. Updating one reviewed data record automatically updates the corresponding publisher route; no generated publisher HTML must be edited individually.

## Safety

This phase does not modify:

- `games/games.json`;
- publisher assignments on individual games;
- generated publisher routes;
- `index.html`;
- `home.html`;
- the intro-loader CSS or JavaScript.
