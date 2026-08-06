# Member Hub Phase 16 — Commodore Completionist

## Purpose

Add a final reward for members who complete all twelve original Commodore Milestones.

## Reward

The final distinction is:

**Commodore Completionist**

> Complete every Commodore Milestone.

The completion date is derived from the most recently earned milestone, which represents the point at which the full set became complete.

## Required milestones

The reward requires all twelve Phase 8 activity badges:

1. First Score
2. Score Keeper
3. Archive Critic
4. First Word
5. Community Voice
6. Collection Started
7. Shelf Builder
8. Game Room
9. Archive Keeper
10. C64 Explorer
11. Amiga Explorer
12. Commodore All-Rounder

The reward is not affected by any later badge categories that may be added in future.

## Member Hub presentation

- A separate final-reward card appears after the normal milestone cards.
- While locked, it reports how many milestones remain.
- Once complete, it displays a star, completion date and unlocked message.
- The milestone summary confirms that Commodore Completionist has been unlocked.
- Members can share the achievement through the browser share sheet where supported.
- Clipboard copying is used as the fallback.

## Public-profile presentation

When the member has enabled badge visibility and all twelve milestone badges are present in the privacy-filtered profile payload:

- Commodore Completionist is derived automatically;
- it appears first in the public badge grid;
- it receives a more prominent full-width presentation;
- the completion date is shown where available.

No private activity totals or incomplete badge progress are exposed publicly.

## No database migration

The reward is derived from the twelve badges already returned by the Phase 8 functions. No database migration, new table, policy or manual Supabase action is required.

This also means existing eligible members receive the reward as soon as the updated interface loads.

## Safety

The implementation does not modify:

- the Phase 8 badge catalogue;
- existing badge records;
- public-profile privacy settings;
- `games/games.json`;
- `index.html`;
- `home.html`;
- the intro-loader CSS or JavaScript.

Reduced-motion preferences disable the decorative reward sheen.
