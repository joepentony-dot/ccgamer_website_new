# Navigation Standard (Home Flagship)

## Canonical source
The Home page (`home.html`) is the single source of truth for the navigation system. All pages must match its HTML structure, class names, spacing, and behavior, with only link paths adjusted for directory depth.

## Required structure
Use this exact structure (same elements, same nesting order):

- `header.ccg-header[data-ccg-header]`
  - `.ccg-header-inner`
    - `.ccg-brand` (logo + brand text)
    - `.ccg-nav-toggle` (mobile menu toggle)
    - `nav.ccg-nav#ccg-primary-nav`
      - `.ccg-nav__bar`
        - `.ccg-nav__list--primary` (Home, Browse Games, Browse by Genre, Collections)
        - `.ccg-nav__more` (More dropdown + menu container)
      - `.ccg-nav__list--secondary` (Quiz, Emulation, About, Contact)
    - `.ccg-header-actions`
      - `.ccg-mode-toggle`
      - `.ccg-header-socials`
  - `.ccg-nav-drawer` (mobile drawer container)
  - `.ccg-header-neon-strip`

## Required assets
Ensure the following assets are present on every page using the navigation:

- `resources/css/ccg-master.css`
- `resources/css/ccg-mode.css`
- `resources/css/ccg-effects.css`
- `resources/css/ccg-anim.css`
- `resources/css/ccg-socials.css`
- `resources/css/ccg-overlays.css`
- `resources/css/ccg-mobile-lite.css`
- `js/ccg-mobile-lite.js`
- `resources/js/ccg-nav-scroll-indicator.js`

## Non-negotiables
- Do **not** redesign or fork the navigation.
- Do **not** remove links or re-order items.
- Do **not** change classes, wrappers, or markup.
- Do **not** add page-specific tweaks or inline styles.

## Path rules
Adjust only the `href` paths to account for directory depth (e.g., `../home.html` from subfolders). All other markup must be identical to `home.html`.
