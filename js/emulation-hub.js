(function () {
  "use strict";

  const REFERRAL_LINE = "Cheeky Commodore Gamer sent me!";

  const recommendations = Object.freeze({
    vice: {
      icon: "🕹️",
      title: "VICE — the best all-round C64 starting point",
      text: "Start with VICE if you want a mature, flexible C64 emulator on a modern computer. The written guide below covers the essentials, and Jamie’s walkthrough takes you through the setup visually.",
      guide: "#c64-options",
      video: "https://www.youtube.com/watch?v=jROUvc5eyF8"
    },
    ccs64: {
      icon: "💾",
      title: "CCS64 — a compact C64 alternative",
      text: "Choose CCS64 if you want a smaller, straightforward C64 emulator and prefer a simpler route into loading games and configuring controls.",
      guide: "#c64-options",
      video: "https://www.youtube.com/watch?v=pbTsA7whRig"
    },
    fsuae: {
      icon: "🖥️",
      title: "FS-UAE — the friendlier Amiga launcher route",
      text: "FS-UAE is the easiest recommendation here for people who want an approachable launcher-style Amiga setup without diving into every low-level option first.",
      guide: "#amiga-options",
      video: "https://www.youtube.com/watch?v=SvcnVgpYuFA"
    },
    winuae: {
      icon: "🪟",
      title: "WinUAE — maximum Amiga control on Windows",
      text: "Pick WinUAE if you want the deepest configuration options, model-specific setups, hard-drive images, WHDLoad workflows and fine control over an Amiga environment.",
      guide: "#amiga-options",
      video: "https://www.youtube.com/watch?v=ZNvkngqtNpQ"
    },
    amiberry: {
      icon: "🍓",
      title: "Amiberry — a strong Amiga choice for Raspberry Pi and ARM",
      text: "Amiberry is the route to investigate for Raspberry Pi and other ARM-based hardware where a compact, controller-friendly Amiga setup is the goal.",
      guide: "#amiga-options",
      video: "https://www.youtube.com/watch?v=HYK4gCWkJds"
    }
  });

  function renderRecommendation(key) {
    const item = recommendations[key];
    const result = document.getElementById("emu-smart-result");
    if (!item || !result) return;

    result.querySelector("[data-emu-result-icon]").textContent = item.icon;
    result.querySelector("[data-emu-result-title]").textContent = item.title;
    result.querySelector("[data-emu-result-text]").textContent = item.text;

    const guide = result.querySelector("[data-emu-result-guide]");
    const video = result.querySelector("[data-emu-result-video]");
    const actions = result.querySelector("[data-emu-result-actions]");

    guide.href = item.guide;
    video.href = item.video;
    actions.hidden = false;

    document.querySelectorAll("[data-emu-recommend]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-emu-recommend") === key ? "true" : "false");
    });
  }

  async function copyReferral(button) {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(REFERRAL_LINE);
        copied = true;
      }
    } catch (_error) {}

    if (!copied) {
      const helper = document.createElement("textarea");
      helper.value = REFERRAL_LINE;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      try {
        copied = document.execCommand("copy");
      } catch (_error) {
        copied = false;
      }
      helper.remove();
    }

    const original = button.getAttribute("data-copy-label") || button.textContent;
    button.setAttribute("data-copy-label", original);
    button.textContent = copied ? "Copied ✓" : REFERRAL_LINE;
    window.setTimeout(function () {
      button.textContent = original;
    }, 2200);
  }

  function initSmartNav() {
    if (!("IntersectionObserver" in window)) return;

    const links = Array.from(document.querySelectorAll(".emu-smart-nav a[href^='#']"));
    const sectionMap = new Map();

    links.forEach(function (link) {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) sectionMap.set(target, link);
    });

    const observer = new IntersectionObserver(function (entries) {
      const visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; })[0];

      if (!visible) return;
      links.forEach(function (link) { link.removeAttribute("aria-current"); });
      const active = sectionMap.get(visible.target);
      if (active) active.setAttribute("aria-current", "location");
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.01, 0.2, 0.5] });

    sectionMap.forEach(function (_link, section) { observer.observe(section); });
  }

  function init() {
    document.querySelectorAll("[data-emu-recommend]").forEach(function (button) {
      button.addEventListener("click", function () {
        renderRecommendation(button.getAttribute("data-emu-recommend"));
      });
    });

    document.querySelectorAll("[data-copy-referral]").forEach(function (button) {
      button.addEventListener("click", function () {
        copyReferral(button);
      });
    });

    initSmartNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();