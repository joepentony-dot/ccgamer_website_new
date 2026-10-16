/* CCG C64 emulator: attach the responsive drawer to the canonical header
 * inserted by the public site build. Unlike regular public pages, the C64
 * emulator intentionally doesn't load ccg-global.js (game input isolation).
 * This bridge has no effects on the C64 machine, its keys or gamepad.
 */
(() => {
  "use strict";

  function init() {
    const header = document.querySelector("[data-ccg-header]");
    const toggle = header?.querySelector("[data-ccg-nav-toggle]");
    const drawer = header?.querySelector("[data-ccg-nav-drawer]");
    const nav = header?.querySelector(".ccg-nav");
    const primary = nav?.querySelector("[data-ccg-nav-primary]");
    const secondary = nav?.querySelector("[data-ccg-nav-secondary]");
    const drawerPrimary = drawer?.querySelector("[data-ccg-drawer-primary]");
    const drawerSecondary = drawer?.querySelector("[data-ccg-drawer-secondary]");
    if (!header || !toggle || !drawer || !nav || !primary || !secondary ||
        !drawerPrimary || !drawerSecondary || toggle.dataset.ccgC64DrawerBound) return;

    toggle.dataset.ccgC64DrawerBound = "true";
    const mobile = window.matchMedia("(max-width: 1199px)");
    const isMobile = () => mobile.matches;
    let open = false;
    if (!drawer.id) drawer.id = "ccg-c64-site-drawer";
    toggle.setAttribute("aria-controls", drawer.id);

    function createLabel(value) {
      const label = document.createElement("div");
      label.className = "ccg-nav-drawer__label";
      label.textContent = value;
      return label;
    }

    function appendLinks(section, source, title) {
      section.replaceChildren(createLabel(title));
      source.querySelectorAll("a[href]").forEach(link => {
        const clone = link.cloneNode(true);
        clone.classList.add("ccg-nav__link--mobile");
        section.appendChild(clone);
      });
    }

    function populateDrawer() {
      appendLinks(drawerPrimary, primary, "Primary");
      appendLinks(drawerSecondary, secondary, "Explore more");

      // Keep the same additional merch destination as the normal CCG drawer.
      const merch = document.createElement("a");
      merch.href = "https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp";
      merch.className = "ccg-nav__link ccg-nav__link--mobile ccg-nav__link--merch";
      merch.target = "_blank";
      merch.rel = "noopener noreferrer";
      merch.textContent = "Merch Shop";
      merch.setAttribute("aria-label", "Open the official CCG merch shop (new tab)");
      drawerSecondary.insertBefore(merch, drawerSecondary.children[1] || null);
    }

    function setOpen(next, returnFocus = false) {
      const shouldOpen = Boolean(next && isMobile());
      if (shouldOpen) populateDrawer();
      open = shouldOpen;
      header.classList.toggle("ccg-header--nav-open", open);
      nav.classList.toggle("ccg-nav--open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("ccg-body--nav-open", open);
      document.body.classList.toggle("ccg-body--locked", open);
      if (open) drawer.querySelector("[data-ccg-drawer-close]")?.focus();
      else if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", () => setOpen(!open));
    drawer.addEventListener("click", event => {
      const el = event.target instanceof Element ? event.target : null;
      if (!el) return;
      if (el.closest("[data-ccg-drawer-close]")) {
        setOpen(false, true);
      } else if (el.closest("a[href]")) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", event => {
      if (!open) return; // Never intercept C64 input while the menu is closed.
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false, true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = Array.from(drawer.querySelectorAll('a[href], button:not([disabled])'));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    mobile.addEventListener?.("change", () => {
      if (open) setOpen(false);
    });
    window.addEventListener("pageshow", () => {
      if (open) setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
