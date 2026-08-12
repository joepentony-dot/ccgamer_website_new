(function () {
  "use strict";

  const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
  const TRACK_PREFIX = "track-";
  const CARD_SELECTOR = ".ccg-composer-games__item";
  const SHARE_MARKER = "data-ccg-track-share-ready";
  let hasScrolledToTrack = false;

  function getComposerName() {
    const page = document.querySelector(".ccg-composer-page");
    const dataName = page ? String(page.getAttribute("data-composer-name") || "").trim() : "";
    if (dataName) return dataName;

    const profileTitle = document.querySelector(".ccg-composer-profile__title");
    const profileName = profileTitle ? String(profileTitle.textContent || "").trim() : "";
    if (profileName) return profileName;

    const heading = document.querySelector(".ccg-composer-title");
    const headingText = heading ? String(heading.textContent || "").trim() : "";
    return headingText.replace(/\s+[—-]\s+C64.*$/i, "").replace(/\s+[—-]\s+Commodore.*$/i, "").trim();
  }

  function getTrackSlug(card) {
    const gameLink = card.querySelector(".ccg-composer-game-link");
    if (!gameLink) return "";

    try {
      const url = new URL(gameLink.getAttribute("href") || "", window.location.href);
      const match = url.pathname.match(/\/games\/([^/]+)\/?$/i);
      return match ? decodeURIComponent(match[1]).toLowerCase() : "";
    } catch (error) {
      return "";
    }
  }

  function getTrackTitle(card) {
    const title = card.querySelector(".ccg-composer-game-title");
    return title ? String(title.textContent || "").trim() : "Retro game music";
  }

  function getTrackDetails(card) {
    const year = card.querySelector(".ccg-composer-game-tag--year");
    const system = card.querySelector(".ccg-composer-game-tag--system");
    return {
      year: year ? String(year.textContent || "").trim() : "",
      system: system ? String(system.textContent || "").trim() : ""
    };
  }

  function getComposerPageBaseUrl() {
    let current;
    try {
      current = new URL(window.location.href);
    } catch (error) {
      return `${SITE_ORIGIN}/music/`;
    }

    current.hash = "";
    current.searchParams.delete("track");

    if (/\/music\/composer\.html$/i.test(current.pathname) && current.search) {
      current.protocol = "https:";
      current.host = "www.cheekycommodoregamer.co.uk";
      return current.toString();
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    const canonicalHref = canonical ? String(canonical.getAttribute("href") || "").trim() : "";
    if (canonicalHref) {
      try {
        const canonicalUrl = new URL(canonicalHref, SITE_ORIGIN);
        if (canonicalUrl.pathname.startsWith("/music/")) {
          canonicalUrl.protocol = "https:";
          canonicalUrl.host = "www.cheekycommodoregamer.co.uk";
          canonicalUrl.hash = "";
          canonicalUrl.searchParams.delete("track");
          return canonicalUrl.toString();
        }
      } catch (error) {
        // Fall back to the current composer URL below.
      }
    }

    current.protocol = "https:";
    current.host = "www.cheekycommodoregamer.co.uk";
    return current.toString();
  }

  function buildTrackShareUrl(slug) {
    try {
      const url = new URL(getComposerPageBaseUrl());
      url.searchParams.set("track", slug);
      url.hash = `${TRACK_PREFIX}${slug}`;
      return url.toString();
    } catch (error) {
      return `${getComposerPageBaseUrl()}#${TRACK_PREFIX}${encodeURIComponent(slug)}`;
    }
  }

  function buildShareCopy(card, composerName) {
    const title = getTrackTitle(card);
    const details = getTrackDetails(card);
    const detailParts = [details.year, details.system].filter(Boolean);
    const detailText = detailParts.length ? ` (${detailParts.join(" • ")})` : "";
    const composerPhrase = composerName ? ` by ${composerName}` : "";
    const nativeText = `🎵 ${title}${detailText} — game music${composerPhrase} on Cheeky Commodore Gamer.`;
    const hashtag = /amiga/i.test(details.system) ? "#Amiga" : "#Commodore64 #C64";

    return {
      title,
      nativeText,
      emailSubject: `${title}${composerName ? ` — ${composerName}` : ""} | Cheeky Commodore Gamer`,
      emailBody: `${nativeText}\n\nListen to the track and browse the composer archive:`,
      xText: `${nativeText} ${hashtag} #RetroGaming`
    };
  }

  function createLink(label, className) {
    const link = document.createElement("a");
    link.className = `ccg-btn ccg-btn--ghost ${className}`;
    link.textContent = label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  }

  function setStatus(status, message) {
    if (!status) return;
    status.textContent = message;
    status.classList.add("is-visible");
    window.setTimeout(() => {
      status.classList.remove("is-visible");
      status.textContent = "";
    }, 1800);
  }

  function copyText(text, status) {
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.className = "ccg-track-share__copy-buffer";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (error) {
        // Ignore clipboard fallback failures.
      }
      textarea.remove();
      setStatus(status, "Link copied!");
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text)
        .then(() => setStatus(status, "Link copied!"))
        .catch(fallbackCopy);
      return;
    }

    fallbackCopy();
  }

  function addShareControls(card) {
    if (!card || card.hasAttribute(SHARE_MARKER) || !card.querySelector("audio")) return;

    const slug = getTrackSlug(card);
    if (!slug) return;

    card.setAttribute(SHARE_MARKER, "true");
    card.id = `${TRACK_PREFIX}${slug}`;

    const shell = card.querySelector(".ccg-composer-game-card-shell") || card;
    const composerName = getComposerName();
    const shareUrl = buildTrackShareUrl(slug);
    const shareCopy = buildShareCopy(card, composerName);

    const share = document.createElement("div");
    share.className = "ccg-track-share";
    share.setAttribute("data-ccg-track-share", "true");

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "ccg-btn ccg-btn--secondary ccg-track-share__button";
    shareButton.textContent = "↗ Share Track";
    shareButton.setAttribute("aria-expanded", "false");
    shareButton.setAttribute("aria-controls", `share-options-${slug}`);

    const fallback = document.createElement("div");
    fallback.className = "ccg-track-share__fallback";
    fallback.id = `share-options-${slug}`;
    fallback.hidden = true;
    fallback.setAttribute("aria-hidden", "true");

    const facebook = createLink("Facebook", "ccg-track-share__facebook");
    facebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

    const x = createLink("X", "ccg-track-share__x");
    x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCopy.xText)}&url=${encodeURIComponent(shareUrl)}`;

    const whatsapp = createLink("WhatsApp", "ccg-track-share__whatsapp");
    whatsapp.href = `https://wa.me/?text=${encodeURIComponent(`${shareCopy.nativeText}\n\n${shareUrl}`)}`;

    const email = document.createElement("a");
    email.className = "ccg-btn ccg-btn--ghost ccg-track-share__email";
    email.textContent = "Email";
    email.href = `mailto:?subject=${encodeURIComponent(shareCopy.emailSubject)}&body=${encodeURIComponent(`${shareCopy.emailBody}\n${shareUrl}`)}`;

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "ccg-btn ccg-btn--ghost ccg-track-share__copy";
    copy.textContent = "Copy Link";

    const status = document.createElement("span");
    status.className = "ccg-track-share__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    fallback.append(facebook, x, whatsapp, email, copy);

    if (navigator.share && typeof navigator.share === "function") {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "ccg-btn ccg-btn--ghost ccg-track-share__native";
      more.textContent = "More Apps";
      more.addEventListener("click", () => {
        navigator.share({
          title: shareCopy.emailSubject,
          text: shareCopy.nativeText,
          url: shareUrl
        }).catch(() => {
          // Share cancellation is not an error the page needs to surface.
        });
      });
      fallback.appendChild(more);
    }

    fallback.appendChild(status);

    shareButton.addEventListener("click", () => {
      const open = fallback.hidden;
      fallback.hidden = !open;
      fallback.setAttribute("aria-hidden", open ? "false" : "true");
      shareButton.setAttribute("aria-expanded", open ? "true" : "false");
      share.classList.toggle("is-open", open);
    });

    copy.addEventListener("click", () => copyText(shareUrl, status));

    share.append(shareButton, fallback);
    shell.appendChild(share);
  }

  function getRequestedTrackId() {
    const rawHash = String(window.location.hash || "").replace(/^#/, "");
    if (rawHash.startsWith(TRACK_PREFIX)) {
      try {
        return decodeURIComponent(rawHash);
      } catch (error) {
        return rawHash;
      }
    }

    try {
      const trackParam = new URLSearchParams(window.location.search || "").get("track");
      if (trackParam) {
        return `${TRACK_PREFIX}${decodeURIComponent(trackParam)}`;
      }
    } catch (error) {
      // Ignore malformed query strings and fall through.
    }

    return "";
  }

  function scrollToRequestedTrack() {
    if (hasScrolledToTrack) return;
    const targetId = getRequestedTrackId();
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    hasScrolledToTrack = true;
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ccg-track-share-target");
      window.setTimeout(() => target.classList.remove("ccg-track-share-target"), 2600);
    });
  }

  function processTrackCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(addShareControls);
    scrollToRequestedTrack();
  }

  function init() {
    const gamesList = document.getElementById("composer-games");
    if (!gamesList) return;

    processTrackCards();

    const observer = new MutationObserver(() => processTrackCards());
    observer.observe(gamesList, { childList: true, subtree: true });

    window.addEventListener("hashchange", () => {
      hasScrolledToTrack = false;
      scrollToRequestedTrack();
    });

    window.addEventListener("popstate", () => {
      hasScrolledToTrack = false;
      scrollToRequestedTrack();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
