# Amazon Affiliate Link Audit Report

## Scope and method
- Scanned repository for affiliate and Amazon CTA patterns including: `your-affiliate-link`, `YOUR-AFFILIATE-LINK`, `YOURAFFILIATETAG`, `View on Amazon`, `BUY ON AMAZON`, `RELATED GEAR`, empty hrefs, and Amazon domains.
- Reviewed central affiliate rendering logic and product data source.

## Findings (pre-fix)

| File path | Page/component type | Affiliate button text | Current href | href status | Disclosure nearby | Link system |
|---|---|---|---|---|---|---|
| `resources/data/affiliate-products.json` | Central affiliate data for game-page CTA cards | `View on Amazon` (default group) | `https://YOUR-AFFILIATE-LINK` | **Placeholder / malformed destination** | Yes, via template/JS disclosure field (`defaults.disclosure`) | Centralised JSON consumed by `js/affiliate-products.js` |
| `resources/data/affiliate-products.json` | Central affiliate data for game-page CTA cards | `View on Amazon` (waggle-stick group) | `https://www.amazon.co.uk/Retro-Games-THEC64-mini-Edition/dp/B0FKLZ8YNY?tag=YOURAFFILIATETAG-21` | **Placeholder affiliate tag** | Yes, via template/JS disclosure field (`defaults.disclosure`) | Centralised JSON consumed by `js/affiliate-products.js` |
| `emulation.html` | Emulation page hardcoded product CTA buttons | `View THEC64 Mini Black Edition on Amazon` | Amazon URL with real `tag=cheekycommo0d-21` | Valid | Yes (`Affiliate disclosure...` paragraph directly beneath cards) | Hardcoded page-level links |
| `emulation.html` | Emulation page hardcoded product CTA buttons | `View THEC64 Mini on Amazon` | Amazon URL with real `tag=cheekycommo0d-21` | Valid | Yes | Hardcoded page-level links |
| `emulation.html` | Emulation page hardcoded product CTA buttons | `View THEC64 on Amazon` | Amazon URL with real `tag=cheekycommo0d-21` | Valid | Yes | Hardcoded page-level links |

## Root cause
- Broken affiliate destinations came from placeholder values in the **central affiliate product JSON** (`resources/data/affiliate-products.json`), which feeds game-page affiliate CTA cards through `js/affiliate-products.js`.
- Two systems coexist:
  1. Centralised JSON-driven affiliate CTA cards on game pages.
  2. Hardcoded Amazon links on `emulation.html`.
- The hardcoded emulation links already contain working Amazon affiliate URLs and were suitable as known-safe source URLs.

## Risk notes
- No empty href affiliate CTAs were found in intended Amazon CTA areas.
- The JS renderer already fails safe by dropping cards where title/url is missing and hiding the section if no valid cards exist.

